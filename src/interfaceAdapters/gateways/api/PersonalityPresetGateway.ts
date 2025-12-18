/**
 * Personality Preset Gateway
 *
 * AI性格プリセット関連のAPI通信を担当
 */

import type { PersonalityPreset } from "../../../domain/core";
import { apiFetch } from "../../../lib/api";

// ============================================
// API Response Types
// ============================================

interface GetPresetsResponse {
  presets: PersonalityPreset[];
}

interface GetUserPresetResponse {
  presetId: string | null;
}

interface UpdateUserPresetResponse {
  message: string;
}

// ============================================
// Gateway Configuration
// ============================================

export interface PersonalityPresetGatewayConfig {
  accessToken?: string;
}

// ============================================
// PersonalityPresetGateway Class
// ============================================

/**
 * PersonalityPresetGateway
 *
 * AI性格プリセット関連のAPI通信を提供
 */
export class PersonalityPresetGateway {
  constructor(private readonly config: PersonalityPresetGatewayConfig = {}) {}

  /**
   * 利用可能な性格プリセット一覧を取得
   */
  async fetchPresets(): Promise<PersonalityPreset[]> {
    const result = await apiFetch<GetPresetsResponse>(
      "/api/personality-presets",
      {
        method: "GET",
        accessToken: this.config.accessToken,
        cacheTtl: 5 * 60 * 1000, // 5分キャッシュ
      }
    );

    if (!result.ok) {
      throw new Error(result.error || "プリセット一覧の取得に失敗しました");
    }

    return result.data?.presets ?? [];
  }

  /**
   * ユーザーの現在の性格プリセット設定を取得
   */
  async fetchUserPreset(): Promise<string | null> {
    const result = await apiFetch<GetUserPresetResponse>(
      "/api/users/personality-preset",
      {
        method: "GET",
        accessToken: this.config.accessToken,
        cacheTtl: 60 * 1000, // 1分キャッシュ
      }
    );

    if (!result.ok) {
      throw new Error(result.error || "プリセット設定の取得に失敗しました");
    }

    return result.data?.presetId ?? null;
  }

  /**
   * ユーザーの性格プリセット設定を更新
   */
  async updateUserPreset(presetId: string | null): Promise<void> {
    const result = await apiFetch<UpdateUserPresetResponse>(
      "/api/users/personality-preset",
      {
        method: "PUT",
        body: { presetId },
        accessToken: this.config.accessToken,
      }
    );

    if (!result.ok) {
      throw new Error(result.error || "プリセット設定の更新に失敗しました");
    }
  }
}
