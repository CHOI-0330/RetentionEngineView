"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import AuthView from "../../../views/AuthView";
import { useAuthPresenter } from "../../presenters/useAuthPresenter";
import { useSession } from "../../../components/SessionProvider";
import { invalidateSessionCache } from "../../../lib/api";

/**
 * AuthPage V2
 *
 * V2アーキテクチャ使用
 * - Presenter V2: Factory → Service → ViewModel
 * - Controller不要（Presenterが全て管理）
 * - Effect処理もPresenter内で完結
 */
const AuthPage = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { session: globalSession, interactions } = useSession();

  // Presenter V2（Serviceを内部で使用）
  const presenter = useAuthPresenter({
    accessToken: globalSession?.accessToken,
    initialSession: globalSession
      ? {
          accessToken: globalSession.accessToken,
          refreshToken: globalSession.refreshToken,
          userId: globalSession.userId,
          role: globalSession.role,
        }
      : null,
  });

  // SessionProviderのセッションをPresenterに同期 (削除)
  // Note: initialSessionでPresenterを初期化するため、この同期は不要
  // globalSessionとpresenter.sessionの双方向同期が無限ループの原因だった

  // ログイン成功後、ロールに応じて自動遷移
  const redirectedUserRef = useRef<string | null>(null);
  useEffect(() => {
    // presenter.viewModel.sessionまたはglobalSessionのどちらかを使用
    const session = presenter.viewModel.session || globalSession;
    if (!session) {
      redirectedUserRef.current = null;
      return;
    }
    if (!pathname) {
      return;
    }

    const target = session.role === "MENTOR" ? "/mentor" : "/student/dashboard";
    const alreadyThere = pathname === target || pathname.startsWith(target);

    if (!alreadyThere && redirectedUserRef.current !== session.userId) {
      redirectedUserRef.current = session.userId;
      router.replace(target);
    }
  }, [presenter.viewModel.session, globalSession, pathname, router]);

  // ログイン/ログアウト成功時のセッション更新
  // Note: presenter.viewModel.sessionの変更時のみrefetchを実行
  const prevSessionUserIdRef = useRef<string | null>(
    presenter.viewModel.session?.userId ?? null
  );
  useEffect(() => {
    const currentUserId = presenter.viewModel.session?.userId ?? null;
    const prevUserId = prevSessionUserIdRef.current;

    // セッションのユーザーIDが変わった場合のみrefetch（ログイン/ログアウト）
    if (currentUserId !== prevUserId) {
      prevSessionUserIdRef.current = currentUserId;

      // セッションキャッシュを無効化して更新
      invalidateSessionCache();
      void interactions.refetchSession();
    }
  }, [presenter.viewModel.session?.userId, interactions]);

  // セッションがある場合はロードUI表示（リダイレクト処理中）
  const session = presenter.viewModel.session || globalSession;
  if (session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">リダイレクト中...</p>
        </div>
      </div>
    );
  }

  // V2では、認証処理は全てPresenter内で完結
  // Controller + Effect の代わりに、Presenterのactionsを直接使用
  return (
    <AuthView
      viewModel={presenter.viewModel}
      status={{
        isSubmitting: presenter.isSubmitting,
        error: presenter.error,
      }}
      interactions={{
        setRegisterField: presenter.actions.setRegisterField,
        setLoginField: presenter.actions.setLoginField,
        submitRegistration: presenter.actions.submitRegistration,
        submitLogin: presenter.actions.submitLogin,
        submitLogout: presenter.actions.submitLogout,
        clearError: presenter.actions.clearError,
      }}
    />
  );
};

export default AuthPage;
