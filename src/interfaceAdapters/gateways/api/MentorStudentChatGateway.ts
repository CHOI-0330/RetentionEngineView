/**
 * MentorStudentChat API Gateway
 *
 * MentorStudentChatPort 인터페이스 구현
 */

import type {
  MentorStudentChatPort,
  MentorChatBootstrapData,
  CreateFeedbackInput,
  CreateFeedbackResult,
} from "../../../application/entitle/ports/MentorStudentChatPort";
import { apiFetch } from "../../../lib/api";
import { createErrorFromStatus } from "../../errors";

// ============================================
// 型定義
// ============================================

export interface MentorStudentChatGatewayConfig {
  accessToken?: string;
  convId: string;
}

// ============================================
// Gateway クラス
// ============================================

export class MentorStudentChatGateway implements MentorStudentChatPort {
  private accessToken?: string;
  private convId: string;

  constructor(config: MentorStudentChatGatewayConfig) {
    this.accessToken = config.accessToken;
    this.convId = config.convId;
  }

  setAccessToken(token: string | undefined): void {
    this.accessToken = token;
  }

  /**
   * チャット詳細データ取得（会話、メッセージ、フィードバック）
   */
  async fetchChatDetail(): Promise<MentorChatBootstrapData> {
    // apiFetchは { data: T } レスポンスからdataを自動抽出する
    const result = await apiFetch<MentorChatBootstrapData>(
      `/api/entitle/mentor-chat/${encodeURIComponent(this.convId)}`,
      {
        method: "GET",
        accessToken: this.accessToken,
        cacheTtl: 0, // キャッシュなし
      }
    );

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    if (!result.data?.conversation) {
      throw new Error("会話データが取得できませんでした。");
    }

    return result.data;
  }

  /**
   * フィードバック作成/更新
   */
  async createFeedback(input: CreateFeedbackInput): Promise<CreateFeedbackResult> {
    // apiFetchは { data: T } レスポンスからdataを自動抽出する
    const result = await apiFetch<CreateFeedbackResult>(
      `/api/entitle/mentor-chat/${encodeURIComponent(this.convId)}`,
      {
        method: "POST",
        body: {
          messageId: input.messageId,
          content: input.content,
          feedbackId: input.feedbackId,
        },
        accessToken: this.accessToken,
      }
    );

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    if (!result.data?.feedback) {
      throw new Error("フィードバックの作成に失敗しました。");
    }

    return result.data;
  }
}
