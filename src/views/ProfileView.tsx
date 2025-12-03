import { Button } from "../components/ui/button";
import { Alert } from "../components/ui/alert";
import { MbtiCardSelector } from "../components/MbtiCardSelector";
import type {
  MbtiPresenterViewModel,
  MbtiPresenterStatus,
  MbtiPresenterInteractions,
} from "../interfaceAdapters/presenters/useMbtiPresenter";

interface ProfileViewProps {
  viewModel: MbtiPresenterViewModel;
  status: MbtiPresenterStatus;
  interactions: MbtiPresenterInteractions;
}

const ProfileView = ({ viewModel, status, interactions }: ProfileViewProps) => {
  const hasChanges = viewModel.selectedMbti !== viewModel.currentMbti;

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">プロフィール設定</h1>
        <p className="text-muted-foreground">
          MBTI性格タイプを設定・管理できます。
        </p>
      </header>

      {status.error && (
        <Alert
          variant="destructive"
          className="flex items-start justify-between gap-3 animate-in fade-in zoom-in-95"
        >
          <span>{status.error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={interactions.clearError}
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
            value={viewModel.selectedMbti}
            onChange={interactions.setSelectedMbti}
            disabled={status.isLoading}
          />

          {viewModel.currentMbti && (
            <div className="rounded-md bg-muted/50 p-4 text-sm">
              <p className="font-medium">現在設定されているMBTI</p>
              <p className="text-muted-foreground">{viewModel.currentMbti}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={interactions.saveMbti}
            disabled={
              status.isLoading || !hasChanges || !viewModel.selectedMbti
            }
            className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
          >
            {status.isLoading ? "保存中..." : "保存"}
          </Button>
          {hasChanges && (
            <Button
              variant="outline"
              onClick={() =>
                interactions.setSelectedMbti(viewModel.currentMbti)
              }
              disabled={status.isLoading}
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
