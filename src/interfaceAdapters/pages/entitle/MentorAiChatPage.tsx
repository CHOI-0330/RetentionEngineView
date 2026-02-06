/**
 * MentorAiChat Page
 *
 * メンターAIチャットのPage層
 * - セッションガード（MENTOR/ADMINロール必須）
 * - Presenter Hook呼び出し
 * - ViewへのPresenterOutput受け渡し
 */

"use client";

import { useSessionGuard } from "../../hooks";
import { useMentorAiChatPresenter } from "../../presenters/useMentorAiChatPresenter";
import { MentorAiChatView } from "../../../views/mentorAIChat/MentorAiChatView";
import { Skeleton } from "../../../components/ui/skeleton";

const MentorAiChatPage = () => {
  // セッションガード（MENTORロールが必要）
  const { state: sessionState, session } = useSessionGuard({
    requiredRole: "MENTOR",
  });

  // Presenter Hook
  const presenter = useMentorAiChatPresenter({
    accessToken: session?.accessToken,
    userId: session?.userId,
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
        メンターのみ利用できます。現在のロール: {session?.role}
      </div>
    );
  }

  // ============================================
  // ローディングUI
  // ============================================

  if (presenter.isLoading && presenter.conversations.length === 0) {
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
      <MentorAiChatView presenter={presenter} />
    </div>
  );
};

export default MentorAiChatPage;
