/**
 * MentorDashboard Page V2 コンポーネント
 *
 * 新アーキテクチャ：Presenter V2を使用
 * Factory → Service → Presenter パターン
 */

"use client";

import { useRouter } from "next/navigation";

import MentorDashboardView from "../../../views/MentorDashboardView";
import MentorAssignmentView from "../../../views/MentorAssignmentView";
import { useMentorDashboardPresenter } from "../../presenters/useMentorDashboardPresenter";
import { useSessionGuard } from "../../hooks";
import { isAuthError } from "../../utils/errors";
import { useEffect } from "react";

// ============================================
// Page コンポーネント
// ============================================

const MentorDashboardPage = () => {
  const router = useRouter();

  // セッションガード（MENTORロールが必要）
  const { state: sessionState, session } = useSessionGuard({
    requiredRole: "MENTOR",
  });

  // Presenter V2
  const presenter = useMentorDashboardPresenter({
    accessToken: session?.accessToken,
    userId: session?.userId,
    role: session?.role,
  });

  // 認証エラー時リダイレクト
  useEffect(() => {
    if (presenter.error && isAuthError(presenter.error)) {
      router.push("/");
    }
  }, [presenter.error, router]);

  // セッションガードUI
  if (sessionState === "loading") {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        ログイン情報を確認中...
      </div>
    );
  }

  if (sessionState === "unauthenticated") {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        ログインしてください。{" "}
        <a className="text-primary underline" href="/">
          ログイン
        </a>
      </div>
    );
  }

  if (sessionState === "unauthorized") {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        メンター権限が必要です。現在のロール: {session?.role}
      </div>
    );
  }

  // 利用可能・割り当て済み新入社員の分離
  const availableNewhires = presenter.viewModel.newhireOptions.filter(
    (n) => !n.isAssigned
  );
  const assignedNewhires = presenter.viewModel.newhireOptions.filter(
    (n) => n.isAssigned
  );

  return (
    <div className="space-y-4">
      <MentorAssignmentView
        newhireOptions={presenter.viewModel.newhireOptions}
        selectedNewhireId={presenter.selectedNewhireId}
        onSelectNewhire={presenter.actions.selectNewhire}
        onCreateAssignment={presenter.actions.createAssignment}
        onRefreshNewhires={presenter.actions.refreshNewhires}
        isLoadingNewhires={presenter.isLoadingNewhires}
        isAssigning={presenter.isAssigning}
        assignmentError={presenter.assignmentError}
      />

      <MentorDashboardView
        viewModel={{
          students: presenter.viewModel.students,
          searchQuery: presenter.searchQuery,
          onChangeSearch: presenter.actions.setSearchQuery,
        }}
        status={{
          isLoading: presenter.isLoading,
          error: presenter.error,
        }}
        meta={{
          qualitySubmitting: presenter.qualitySubmitting,
          selectedStudentId: presenter.selectedStudentId,
        }}
        interactions={{
          requestRefresh: presenter.actions.refresh,
          acknowledgeEffect: () => {},
          clearError: presenter.actions.clearError,
          selectStudent: presenter.actions.selectStudent,
        }}
      />
    </div>
  );
};

export default MentorDashboardPage;
