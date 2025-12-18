/**
 * AI Settings Page
 *
 * AI性格プリセット設定のみを表示するページ
 * アバター機能は未完成のため非表示
 */

"use client";

import { useCallback } from "react";
import PersonalityPresetSelector from "../../../views/PersonalityPresetSelector";
import { usePersonalityPresetPresenter } from "../../presenters/usePersonalityPresetPresenter";
import { useSessionGuard } from "../../hooks";
import { Skeleton } from "../../../components/ui/skeleton";

const AISettingsPage = () => {
  const { state: sessionState, session } = useSessionGuard({
    requiredRole: "NEW_HIRE",
  });

  // AI性格プリセットPresenter
  const presetPresenter = usePersonalityPresetPresenter({
    accessToken: session?.accessToken,
  });

  // プリセット選択ハンドラー
  const handleSelectPreset = useCallback(
    async (presetId: string) => {
      await presetPresenter.actions.selectPreset(presetId);
    },
    [presetPresenter.actions]
  );

  // プリセットリセットハンドラー
  const handleResetPresetToDefault = useCallback(async () => {
    await presetPresenter.actions.resetToDefault();
  }, [presetPresenter.actions]);

  // エラー閉じるハンドラー
  const handleDismissError = useCallback(() => {
    presetPresenter.actions.clearError();
  }, [presetPresenter.actions]);

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
            新入社員のみ利用できます。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">AI設定</h1>
        <p className="text-muted-foreground">
          AIメンターのコミュニケーションスタイルをカスタマイズできます。
        </p>
      </div>

      {/* AI性格プリセット選択 */}
      <PersonalityPresetSelector
        viewModel={presetPresenter.viewModel}
        onSelectPreset={handleSelectPreset}
        onResetToDefault={handleResetPresetToDefault}
        onDismissError={handleDismissError}
        isLoading={presetPresenter.isLoading}
        isSaving={presetPresenter.isSaving}
        error={presetPresenter.error}
      />
    </div>
  );
};

export default AISettingsPage;
