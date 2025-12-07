/**
 * MentorStudentChat UseCase
 *
 * メンター用学生チャット詳細のビジネスロジック
 */

import type { UseCaseResult } from "./models";
import type {
  MentorChatBootstrapData,
  CreateFeedbackInput,
  CreateFeedbackResult,
} from "./ports/MentorStudentChatPort";

// ============================================
// Port インターフェース
// ============================================

export interface MentorStudentChatUseCasePort {
  fetchChatDetail(): Promise<MentorChatBootstrapData>;
  createFeedback(input: CreateFeedbackInput): Promise<CreateFeedbackResult>;
}

// ============================================
// UseCase クラス
// ============================================

export class MentorStudentChatUseCase {
  constructor(private readonly port: MentorStudentChatUseCasePort) {}

  /**
   * チャット詳細データ取得
   */
  async fetchChatDetail(): Promise<UseCaseResult<MentorChatBootstrapData>> {
    try {
      const data = await this.port.fetchChatDetail();
      return { kind: "success", value: data };
    } catch (error) {
      return {
        kind: "failure",
        error: {
          kind: "ExternalServiceError",
          message: error instanceof Error ? error.message : "チャット詳細の取得に失敗しました",
        },
      };
    }
  }

  /**
   * フィードバック作成/更新
   */
  async createFeedback(
    input: CreateFeedbackInput
  ): Promise<UseCaseResult<CreateFeedbackResult>> {
    // バリデーション
    const trimmedContent = input.content.trim();
    if (!trimmedContent) {
      return {
        kind: "failure",
        error: {
          kind: "ValidationError",
          message: "フィードバック内容を入力してください。",
        },
      };
    }

    if (!input.messageId) {
      return {
        kind: "failure",
        error: {
          kind: "ValidationError",
          message: "メッセージIDが指定されていません。",
        },
      };
    }

    try {
      const result = await this.port.createFeedback({
        ...input,
        content: trimmedContent,
      });
      return { kind: "success", value: result };
    } catch (error) {
      return {
        kind: "failure",
        error: {
          kind: "ExternalServiceError",
          message: error instanceof Error ? error.message : "フィードバックの送信に失敗しました",
        },
      };
    }
  }
}
