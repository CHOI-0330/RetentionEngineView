"use client";

/**
 * MentorStudentChat Page V2
 *
 * Clean Architecture: 薄い結合レイヤー
 * - Presenter経由でService/UseCaseを使用
 * - 純粋なViewModelをViewに渡す
 */

import MentorStudentChatView from "../../../views/MentorStudentChatView";
import { Skeleton } from "../../../components/ui/skeleton";
import { useSession } from "../../../components/SessionProvider";
import { useMentorStudentChatPresenter } from "../../presenters/useMentorStudentChatPresenter";

interface MentorStudentChatPageProps {
  convId: string;
}

const MentorStudentChatPage = ({ convId }: MentorStudentChatPageProps) => {
  const { session, isLoading: isSessionLoading } = useSession();

  const presenter = useMentorStudentChatPresenter({
    convId,
    accessToken: session?.accessToken,
    isSessionLoading,
  });

  const {
    viewModel,
    isLoading,
    error,
    drafts,
    submitting,
    formErrors,
    editingFlags,
    actions,
  } = presenter;

  // セッションローディング中
  if (isSessionLoading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        ログイン情報を確認中...
      </div>
    );
  }

  // 未ログイン
  if (!session) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        ログインしてください。{" "}
        <a className="text-primary underline" href="/entitle/auth">
          Auth
        </a>
      </div>
    );
  }

  // ローディング中またはエラー時
  if (isLoading || !viewModel) {
    return (
      <div className="p-6" aria-busy="true" aria-live="polite">
        <div className="mx-auto max-w-5xl space-y-4">
          {error ? (
            <div className="text-sm text-destructive" role="alert">
              会話の読み込みに失敗しました: {error.message}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-7 w-72" />
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-[320px] w-full" />
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <MentorStudentChatView
      conversationTitle={viewModel.conversationTitle}
      studentName={viewModel.studentName}
      mentorName={viewModel.mentorName}
      messages={viewModel.messages}
      feedbackDrafts={drafts}
      feedbackSubmitting={submitting}
      feedbackErrors={formErrors}
      editingFlags={editingFlags}
      onFeedbackDraftChange={actions.handleDraftChange}
      onToggleEditing={actions.handleToggleEditing}
      onSubmitFeedback={actions.handleSubmitFeedback}
    />
  );
};

export default MentorStudentChatPage;
