"use client";

import { useSession } from "../../components/SessionProvider";

/**
 * 세션 및 권한 체크를 위한 공통 훅
 *
 * 여러 Page에서 중복되던 세션/권한 체크 로직을 통합합니다.
 *
 * @example
 * ```tsx
 * const { state, session } = useSessionGuard({ requiredRole: "NEW_HIRE" });
 *
 * if (state === "loading") return <Skeleton />;
 * if (state === "unauthenticated") return <LoginPrompt />;
 * if (state === "unauthorized") return <UnauthorizedMessage role={session?.role} />;
 *
 * // state === "authenticated" - 정상 렌더링
 * return <MainContent session={session} />;
 * ```
 */

export type UserRole = "NEW_HIRE" | "MENTOR" | "ADMIN";

export type SessionGuardState =
  | "loading"
  | "unauthenticated"
  | "unauthorized"
  | "authenticated";

export interface SessionGuardResult {
  state: SessionGuardState;
  session: {
    accessToken: string;
    refreshToken: string;
    userId: string;
    role: UserRole;
    displayName?: string;
  } | null;
  isLoading: boolean;
}

export interface UseSessionGuardOptions {
  /**
   * 필요한 역할. 지정하지 않으면 로그인만 확인
   */
  requiredRole?: UserRole;

  /**
   * 여러 역할 중 하나라도 해당하면 허용
   */
  allowedRoles?: UserRole[];
}

export function useSessionGuard(
  options: UseSessionGuardOptions = {}
): SessionGuardResult {
  const { session, isLoading } = useSession();
  const { requiredRole, allowedRoles } = options;

  // 로딩 중
  if (isLoading) {
    return { state: "loading", session: null, isLoading: true };
  }

  // 미인증
  if (!session) {
    return { state: "unauthenticated", session: null, isLoading: false };
  }

  // 역할 체크
  if (requiredRole && session.role !== requiredRole) {
    return { state: "unauthorized", session, isLoading: false };
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(session.role)) {
      return { state: "unauthorized", session, isLoading: false };
    }
  }

  // 인증됨
  return { state: "authenticated", session, isLoading: false };
}

/**
 * 세션 가드 상태에 따른 UI 렌더링 헬퍼
 */
export interface SessionGuardMessages {
  loading?: string;
  unauthenticated?: string;
  unauthorized?: string;
}

const DEFAULT_MESSAGES: SessionGuardMessages = {
  loading: "ログイン情報を確認中...",
  unauthenticated: "ログインしてください。",
  unauthorized: "このページにアクセスする権限がありません。",
};

export function getSessionGuardMessage(
  state: SessionGuardState,
  currentRole?: UserRole,
  messages: SessionGuardMessages = {}
): string | null {
  const mergedMessages = { ...DEFAULT_MESSAGES, ...messages };

  switch (state) {
    case "loading":
      return mergedMessages.loading ?? null;
    case "unauthenticated":
      return mergedMessages.unauthenticated ?? null;
    case "unauthorized":
      return currentRole
        ? `${mergedMessages.unauthorized} 現在のロール: ${currentRole}`
        : mergedMessages.unauthorized ?? null;
    case "authenticated":
      return null;
  }
}
