/**
 * Profile View V2
 *
 * V2アーキテクチャ用のプロフィールビュー
 * PresenterV2から受け取ったViewModelを表示
 */

import { Button } from "../components/ui/button";
import { Alert } from "../components/ui/alert";
import { MbtiCardSelector } from "../components/MbtiCardSelector";
import type { ProfileViewModel } from "../interfaceAdapters/services/ProfileService";
import type { UseCaseFailure } from "../application/entitle/models";
import type { MbtiType } from "../domain/mbti.types";

// ============================================
// Props型定義
// ============================================

interface ProfileViewProps {
  viewModel: ProfileViewModel;
  isLoading: boolean;
  isSaving: boolean;
  error: UseCaseFailure | null;
  actions: {
    setSelectedMbti: (mbti: MbtiType | null) => void;
    saveMbti: () => Promise<void>;
    clearError: () => void;
    cancel: () => void;
  };
}

// ============================================
// Component
// ============================================

const ProfileView = ({
  viewModel,
  isLoading,
  isSaving,
  error,
  actions,
}: ProfileViewProps) => {
  // エラーメッセージ整形
  const errorMessage = error
    ? `${error.kind}: ${error.message}`
    : null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">プロフィール設定</h1>
        <p className="text-muted-foreground">
          MBTI性格タイプを設定・管理できます。
        </p>
      </header>

      {errorMessage && (
        <Alert
          variant="destructive"
          className="flex items-start justify-between gap-3"
        >
          <span>{errorMessage}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={actions.clearError}
            className="h-auto p-0 hover:bg-transparent"
          >
            閉じる
          </Button>
        </Alert>
      )}

      <div className="space-y-6 rounded-lg border bg-card p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">MBTI 性格タイプ</h2>
            <p className="text-sm text-muted-foreground">
              あなたのMBTI性格タイプを選択してください。AIチャットがあなたの性格に合わせて応答します。
            </p>
          </div>

          <MbtiCardSelector
            value={viewModel.selectedMbti?.type ?? null}
            onChange={actions.setSelectedMbti}
            disabled={isLoading || isSaving}
          />

          {viewModel.currentMbti && (
            <div className="rounded-md bg-muted/50 p-4 text-sm space-y-2">
              <p className="font-medium">現在設定されているMBTI</p>
              <div className="space-y-1">
                <p className="text-lg font-semibold">
                  {viewModel.currentMbti.type} - {viewModel.currentMbti.label}
                </p>
                <p className="text-muted-foreground">
                  {viewModel.currentMbti.description}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={actions.saveMbti}
            disabled={isLoading || isSaving || !viewModel.canSave}
            className="transition-colors"
          >
            {isSaving ? "保存中..." : "保存"}
          </Button>
          {viewModel.hasChanges && (
            <Button
              variant="outline"
              onClick={actions.cancel}
              disabled={isLoading || isSaving}
            >
              キャンセル
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
