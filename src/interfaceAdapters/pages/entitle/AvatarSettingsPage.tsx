/**
 * Avatar Settings Page V2
 *
 * Clean Architecture V2: 薄い結合レイヤー
 * - V2 Presenterを使用
 * - Viewに純粋なViewModelを提供
 */

"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import AvatarSettingsView from "../../../views/AvatarSettingsView";
import { useAvatarPresenter } from "../../presenters/useAvatarPresenter";
import { useSessionGuard } from "../../hooks";
import { Skeleton } from "../../../components/ui/skeleton";
import type { AvatarGender, AvatarPersonality } from "../../../domain/core";

const AvatarSettingsPage = () => {
  const router = useRouter();

  const { state: sessionState, session } = useSessionGuard({
    requiredRole: "NEW_HIRE",
  });

  // V2 Presenter使用
  const presenter = useAvatarPresenter({
    accessToken: session?.accessToken,
  });

  // 性別変更ハンドラー
  const handleGenderChange = useCallback(
    async (gender: AvatarGender) => {
      await presenter.actions.updateGender(gender);
    },
    [presenter.actions]
  );

  // 性格変更ハンドラー
  const handlePersonalityChange = useCallback(
    async (personality: AvatarPersonality) => {
      await presenter.actions.updatePersonality(personality);
    },
    [presenter.actions]
  );

  // 生成開始ハンドラー
  const handleGenerate = useCallback(async () => {
    const { gender, personalityPreset } = presenter.viewModel;

    if (!gender || !personalityPreset) {
      // エラーハンドリングはPresenter内で行われる
      return;
    }

    await presenter.actions.startGeneration(gender, personalityPreset);
  }, [presenter.viewModel, presenter.actions]);

  // 再生成ハンドラー
  const handleRegenerate = useCallback(() => {
    presenter.actions.resetForRegeneration();
  }, [presenter.actions]);

  // チャットへ移動
  const handleNavigateToChat = useCallback(() => {
    router.push("/student/dashboard");
  }, [router]);

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
    <AvatarSettingsView
      viewModel={{
        gender: presenter.viewModel.gender,
        personalityPreset: presenter.viewModel.personalityPreset,
        isGenerated: presenter.viewModel.isGenerated,
        generationStatus: presenter.viewModel.generationStatus,
        generationProgress: presenter.viewModel.generationProgress,
        avatarUrls: presenter.viewModel.avatarUrls,
      }}
      interactions={{
        onGenderChange: handleGenderChange,
        onPersonalityChange: handlePersonalityChange,
        onGenerate: handleGenerate,
        onRegenerate: handleRegenerate,
        onNavigateToChat: handleNavigateToChat,
      }}
      isLoading={presenter.isLoading}
      error={presenter.error}
    />
  );
};

export default AvatarSettingsPage;
