/**
 * AvatarSettings Service
 *
 * 純粋クラス（React非依存）
 * Gateway経由でアバター設定を管理し、ViewModelに変換
 */

import type { AvatarGateway, AvatarSettings, AvatarStatusResponse } from "../gateways/api/AvatarGateway";
import type { AvatarGender, AvatarPersonality, AvatarGenerationStatus, AvatarUrls } from "../../domain/core";

// ============================================
// ViewModel型定義
// ============================================

export interface AvatarSettingsViewModel {
  gender: AvatarGender | null;
  personalityPreset: AvatarPersonality | null;
  isGenerated: boolean;
  generationStatus: AvatarGenerationStatus;
  generationProgress: number;
  avatarUrls: AvatarUrls | null;
  // ヘルパー
  canGenerate: boolean;
  isGenerating: boolean;
  progressPercentage: number;
}

// ============================================
// Service クラス
// ============================================

export class AvatarSettingsService {
  constructor(private readonly gateway: AvatarGateway) {}

  /**
   * アバター設定を取得
   */
  async fetchSettings(): Promise<AvatarSettings> {
    return this.gateway.fetchSettings();
  }

  /**
   * アバター設定を更新
   */
  async updateSettings(gender: AvatarGender, personalityPreset: AvatarPersonality): Promise<void> {
    return this.gateway.updateSettings({ gender, personalityPreset });
  }

  /**
   * アバター生成状態を取得
   */
  async fetchStatus(): Promise<AvatarStatusResponse> {
    return this.gateway.fetchStatus();
  }

  /**
   * アバター生成を開始
   */
  async startGeneration(): Promise<void> {
    return this.gateway.startGeneration();
  }

  /**
   * AvatarSettingsをViewModelに変換
   */
  toViewModel(settings: AvatarSettings): AvatarSettingsViewModel {
    const isGenerating = settings.generationStatus === "generating";
    const canGenerate =
      settings.gender !== null &&
      settings.personalityPreset !== null &&
      !isGenerating;

    // 進捗率計算（全7表情）
    const totalEmotions = 7;
    const progressPercentage = totalEmotions > 0
      ? Math.round((settings.generationProgress / totalEmotions) * 100)
      : 0;

    return {
      gender: settings.gender,
      personalityPreset: settings.personalityPreset,
      isGenerated: settings.isGenerated,
      generationStatus: settings.generationStatus,
      generationProgress: settings.generationProgress,
      avatarUrls: settings.avatarUrls,
      canGenerate,
      isGenerating,
      progressPercentage,
    };
  }
}
