import type { UseCaseFailure, UseCaseFailureKind } from "../../application/entitle/models";
import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  TimeoutError,
  ValidationError,
  NotFoundError,
  ServerError,
  normalizeToAppError,
  isAuthError as isAuthErrorInternal,
  isNetworkError as isNetworkErrorInternal,
  isRetryableError as isRetryableErrorInternal,
} from "../errors";

// エラークラスをre-export
export {
  AppError,
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  TimeoutError,
  ValidationError,
  NotFoundError,
  ServerError,
  ERROR_TYPES,
} from "../errors";

/**
 * AppErrorをUseCaseFailureKindにマッピング
 */
function mapErrorToFailureKind(error: AppError): UseCaseFailureKind {
  if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
    return "Forbidden";
  }
  if (error instanceof NotFoundError) {
    return "NotFound";
  }
  return "ValidationError";
}

/**
 * エラーをUseCaseFailure形態に正規化
 *
 * 複数Pageで重複していたnormalizeError関数を統合します。
 */
export function normalizeError(reason: unknown): UseCaseFailure {
  const appError = normalizeToAppError(reason);

  return {
    kind: mapErrorToFailureKind(appError),
    message: appError.message,
  };
}

/**
 * エラーが認証関連かどうか確認
 */
export function isAuthError(error: unknown): boolean {
  return isAuthErrorInternal(error);
}

/**
 * エラーがネットワーク関連かどうか確認
 */
export function isNetworkError(error: unknown): boolean {
  return isNetworkErrorInternal(error);
}

/**
 * エラーがリトライ可能かどうか確認
 */
export function isRetryableError(error: unknown): boolean {
  return isRetryableErrorInternal(error);
}

/**
 * エラーメッセージ抽出
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "予期せぬエラーが発生しました";
}
