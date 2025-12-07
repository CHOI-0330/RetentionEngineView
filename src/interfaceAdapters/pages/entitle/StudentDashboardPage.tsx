/**
 * StudentDashboard Page - V2 Architecture
 *
 * Clean Architecture V2: Simplified Pattern
 * - Presenter V2を使用（Gateway → UseCase → Service → Factory → Presenter）
 * - Controller/EffectQueue不要
 * - ビジネスロジックはUseCaseに委任
 */

"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import StudentDashboardView from "../../../views/StudentDashboardView";
import { useStudentDashboardPresenter } from "../../presenters/useStudentDashboardPresenter";
import { Skeleton } from "../../../components/ui/skeleton";

// 共通フック
import { useSessionGuard } from "../../hooks";

const StudentDashboardPage = () => {
  const router = useRouter();

  // セッションガード（NEW_HIREロールが必要）
  const { state: sessionState, session } = useSessionGuard({
    requiredRole: "NEW_HIRE",
  });

  // V2 Presenter（Factory経由でService生成、UseCase実行）
  const presenter = useStudentDashboardPresenter({
    accessToken: session?.accessToken,
    userId: session?.userId,
    role: session?.role,
  });

  // 会話ページへ移動
  const handleNavigateToConversation = useCallback(
    (convId: string) => {
      router.push(`/student/chat/${encodeURIComponent(convId)}`);
    },
    [router]
  );

  // セッションガードUI
  if (sessionState === "loading") {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (sessionState === "unauthenticated") {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg text-muted-foreground">
            ログイン情報が確認できません。
          </p>
          <a href="/" className="text-primary underline">
            ログインページへ
          </a>
        </div>
      </div>
    );
  }

  if (sessionState === "unauthorized") {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg text-muted-foreground">
            新入社員のみ利用できます。現在のロール: {session?.role}
          </p>
        </div>
      </div>
    );
  }

  // Heading生成
  const heading = session?.displayName
    ? `Welcome back, ${session.displayName}`
    : "Welcome Back";

  return (
    <StudentDashboardView
      heading={heading}
      viewModel={presenter.viewModel}
      isLoading={presenter.isLoading}
      isCreating={presenter.isCreating}
      error={presenter.error}
      searchQuery={presenter.searchQuery}
      newTitle={presenter.newTitle}
      isDeleting={presenter.isDeleting}
      actions={presenter.actions}
      onNavigateToConversation={handleNavigateToConversation}
    />
  );
};

export default StudentDashboardPage;
