/**
 * Conversation UseCase
 *
 * 会話関連のビジネスロジック
 * Port（Gateway）を注入して検証からAPI呼び出しまで一貫して処理
 */

import type { Conversation, User } from "../../domain/core";
import type { UseCaseResult, UseCaseFailureKind } from "./models";
import type { ConversationPort } from "./ports/ConversationPort";

// ============================================
// 定数
// ============================================

const MAX_CONVERSATION_TITLE_LENGTH = 120;

// ============================================
// ヘルパー関数
// ============================================

const success = <T>(value: T): UseCaseResult<T> => ({ kind: "success", value });

const failure = (kind: UseCaseFailureKind, message: string): UseCaseResult<never> => ({
  kind: "failure",
  error: { kind, message },
});

// ============================================
// UseCase クラス
// ============================================

/**
 * Conversation UseCaseクラス
 *
 * 会話の作成/削除/一覧取得を担当
 */
export class ConversationUseCase {
  constructor(private readonly port: ConversationPort) {}

  /**
   * 会話作成
   */
  async create(args: {
    requester: Pick<User, "userId" | "role">;
    title: string;
    mentorId?: string | null;
    allowedMentorIds: string[];
  }): Promise<UseCaseResult<Conversation>> {
    // 検証: 権限（NEW_HIREのみ作成可能）
    if (args.requester.role !== "NEW_HIRE") {
      return failure("Forbidden", "Only new hires can create conversations.");
    }

    // 検証: タイトル空
    const title = args.title.trim();
    if (title.length === 0) {
      return failure("ValidationError", "Conversation title must not be empty.");
    }

    // 検証: タイトル長
    if (title.length > MAX_CONVERSATION_TITLE_LENGTH) {
      return failure(
        "ValidationError",
        `Conversation title must be ${MAX_CONVERSATION_TITLE_LENGTH} characters or fewer.`
      );
    }

    // 検証: メンター選択
    const mentorId = args.mentorId ?? null;
    if (args.allowedMentorIds.length > 0) {
      if (!mentorId) {
        return failure("ValidationError", "A mentor must be selected for this conversation.");
      }
      if (!args.allowedMentorIds.includes(mentorId)) {
        return failure("ValidationError", "Selected mentor is not available.");
      }
    } else if (mentorId) {
      return failure("ValidationError", "Mentor cannot be selected for this conversation.");
    }

    // API呼び出し
    try {
      const conversation = await this.port.createConversation({
        title,
        mentorId,
      });
      return success(conversation);
    } catch (error) {
      return failure(
        "ValidationError",
        error instanceof Error ? error.message : "Failed to create conversation."
      );
    }
  }

  /**
   * 会話削除
   */
  async delete(args: {
    requester: Pick<User, "userId" | "role">;
    conversation: Conversation;
  }): Promise<UseCaseResult<void>> {
    // 検証: 権限（オーナーのみ削除可能）
    if (args.requester.userId !== args.conversation.ownerId) {
      return failure("Forbidden", "Only the owner can delete this conversation.");
    }

    // API呼び出し
    try {
      await this.port.deleteConversation(args.conversation.convId);
      return success(undefined);
    } catch (error) {
      return failure(
        "ValidationError",
        error instanceof Error ? error.message : "Failed to delete conversation."
      );
    }
  }

  /**
   * 会話一覧取得
   */
  async list(args: {
    requester: Pick<User, "userId" | "role">;
  }): Promise<UseCaseResult<Conversation[]>> {
    // 検証: 権限（NEW_HIREのみ取得可能）
    if (args.requester.role !== "NEW_HIRE") {
      return failure("Forbidden", "Only new hires can list conversations.");
    }

    // API呼び出し
    try {
      const conversations = await this.port.listConversations();
      return success(conversations);
    } catch (error) {
      return failure(
        "ValidationError",
        error instanceof Error ? error.message : "Failed to list conversations."
      );
    }
  }
}
