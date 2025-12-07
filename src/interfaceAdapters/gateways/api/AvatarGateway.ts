/**
 * Avatar API Gateway
 *
 * アバター設定と生成に関するAPI呼び出しを統合管理します。
 */

import type { AvatarUrls, AvatarGenerationStatus } from "../../../domain/core";
import { apiFetch } from "../../../lib/api";
import { createErrorFromStatus } from "../../errors";

// API応答のステータスをドメインのステータスにマッピング
type ApiGenerationStatus = "idle" | "generating" | "completed" | "failed";
const mapApiStatusToDomain = (status: ApiGenerationStatus): AvatarGenerationStatus => {
  if (status === "idle") return "pending";
  return status;
};

export interface AvatarGatewayConfig {
  accessToken?: string;
}

/**
 * アバター設定データ (ドメイン型に変換済み)
 */
export interface AvatarSettings {
  gender: "female" | "male" | "neutral";
  personalityPreset: "friendly" | "professional" | "caring" | "energetic";
  isGenerated: boolean;
  generationStatus: AvatarGenerationStatus;
  generationProgress: number;
  avatarUrls: AvatarUrls | null;
}

/**
 * アバター設定API レスポンス
 */
interface AvatarSettingsResponse {
  settings: {
    gender: "female" | "male" | "neutral";
    personalityPreset: "friendly" | "professional" | "caring" | "energetic";
    isGenerated: boolean;
    generationStatus: "idle" | "generating" | "completed" | "failed";
    generationProgress: number;
  };
  avatarUrls?: AvatarUrls;
}

/**
 * アバター生成状態レスポンス (API形式)
 */
interface AvatarStatusApiResponse {
  status: ApiGenerationStatus;
  progress: number;
  total: number;
}

/**
 * アバター生成状態 (ドメイン型に変換済み)
 */
export interface AvatarStatusResponse {
  status: AvatarGenerationStatus;
  progress: number;
  total: number;
}

/**
 * アバター設定更新リクエスト
 */
export interface UpdateAvatarSettingsRequest {
  gender: "female" | "male" | "neutral";
  personalityPreset: "friendly" | "professional" | "caring" | "energetic";
}

/**
 * Avatar API Gateway
 */
export class AvatarGateway {
  private accessToken?: string;

  constructor(config: AvatarGatewayConfig = {}) {
    this.accessToken = config.accessToken;
  }

  setAccessToken(token: string | undefined): void {
    this.accessToken = token;
  }

  /**
   * アバター設定を取得
   */
  async fetchSettings(): Promise<AvatarSettings> {
    const result = await apiFetch<AvatarSettingsResponse>("/api/avatar/settings", {
      method: "GET",
      accessToken: this.accessToken,
    });

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    const { settings, avatarUrls } = result.data;

    return {
      gender: settings.gender,
      personalityPreset: settings.personalityPreset,
      isGenerated: settings.isGenerated,
      generationStatus: mapApiStatusToDomain(settings.generationStatus),
      generationProgress: settings.generationProgress,
      avatarUrls: avatarUrls ?? null,
    };
  }

  /**
   * アバター設定を更新
   */
  async updateSettings(request: UpdateAvatarSettingsRequest): Promise<void> {
    const result = await apiFetch<unknown>("/api/avatar/settings", {
      method: "POST",
      body: request,
      accessToken: this.accessToken,
    });

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }
  }

  /**
   * アバター生成状態を取得
   */
  async fetchStatus(): Promise<AvatarStatusResponse> {
    const result = await apiFetch<AvatarStatusApiResponse>("/api/avatar/status", {
      method: "GET",
      accessToken: this.accessToken,
    });

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    return {
      status: mapApiStatusToDomain(result.data.status),
      progress: result.data.progress,
      total: result.data.total,
    };
  }

  /**
   * アバター生成を開始
   */
  async startGeneration(): Promise<void> {
    const result = await apiFetch<unknown>("/api/avatar/generate", {
      method: "POST",
      accessToken: this.accessToken,
    });

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }
  }
}
