"use client";

import React, { memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { cn } from "../components/ui/utils";
import type {
  AvatarGender,
  AvatarPersonality,
  AvatarEmotion,
  AvatarUrls,
  AvatarGenerationStatus,
} from "../domain/core";
import { AVATAR_EMOTIONS } from "../domain/core";
import { EMOTION_LABELS } from "../interfaceAdapters/utils/emotionParser";

// ===== Types =====

export interface AvatarSettingsViewModel {
  gender: AvatarGender | null;
  personalityPreset: AvatarPersonality | null;
  isGenerated: boolean;
  generationStatus: AvatarGenerationStatus;
  generationProgress: number;
  avatarUrls: AvatarUrls | null;
}

export interface AvatarSettingsInteractions {
  onGenderChange: (gender: AvatarGender) => void;
  onPersonalityChange: (personality: AvatarPersonality) => void;
  onGenerate: () => void;
  onRegenerate: () => void;
  onNavigateToChat: () => void;
}

export interface AvatarSettingsViewProps {
  viewModel: AvatarSettingsViewModel;
  interactions: AvatarSettingsInteractions;
  isLoading: boolean;
  error: string | null;
}

// ===== Sub Components =====

interface GenderSelectorProps {
  selected: AvatarGender | null;
  onChange: (gender: AvatarGender) => void;
  disabled: boolean;
}

const GenderSelector = memo(function GenderSelector({
  selected,
  onChange,
  disabled,
}: GenderSelectorProps) {
  const options: { value: AvatarGender; label: string; icon: string }[] = [
    { value: "female", label: "女性", icon: "👩" },
    { value: "male", label: "男性", icon: "👨" },
    { value: "neutral", label: "中性", icon: "🧑" },
  ];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">性別</label>
      <div className="flex gap-3">
        {options.map((option) => (
          <Button
            key={option.value}
            variant={selected === option.value ? "default" : "outline"}
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className="flex-1"
          >
            <span className="mr-2">{option.icon}</span>
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
});

interface PersonalitySelectorProps {
  selected: AvatarPersonality | null;
  onChange: (personality: AvatarPersonality) => void;
  disabled: boolean;
}

const PersonalitySelector = memo(function PersonalitySelector({
  selected,
  onChange,
  disabled,
}: PersonalitySelectorProps) {
  const options: { value: AvatarPersonality; label: string; description: string }[] = [
    { value: "friendly", label: "フレンドリー", description: "温かくて親しみやすい" },
    { value: "professional", label: "プロフェッショナル", description: "自信があり有能な" },
    { value: "caring", label: "思いやり", description: "気配りがあり支えてくれる" },
    { value: "energetic", label: "エネルギッシュ", description: "活動的で情熱的な" },
  ];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">性格プリセット</label>
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => (
          <Button
            key={option.value}
            variant={selected === option.value ? "default" : "outline"}
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={cn(
              "h-auto flex-col items-start p-4",
              selected === option.value && "ring-2 ring-primary"
            )}
          >
            <span className="font-semibold">{option.label}</span>
            <span className="text-xs text-muted-foreground">{option.description}</span>
          </Button>
        ))}
      </div>
    </div>
  );
});

interface AvatarPreviewProps {
  avatarUrls: AvatarUrls | null;
  isGenerating: boolean;
  progress: number;
  total: number;
  currentEmotion?: AvatarEmotion;
}

const AvatarPreview = memo(function AvatarPreview({
  avatarUrls,
  isGenerating,
  progress,
  total,
  currentEmotion,
}: AvatarPreviewProps) {
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="size-24 rounded-full bg-muted flex items-center justify-center">
          <span className="text-2xl">🎨</span>
        </div>
        <div className="w-full max-w-xs space-y-2">
          <Progress value={(progress / total) * 100} />
          <p className="text-sm text-center text-muted-foreground">
            {currentEmotion
              ? `表情を生成中: ${EMOTION_LABELS[currentEmotion]}`
              : "生成準備中..."}
          </p>
          <p className="text-xs text-center text-muted-foreground">
            {progress} / {total}
          </p>
        </div>
      </div>
    );
  }

  if (!avatarUrls) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="size-24 rounded-full bg-muted flex items-center justify-center">
          <span className="text-3xl text-muted-foreground">?</span>
        </div>
        <p className="text-sm text-muted-foreground">
          アバターがまだ生成されていません
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Avatar className="size-24">
          <AvatarImage src={avatarUrls.neutral} alt="AI Avatar" />
          <AvatarFallback>AI</AvatarFallback>
        </Avatar>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-center">表情プレビュー</p>
        <div className="flex justify-center gap-2 flex-wrap">
          {AVATAR_EMOTIONS.map((emotion) => (
            <div key={emotion} className="flex flex-col items-center gap-1">
              <Avatar className="size-12">
                <AvatarImage src={avatarUrls[emotion]} alt={emotion} />
                <AvatarFallback>{emotion[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">
                {EMOTION_LABELS[emotion]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ===== Main View =====

export const AvatarSettingsView = memo(function AvatarSettingsView({
  viewModel,
  interactions,
  isLoading,
  error,
}: AvatarSettingsViewProps) {
  const {
    gender,
    personalityPreset,
    isGenerated,
    generationStatus,
    generationProgress,
    avatarUrls,
  } = viewModel;

  const isGenerating = generationStatus === "generating";
  const canGenerate = gender !== null && personalityPreset !== null && !isGenerating;

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AIメンターアバター設定</CardTitle>
          <CardDescription>
            自分だけのAIメンターアバターを生成しましょう。生成されたアバターはチャット中にAIの感情に応じて表情が変わります。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* アバタープレビュー */}
          <AvatarPreview
            avatarUrls={avatarUrls}
            isGenerating={isGenerating}
            progress={generationProgress}
            total={AVATAR_EMOTIONS.length}
            currentEmotion={
              isGenerating && generationProgress < AVATAR_EMOTIONS.length
                ? AVATAR_EMOTIONS[generationProgress]
                : undefined
            }
          />

          {/* 設定フォーム */}
          {!isGenerated && (
            <>
              <GenderSelector
                selected={gender}
                onChange={interactions.onGenderChange}
                disabled={isGenerating || isLoading}
              />

              <PersonalitySelector
                selected={personalityPreset}
                onChange={interactions.onPersonalityChange}
                disabled={isGenerating || isLoading}
              />
            </>
          )}

          {/* アクションボタン */}
          <div className="flex gap-3 pt-4">
            {!isGenerated ? (
              <Button
                onClick={interactions.onGenerate}
                disabled={!canGenerate || isLoading}
                className="flex-1"
              >
                {isGenerating ? "生成中..." : "アバターを生成する"}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={interactions.onRegenerate}
                  disabled={isGenerating || isLoading}
                  className="flex-1"
                >
                  再生成
                </Button>
                <Button
                  onClick={interactions.onNavigateToChat}
                  className="flex-1"
                >
                  チャットを開始
                </Button>
              </>
            )}
          </div>

          {!isGenerated && (
            <p className="text-xs text-muted-foreground text-center">
              ※ 生成には約30秒かかります
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

export default AvatarSettingsView;
