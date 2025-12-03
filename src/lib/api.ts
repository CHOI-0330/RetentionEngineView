/**
 * 공통 API 유틸리티
 * - 중복된 fetch/JSON 파싱 로직 통합
 * - 간단한 요청 캐싱 지원
 * - 에러 핸들링 표준화
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

// 간단한 인메모리 캐시
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_CACHE_TTL = 30 * 1000; // 30초

// 진행 중인 요청 추적 (중복 요청 방지)
const pendingRequests = new Map<string, Promise<unknown>>();

/**
 * 캐시에서 데이터 조회
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
 * 캐시에 데이터 저장
 */
function setToCache<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * 특정 패턴의 캐시 무효화
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
   * 캐시 TTL (밀리초). 0이면 캐시 비활성화
   * GET 요청에만 적용됨
   */
  cacheTtl?: number;
  /**
   * 인증 토큰
   */
  accessToken?: string;
}

/**
 * 표준화된 API fetch 함수
 * - JSON 파싱 자동 처리
 * - 에러 핸들링 표준화
 * - GET 요청 캐싱 지원
 * - 중복 요청 방지 (동일 요청 진행 중이면 대기)
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

  // GET 요청이고 캐시가 활성화된 경우, 캐시 확인
  if (isGet && cacheTtl > 0) {
    const cached = getFromCache<T>(cacheKey, cacheTtl);
    if (cached !== null) {
      return { ok: true, data: cached };
    }
  }

  // 동일한 요청이 진행 중이면 대기
  if (isGet && pendingRequests.has(cacheKey)) {
    try {
      const result = await pendingRequests.get(cacheKey);
      return result as ApiResult<T>;
    } catch {
      // 기존 요청이 실패한 경우 새로 시도
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

      // GET 요청이고 캐시가 활성화된 경우, 캐시에 저장
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

  // GET 요청은 중복 요청 방지
  if (isGet) {
    pendingRequests.set(cacheKey, fetchPromise);
  }

  return fetchPromise;
}

/**
 * 세션 데이터 타입
 */
export interface SessionData {
  accessToken: string;
  refreshToken: string;
  userId: string;
  role: "NEW_HIRE" | "MENTOR" | "ADMIN";
  displayName?: string;
}

// 세션 전용 캐시 키
const SESSION_CACHE_KEY = "session";
const SESSION_CACHE_TTL = 60 * 1000; // 1분

/**
 * 세션 fetch (캐싱 + 중복 요청 방지)
 */
export async function fetchSession(): Promise<SessionData | null> {
  // 캐시 확인
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
 * 세션 캐시 무효화 (로그인/로그아웃 후 호출)
 */
export function invalidateSessionCache(): void {
  cache.delete(`GET:/api/auth/session`);
  cache.delete(SESSION_CACHE_KEY);
}
