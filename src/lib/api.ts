/**
 * 共通APIユーティリティ
 * - 重複したfetch/JSONパースロジック統合
 * - シンプルなリクエストキャッシング対応
 * - エラーハンドリング標準化
 */

export interface ApiResponse<T> {
  data: T;
  ok: true;
}

export interface ApiError {
  ok: false;
  error: string;
  status: number;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// シンプルなインメモリキャッシュ
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_CACHE_TTL = 30 * 1000; // 30秒

// 進行中のリクエスト追跡（重複リクエスト防止）
const pendingRequests = new Map<string, Promise<unknown>>();

/**
 * キャッシュからデータ取得
 */
function getFromCache<T>(key: string, ttl: number): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const isExpired = Date.now() - entry.timestamp > ttl;
  if (isExpired) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * キャッシュにデータ保存
 */
function setToCache<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * 特定パターンのキャッシュ無効化
 */
export function invalidateCache(pattern?: string | RegExp): void {
  if (!pattern) {
    cache.clear();
    return;
  }

  const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
  for (const key of cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key);
    }
  }
}

export interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /**
   * キャッシュTTL（ミリ秒）。0ならキャッシュ無効化
   * GETリクエストにのみ適用
   */
  cacheTtl?: number;
  /**
   * 認証トークン
   */
  accessToken?: string;
}

/**
 * 標準化されたAPI fetch関数
 * - JSONパース自動処理
 * - エラーハンドリング標準化
 * - GETリクエストキャッシング対応
 * - 重複リクエスト防止（同一リクエスト進行中なら待機）
 */
export async function apiFetch<T>(
  url: string,
  options: FetchOptions = {}
): Promise<ApiResult<T>> {
  const {
    body,
    cacheTtl = 0,
    accessToken,
    headers: customHeaders,
    method = "GET",
    ...restOptions
  } = options;

  const isGet = method.toUpperCase() === "GET";
  const cacheKey = `${method}:${url}`;

  // GETリクエストでキャッシュが有効な場合、キャッシュ確認
  if (isGet && cacheTtl > 0) {
    const cached = getFromCache<T>(cacheKey, cacheTtl);
    if (cached !== null) {
      return { ok: true, data: cached };
    }
  }

  // 同一リクエストが進行中なら待機
  if (isGet && pendingRequests.has(cacheKey)) {
    try {
      const result = await pendingRequests.get(cacheKey);
      return result as ApiResult<T>;
    } catch {
      // 既存リクエストが失敗した場合、新規試行
    }
  }

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const fetchPromise = (async (): Promise<ApiResult<T>> => {
    try {
      const response = await fetch(url, {
        method,
        credentials: "include",
        ...restOptions,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      const raw = await response.text();
      let json: unknown = null;

      if (raw) {
        try {
          json = JSON.parse(raw);
        } catch {
          json = null;
        }
      }

      if (!response.ok) {
        const errorMessage =
          (json as { error?: string; message?: string })?.error ??
          (json as { error?: string; message?: string })?.message ??
          raw ??
          "Unexpected error";
        return {
          ok: false,
          error: errorMessage,
          status: response.status,
        };
      }

      const data = (json as { data?: T })?.data ?? (json as T);

      // GETリクエストでキャッシュが有効な場合、キャッシュに保存
      if (isGet && cacheTtl > 0) {
        setToCache(cacheKey, data);
      }

      return { ok: true, data };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Network error",
        status: 0,
      };
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  // GETリクエストは重複リクエスト防止
  if (isGet) {
    pendingRequests.set(cacheKey, fetchPromise);
  }

  return fetchPromise;
}

/**
 * セッションデータ型
 */
export interface SessionData {
  accessToken: string;
  refreshToken: string;
  userId: string;
  role: "NEW_HIRE" | "MENTOR" | "ADMIN";
  displayName?: string;
}

// セッション専用キャッシュキー
const SESSION_CACHE_KEY = "session";
const SESSION_CACHE_TTL = 60 * 1000; // 1分

/**
 * セッションfetch（キャッシング + 重複リクエスト防止）
 */
export async function fetchSession(): Promise<SessionData | null> {
  // キャッシュ確認
  const cached = getFromCache<SessionData>(SESSION_CACHE_KEY, SESSION_CACHE_TTL);
  if (cached !== null) {
    return cached;
  }

  const result = await apiFetch<SessionData>("/api/auth/session", {
    cacheTtl: SESSION_CACHE_TTL,
  });

  if (result.ok) {
    setToCache(SESSION_CACHE_KEY, result.data);
    return result.data;
  }

  return null;
}

/**
 * セッションキャッシュ無効化（ログイン/ログアウト後に呼び出し）
 */
export function invalidateSessionCache(): void {
  cache.delete(`GET:/api/auth/session`);
  cache.delete(SESSION_CACHE_KEY);
}
