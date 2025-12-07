"use client";

import { useSession } from "../../components/SessionProvider";

/**
 * セッション及び権限チェック用の共通フック
 *
 * 複数のPageで重複していたセッション/権限チェックロジックを統合します。
 *
 * @example
 * ```tsx
 * const { state, session } = useSessionGuard({ requiredRole: "NEW_HIRE" });
 *
 * if (state === "loading") return <Skeleton />;
 * if (state === "unauthenticated") return <LoginPrompt />;
 * if (state === "unauthorized") return <UnauthorizedMessage role={session?.role} />;
 *
 * // state === "authenticated" - 正常レンダリング
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
   * 必要なロール。指定しなければログインのみ確認
   */
  requiredRole?: UserRole;

  /**
   * 複数ロールのいずれかに該当すれば許可
   */
  allowedRoles?: UserRole[];
}

export function useSessionGuard(
  options: UseSessionGuardOptions = {}
): SessionGuardResult {
  const { session, isLoading } = useSession();
  const { requiredRole, allowedRoles } = options;

  // ローディング中
  if (isLoading) {
    return { state: "loading", session: null, isLoading: true };
  }

  // 未認証
  if (!session) {
    return { state: "unauthenticated", session: null, isLoading: false };
  }

  // ロールチェック
  if (requiredRole && session.role !== requiredRole) {
    return { state: "unauthorized", session, isLoading: false };
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(session.role)) {
      return { state: "unauthorized", session, isLoading: false };
    }
  }

  // 認証済み
  return { state: "authenticated", session, isLoading: false };
}

/**
 * セッションガード状態に応じたUIレンダリングヘルパー
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
