/**
 * StudentDashboard UseCase (クラスラッパー)
 *
 * 学生ダッシュボード関連のビジネスロジック
 * Factoryでの依存性注入のために使用
 */

import type { UseCaseResult } from "./models";
import type { ConversationListItem } from "./ports/StudentDashboardPort";

/**
 * StudentDashboard UseCase用ポート
 */
export interface StudentDashboardUseCasePort {
  listConversations(): Promise<ConversationListItem[]>;
  createConversation(title: string): Promise<{ convId: string }>;
  deleteConversation(convId: string): Promise<void>;
}

/**
 * StudentDashboard UseCaseクラス
 *
 * 会話リスト取得、会話作成、会話削除を担当
 */
export class StudentDashboardUseCase {
  constructor(private readonly port: StudentDashboardUseCasePort) {}

  /**
   * 会話一覧取得
   */
  async listConversations(): Promise<UseCaseResult<ConversationListItem[]>> {
    try {
      const conversations = await this.port.listConversations();
      return { kind: "success", value: conversations };
    } catch (error) {
      return {
        kind: "failure",
        error: {
          kind: "ExternalServiceError",
          message: error instanceof Error ? error.message : "会話リストの取得に失敗しました",
        },
      };
    }
  }

  /**
   * 新規会話作成
   */
  async createConversation(args: {
    title: string;
  }): Promise<UseCaseResult<{ convId: string }>> {
    // タイトル検証
    if (!args.title || args.title.trim().length === 0) {
      return {
        kind: "failure",
        error: {
          kind: "ValidationError",
          message: "会話タイトルは必須です",
        },
      };
    }

    if (args.title.length > 200) {
      return {
        kind: "failure",
        error: {
          kind: "ValidationError",
          message: "会話タイトルは200文字以内で入力してください",
        },
      };
    }

    try {
      const result = await this.port.createConversation(args.title.trim());
      return { kind: "success", value: result };
    } catch (error) {
      return {
        kind: "failure",
        error: {
          kind: "ExternalServiceError",
          message: error instanceof Error ? error.message : "会話の作成に失敗しました",
        },
      };
    }
  }

  /**
   * 会話削除
   */
  async deleteConversation(args: {
    convId: string;
  }): Promise<UseCaseResult<void>> {
    // ID検証
    if (!args.convId || args.convId.trim().length === 0) {
      return {
        kind: "failure",
        error: {
          kind: "ValidationError",
          message: "会話IDが不正です",
        },
      };
    }

    try {
      await this.port.deleteConversation(args.convId);
      return { kind: "success", value: undefined };
    } catch (error) {
      return {
        kind: "failure",
        error: {
          kind: "ExternalServiceError",
          message: error instanceof Error ? error.message : "会話の削除に失敗しました",
        },
      };
    }
  }
}
