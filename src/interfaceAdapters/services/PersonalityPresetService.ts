/**
 * Personality Preset Service
 *
 * 純粋クラス（React非依存）
 * AI性格プリセット関連のビジネスロジックとViewModel変換を担当
 */

import type { PersonalityPreset } from "../../domain/core";
import { PersonalityPresetGateway } from "../gateways/api/PersonalityPresetGateway";

// ============================================
// ViewModel型定義
// ============================================

/**
 * プリセット選択項目のViewModel
 */
export interface PresetOptionViewModel {
  id: string;
  displayName: string;
  description: string;
  sampleDialogue: string;
  isSelected: boolean;
}

/**
 * 性格プリセット設定のViewModel
 */
export interface PersonalityPresetViewModel {
  presets: PresetOptionViewModel[];
  currentPresetId: string | null;
  currentPresetName: string;
  hasSelection: boolean;
  isDefault: boolean;
}

// ============================================
// デフォルト値
// ============================================

const DEFAULT_PRESET_ID = "default_assistant";
const DEFAULT_PRESET_NAME = "標準アシスタント";

// ============================================
// Service Configuration
// ============================================

export interface PersonalityPresetServiceConfig {
  accessToken?: string;
}

// ============================================
// Service Class
// ============================================

/**
 * PersonalityPresetService
 *
 * AI性格プリセット関連のビジネスロジックとViewModel変換を担当
 */
export class PersonalityPresetService {
  private readonly gateway: PersonalityPresetGateway;

  constructor(config: PersonalityPresetServiceConfig = {}) {
    this.gateway = new PersonalityPresetGateway({
      accessToken: config.accessToken,
    });
  }

  /**
   * 利用可能なプリセット一覧を取得
   */
  async fetchPresets(): Promise<PersonalityPreset[]> {
    return this.gateway.fetchPresets();
  }

  /**
   * ユーザーの現在のプリセット設定を取得
   */
  async fetchUserPreset(): Promise<string | null> {
    return this.gateway.fetchUserPreset();
  }

  /**
   * ユーザーのプリセット設定を更新
   */
  async updateUserPreset(presetId: string | null): Promise<void> {
    return this.gateway.updateUserPreset(presetId);
  }

  /**
   * プリセットIDから表示名を取得
   */
  getPresetDisplayName(
    presets: PersonalityPreset[],
    presetId: string | null
  ): string {
    if (!presetId) {
      return DEFAULT_PRESET_NAME;
    }
    const preset = presets.find((p) => p.id === presetId);
    return preset?.displayName ?? DEFAULT_PRESET_NAME;
  }

  /**
   * プリセットデータをViewModelに変換
   */
  toViewModel(
    presets: PersonalityPreset[],
    currentPresetId: string | null
  ): PersonalityPresetViewModel {
    // プリセットオプションを生成
    const presetOptions: PresetOptionViewModel[] = presets.map((preset) => ({
      id: preset.id,
      displayName: preset.displayName,
      description: preset.description,
      sampleDialogue: preset.sampleDialogue,
      isSelected: preset.id === currentPresetId,
    }));

    // 現在のプリセット名を取得
    const currentPresetName = this.getPresetDisplayName(presets, currentPresetId);

    // デフォルトかどうかを判定
    const isDefault = currentPresetId === null || currentPresetId === DEFAULT_PRESET_ID;

    return {
      presets: presetOptions,
      currentPresetId,
      currentPresetName,
      hasSelection: currentPresetId !== null,
      isDefault,
    };
  }

  /**
   * デフォルトプリセットIDを取得
   */
  getDefaultPresetId(): string {
    return DEFAULT_PRESET_ID;
  }

  /**
   * デフォルトプリセット名を取得
   */
  getDefaultPresetName(): string {
    return DEFAULT_PRESET_NAME;
  }
}
