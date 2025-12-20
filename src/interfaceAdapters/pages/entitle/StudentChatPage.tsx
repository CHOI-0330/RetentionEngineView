/**
 * StudentChat Page V2
 *
 * 新アーキテクチャ：シンプルなPage層
 * - セッションガード
 * - Presenter Hook呼び出し
 * - ViewへのViewModel受け渡し
 */

"use client";

import { useSearchParams } from "next/navigation";

import { useSessionGuard } from "../../hooks";
import { useStudentChatPresenter } from "../../presenters/useStudentChatPresenter";
import { StudentChatView } from "../../../views/studentChat";
import { Skeleton } from "../../../components/ui/skeleton";

interface StudentChatPageProps {
  convId?: string;
}

const StudentChatPage = ({ convId }: StudentChatPageProps) => {
  const searchParams = useSearchParams();
  // propsで渡されたconvIdを優先、なければsearchParamsから取得（下位互換性のため）
  const initialConvId = convId ?? searchParams?.get("convId") ?? undefined;

  // セッションガード（NEW_HIREロールが必要）
  const { state: sessionState, session } = useSessionGuard({
    requiredRole: "NEW_HIRE",
  });

  // Presenter Hook（新アーキテクチャ）
  const presenter = useStudentChatPresenter({
    accessToken: session?.accessToken,
    userId: session?.userId,
    role: session?.role,
    initialConvId,
  });

  // ============================================
  // セッションガードUI
  // ============================================

  if (sessionState === "loading") {
    return (
      <div className="p-6">
        <Skeleton className="h-6 w-32" />
      </div>
    );
  }

  if (sessionState === "unauthenticated") {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        ログインしてください。{" "}
        <a className="text-primary underline" href="/entitle/auth">
          Auth
        </a>
      </div>
    );
  }

  if (sessionState === "unauthorized") {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        新入社員のみ利用できます。現在のロール: {session?.role}
      </div>
    );
  }

  // ============================================
  // ローディングUI
  // ============================================

  if (presenter.isLoading || !presenter.viewModel) {
    return (
      <div className="p-6" aria-busy="true" aria-live="polite">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-7 w-64" />
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[320px] w-full" />
        </div>
      </div>
    );
  }

  // ============================================
  // メインUI
  // ============================================

  return (
    <div className="h-[calc(100vh-4rem)]">
      <StudentChatView
        viewModel={presenter.viewModel}
        newMessage={presenter.newMessage}
        status={{
          isSending: presenter.isSending,
          isAwaitingAssistant: presenter.isAwaitingAssistant,
          error: presenter.error,
        }}
        actions={presenter.actions}
        searchSettings={presenter.searchSettings}
        onSearchSettingsChange={presenter.setSearchSettings}
        webSearchPending={presenter.webSearchPending}
        feedback={presenter.feedback}
        infiniteScroll={presenter.infiniteScroll}
      />
    </div>
  );
};

export default StudentChatPage;
