/**
 * エラー型定義
 *
 * Gateway/API呼び出しで発生するエラーを細分化
 */

// ============================================
// エラー種別定数
// ============================================

export const ERROR_TYPES = {
  NETWORK: "NetworkError",
  AUTHENTICATION: "AuthenticationError",
  AUTHORIZATION: "AuthorizationError",
  VALIDATION: "ValidationError",
  NOT_FOUND: "NotFoundError",
  SERVER: "ServerError",
  TIMEOUT: "TimeoutError",
  UNKNOWN: "UnknownError",
} as const;

export type ErrorType = typeof ERROR_TYPES[keyof typeof ERROR_TYPES];

// ============================================
// 基底エラークラス
// ============================================

export class AppError extends Error {
  readonly type: ErrorType;
  readonly statusCode?: number;
  readonly originalError?: unknown;

  constructor(
    type: ErrorType,
    message: string,
    options?: { statusCode?: number; originalError?: unknown }
  ) {
    super(message);
    this.name = type;
    this.type = type;
    this.statusCode = options?.statusCode;
    this.originalError = options?.originalError;

    // Error継承時のプロトタイプチェーン修正
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ============================================
// 具体的なエラークラス
// ============================================

/**
 * ネットワークエラー（接続失敗、タイムアウト等）
 */
export class NetworkError extends AppError {
  constructor(message = "ネットワーク接続に失敗しました", originalError?: unknown) {
    super(ERROR_TYPES.NETWORK, message, { originalError });
  }
}

/**
 * 認証エラー（ログインが必要）
 */
export class AuthenticationError extends AppError {
  constructor(message = "ログインが必要です", originalError?: unknown) {
    super(ERROR_TYPES.AUTHENTICATION, message, { statusCode: 401, originalError });
  }
}

/**
 * 認可エラー（権限不足）
 */
export class AuthorizationError extends AppError {
  constructor(message = "この操作を行う権限がありません", originalError?: unknown) {
    super(ERROR_TYPES.AUTHORIZATION, message, { statusCode: 403, originalError });
  }
}

/**
 * バリデーションエラー（入力値不正）
 */
export class ValidationError extends AppError {
  readonly fields?: Record<string, string>;

  constructor(
    message = "入力値が正しくありません",
    options?: { fields?: Record<string, string>; originalError?: unknown }
  ) {
    super(ERROR_TYPES.VALIDATION, message, { statusCode: 400, originalError: options?.originalError });
    this.fields = options?.fields;
  }
}

/**
 * NotFoundエラー（リソースが見つからない）
 */
export class NotFoundError extends AppError {
  readonly resourceType?: string;
  readonly resourceId?: string;

  constructor(
    message = "リソースが見つかりません",
    options?: { resourceType?: string; resourceId?: string; originalError?: unknown }
  ) {
    super(ERROR_TYPES.NOT_FOUND, message, { statusCode: 404, originalError: options?.originalError });
    this.resourceType = options?.resourceType;
    this.resourceId = options?.resourceId;
  }
}

/**
 * サーバーエラー（500系）
 */
export class ServerError extends AppError {
  constructor(message = "サーバーエラーが発生しました", statusCode = 500, originalError?: unknown) {
    super(ERROR_TYPES.SERVER, message, { statusCode, originalError });
  }
}

/**
 * タイムアウトエラー
 */
export class TimeoutError extends AppError {
  readonly timeoutMs?: number;

  constructor(message = "リクエストがタイムアウトしました", timeoutMs?: number, originalError?: unknown) {
    super(ERROR_TYPES.TIMEOUT, message, { originalError });
    this.timeoutMs = timeoutMs;
  }
}

/**
 * 不明なエラー
 */
export class UnknownError extends AppError {
  constructor(message = "予期せぬエラーが発生しました", originalError?: unknown) {
    super(ERROR_TYPES.UNKNOWN, message, { originalError });
  }
}

// ============================================
// エラー判定ユーティリティ
// ============================================

/**
 * 認証エラーかどうかを判定
 */
export const isAuthError = (error: unknown): error is AuthenticationError => {
  if (error instanceof AuthenticationError) return true;
  if (error instanceof AppError && error.statusCode === 401) return true;
  return false;
};

/**
 * 認可エラーかどうかを判定
 */
export const isAuthorizationError = (error: unknown): error is AuthorizationError => {
  if (error instanceof AuthorizationError) return true;
  if (error instanceof AppError && error.statusCode === 403) return true;
  return false;
};

/**
 * ネットワークエラーかどうかを判定
 */
export const isNetworkError = (error: unknown): error is NetworkError => {
  if (error instanceof NetworkError) return true;
  if (error instanceof TypeError && error.message.includes("fetch")) return true;
  return false;
};

/**
 * リトライ可能なエラーかどうかを判定
 */
export const isRetryableError = (error: unknown): boolean => {
  if (error instanceof NetworkError) return true;
  if (error instanceof TimeoutError) return true;
  if (error instanceof ServerError && error.statusCode && error.statusCode >= 500) return true;
  return false;
};

// ============================================
// エラー変換ユーティリティ
// ============================================

/**
 * HTTPステータスコードからエラーを生成
 */
export const createErrorFromStatus = (
  statusCode: number,
  message?: string,
  originalError?: unknown
): AppError => {
  switch (statusCode) {
    case 400:
      return new ValidationError(message, { originalError });
    case 401:
      return new AuthenticationError(message, originalError);
    case 403:
      return new AuthorizationError(message, originalError);
    case 404:
      return new NotFoundError(message, { originalError });
    case 408:
    case 504:
      return new TimeoutError(message, undefined, originalError);
    default:
      if (statusCode >= 500) {
        return new ServerError(message, statusCode, originalError);
      }
      return new UnknownError(message, originalError);
  }
};

/**
 * 任意のエラーをAppErrorに正規化
 */
export const normalizeToAppError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof TypeError && error.message.includes("fetch")) {
    return new NetworkError("ネットワーク接続に失敗しました", error);
  }

  if (error instanceof Error) {
    return new UnknownError(error.message, error);
  }

  return new UnknownError(String(error), error);
};
