/**
 * Profile Gateway
 *
 * ProfilePort 인터페이스 구현
 * API通信を担当
 */

import type { MbtiType } from "../../../domain/mbti.types";
import type { ProfilePort } from "../../../application/entitle/ports/ProfilePort";
import { apiFetch } from "../../../lib/api";

// ============================================
// API Response Types
// ============================================

interface GetMbtiResponse {
  mbti: MbtiType | null;
}

interface UpdateMbtiResponse {
  ok: boolean;
}

// ============================================
// Gateway Configuration
// ============================================

export interface ProfileGatewayConfig {
  accessToken?: string;
}

// ============================================
// ProfileGateway Class
// ============================================

/**
 * ProfileGateway
 *
 * UseCasePortを実装し、MBTI関連のAPI通信を提供
 */
export class ProfileGateway implements ProfilePort {
  constructor(private readonly config: ProfileGatewayConfig = {}) {}

  /**
   * ユーザーのMBTIを取得
   */
  async fetchMbti(userId: string): Promise<MbtiType | null> {
    const params = new URLSearchParams({ userId });
    const result = await apiFetch<GetMbtiResponse>(
      `/api/mbti?${params.toString()}`,
      {
        method: "GET",
        accessToken: this.config.accessToken,
        cacheTtl: 60 * 1000, // 1分キャッシュ
      }
    );

    if (!result.ok) {
      throw new Error(result.error || "MBTIの取得に失敗しました");
    }

    return result.data?.mbti ?? null;
  }

  /**
   * ユーザーのMBTIを更新
   */
  async updateMbti(userId: string, mbti: MbtiType): Promise<void> {
    const result = await apiFetch<UpdateMbtiResponse>("/api/mbti", {
      method: "PUT",
      body: { userId, mbti },
      accessToken: this.config.accessToken,
    });

    if (!result.ok) {
      throw new Error(result.error || "MBTIの更新に失敗しました");
    }
  }
}
