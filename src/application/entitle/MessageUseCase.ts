/**
 * Message UseCase
 *
 * メッセージ関連のビジネスロジック
 * Port（Gateway）を注入して検証からAPI呼び出しまで一貫して処理
 */

import type { Conversation, Message, MessageSources, User } from "../../domain/core";
import type { UseCaseResult, UseCaseFailureKind } from "./models";
import type { MessagePort } from "./ports/MessagePort";

// ============================================
// 定数
// ============================================

const MAX_MESSAGE_LENGTH = 4000;

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
 * Message UseCaseクラス
 *
 * メッセージの作成/完了/キャンセル/一覧取得を担当
 */
export class MessageUseCase {
  constructor(private readonly port: MessagePort) {}

  /**
   * ユーザーメッセージ作成
   */
  async createUserMessage(args: {
    user: User;
    conversation: Conversation;
    content: string;
  }): Promise<UseCaseResult<Message>> {
    // 検証: 空メッセージ
    const trimmed = args.content.trim();
    if (trimmed.length === 0) {
      return failure("ValidationError", "Message content must not be empty.");
    }

    // 検証: 最大長
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      return failure("ValidationError", "Message content exceeds the allowed length.");
    }

    // 検証: 権限（会話オーナーのみ投稿可能）
    if (args.user.userId !== args.conversation.ownerId) {
      return failure("Forbidden", "User is not allowed to post in this conversation.");
    }

    // API呼び出し
    try {
      const message = await this.port.createUserMessage({
        convId: args.conversation.convId,
        authorId: args.user.userId,
        content: trimmed,
      });
      return success(message);
    } catch (error) {
      return failure(
        "ValidationError",
        error instanceof Error ? error.message : "Failed to create message."
      );
    }
  }

  /**
   * アシスタントメッセージ開始
   */
  async beginAssistantMessage(args: {
    conversation: Conversation;
    requester: User;
  }): Promise<UseCaseResult<Message>> {
    // 検証: 権限
    if (args.requester.userId !== args.conversation.ownerId) {
      return failure(
        "Forbidden",
        "User is not allowed to request an assistant response for this conversation."
      );
    }

    // API呼び出し
    try {
      const message = await this.port.beginAssistantMessage(args.conversation.convId);
      return success(message);
    } catch (error) {
      return failure(
        "ValidationError",
        error instanceof Error ? error.message : "Failed to begin assistant message."
      );
    }
  }

  /**
   * アシスタントメッセージ完了
   */
  async finalizeAssistantMessage(args: {
    message: Message;
    finalText: string;
    sources?: MessageSources;
  }): Promise<UseCaseResult<Message>> {
    // 検証: ロール
    if (args.message.role !== "ASSISTANT") {
      return failure("ValidationError", "Only ASSISTANT messages can be finalized.");
    }

    // 検証: ステータス
    if (args.message.status === "CANCELLED") {
      return failure("ValidationError", "Cancelled messages cannot be finalized.");
    }

    // 検証: 空テキスト
    const trimmed = args.finalText.trim();
    if (trimmed.length === 0) {
      return failure("ValidationError", "Final text must not be empty.");
    }

    // API呼び出し
    try {
      const result = await this.port.finalizeAssistantMessage({
        msgId: args.message.msgId,
        finalText: trimmed,
        convId: args.message.convId,
        sources: args.sources,
      });
      return success(result);
    } catch (error) {
      return failure(
        "ValidationError",
        error instanceof Error ? error.message : "Failed to finalize assistant message."
      );
    }
  }

  /**
   * アシスタントメッセージキャンセル
   */
  async cancelAssistantMessage(args: {
    message: Message;
  }): Promise<UseCaseResult<Message>> {
    // 検証: ロール
    if (args.message.role !== "ASSISTANT") {
      return failure("ValidationError", "Only ASSISTANT messages can be cancelled.");
    }

    // 検証: ステータス
    if (args.message.status === "DONE") {
      return failure("ValidationError", "Completed messages cannot be cancelled.");
    }

    // API呼び出し
    try {
      const result = await this.port.cancelAssistantMessage(args.message.msgId);
      return success(result);
    } catch (error) {
      return failure(
        "ValidationError",
        error instanceof Error ? error.message : "Failed to cancel assistant message."
      );
    }
  }

  /**
   * メッセージ一覧取得
   */
  async listMessages(args: {
    requester: User;
    conversation: Conversation;
    cursor?: string;
    limit?: number;
  }): Promise<UseCaseResult<{ items: Message[]; nextCursor?: string; lastSeqNo?: number }>> {
    // 検証: 権限（オーナーのみ）
    if (args.requester.userId !== args.conversation.ownerId) {
      return failure("Forbidden", "User is not allowed to read this conversation.");
    }

    // API呼び出し
    try {
      const result = await this.port.listConversationMessages({
        convId: args.conversation.convId,
        cursor: args.cursor,
        limit: args.limit,
      });
      return success(result);
    } catch (error) {
      return failure(
        "ValidationError",
        error instanceof Error ? error.message : "Failed to list messages."
      );
    }
  }
}
