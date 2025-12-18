"use client";

import React, { memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { cn } from "../components/ui/utils";
import type { PersonalityPresetViewModel } from "../interfaceAdapters/services/PersonalityPresetService";

// ===== Types =====

export interface PersonalityPresetSelectorProps {
  viewModel: PersonalityPresetViewModel;
  onSelectPreset: (presetId: string) => void;
  onResetToDefault: () => void;
  onDismissError?: () => void;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  disabled?: boolean;
}

// ===== Loading Skeleton =====

const LoadingSkeleton = memo(function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-32" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    </div>
  );
});

// ===== Main Component =====

export const PersonalityPresetSelector = memo(function PersonalityPresetSelector({
  viewModel,
  onSelectPreset,
  onResetToDefault,
  onDismissError,
  isLoading,
  isSaving,
  error,
  disabled = false,
}: PersonalityPresetSelectorProps) {
  const { presets, currentPresetId, currentPresetName, isDefault } = viewModel;

  const isDisabled = disabled || isSaving;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AIの性格設定</CardTitle>
          <CardDescription>読み込み中...</CardDescription>
        </CardHeader>
        <CardContent>
          <LoadingSkeleton />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AIの性格設定</CardTitle>
        <CardDescription>
          AIメンターのコミュニケーションスタイルを選択できます。
          選択した性格によって、AIの口調や説明の深さが変わります。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* エラー表示 */}
        {error && (
          <div
            className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm flex items-center justify-between"
            role="alert"
          >
            <span>{error}</span>
            {onDismissError && (
              <button
                type="button"
                onClick={onDismissError}
                className="ml-2 p-1 hover:bg-destructive/20 rounded transition-colors"
                aria-label="エラーを閉じる"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* 現在の設定表示 */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">現在の設定</p>
            <p className="font-medium">{currentPresetName}</p>
          </div>
          {!isDefault && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetToDefault}
              disabled={isDisabled}
            >
              デフォルトに戻す
            </Button>
          )}
        </div>

        {/* プリセット選択グリッド */}
        <div className="space-y-3">
          <p className="text-sm font-medium">性格を選択</p>
          <div className="space-y-3">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset.id)}
                disabled={isDisabled || preset.isSelected}
                className={cn(
                  "w-full text-left p-4 rounded-lg border-2 transition-all",
                  "hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-100",
                  preset.isSelected
                    ? "border-primary bg-primary/20 shadow-md"
                    : "border-muted bg-card hover:bg-muted/40"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "font-semibold",
                    preset.isSelected ? "text-primary" : "text-foreground"
                  )}>
                    {preset.displayName}
                  </span>
                  {preset.isSelected && (
                    <span className="text-xs font-medium text-primary-foreground bg-primary px-2 py-0.5 rounded">
                      選択中
                    </span>
                  )}
                </div>
                <p className={cn(
                  "text-sm mb-2",
                  preset.isSelected ? "text-foreground" : "text-muted-foreground"
                )}>
                  {preset.description}
                </p>
                <div className={cn(
                  "p-3 rounded-md text-sm italic",
                  preset.isSelected ? "bg-primary/25 text-primary font-medium" : "bg-muted text-muted-foreground"
                )}>
                  「{preset.sampleDialogue}」
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 保存中インジケーター */}
        {isSaving && (
          <p className="text-sm text-muted-foreground text-center">
            設定を保存中...
          </p>
        )}

        {/* 説明 */}
        <p className="text-xs text-muted-foreground">
          ※ 性格の変更は次回のメッセージから反映されます
        </p>
      </CardContent>
    </Card>
  );
});

export default PersonalityPresetSelector;
