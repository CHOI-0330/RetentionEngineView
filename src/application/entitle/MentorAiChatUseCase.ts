/**
 * MentorAiChat UseCase
 *
 * メンター用AI対話のビジネスロジック
 */

import type { Conversation, Message, MessageSources } from "../../domain/core";
import type { UseCaseResult, UseCaseFailureKind } from "./models";
import type { MentorAiChatPort } from "./ports/MentorAiChatPort";
import type { LLMGenerateResponse, SSEEvent } from "../../interfaceAdapters/gateways/api/types";

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

export class MentorAiChatUseCase {
  constructor(private readonly port: MentorAiChatPort) {}

  /**
   * メンターAI会話一覧を取得
   */
  async listConversations(): Promise<UseCaseResult<Conversation[]>> {
    try {
      const conversations = await this.port.listConversations();
      return success(conversations);
    } catch (error) {
      return failure(
        "ExternalServiceError",
        error instanceof Error ? error.message : "会話一覧の取得に失敗しました。",
      );
    }
  }

  /**
   * メンターAI会話を作成
   */
  async createConversation(title: string): Promise<UseCaseResult<Conversation>> {
    const trimmed = title.trim();
    if (!trimmed) {
      return failure("ValidationError", "会話タイトルを入力してください。");
    }
    if (trimmed.length > MAX_CONVERSATION_TITLE_LENGTH) {
      return failure(
        "ValidationError",
        `タイトルは${MAX_CONVERSATION_TITLE_LENGTH}文字以内で入力してください。`,
      );
    }

    try {
      const conversation = await this.port.createConversation({ title: trimmed });
      return success(conversation);
    } catch (error) {
      return failure(
        "ExternalServiceError",
        error instanceof Error ? error.message : "会話の作成に失敗しました。",
      );
    }
  }

  /**
   * メンターAI会話を削除
   */
  async deleteConversation(convId: string): Promise<UseCaseResult<void>> {
    if (!convId?.trim()) {
      return failure("ValidationError", "会話IDが指定されていません。");
    }

    try {
      await this.port.deleteConversation(convId);
      return success(undefined);
    } catch (error) {
      return failure(
        "ExternalServiceError",
        error instanceof Error ? error.message : "会話の削除に失敗しました。",
      );
    }
  }

  /**
   * メッセージ一覧を取得
   */
  async listMessages(convId: string, cursor?: string, limit?: number): Promise<
    UseCaseResult<{ items: Message[]; nextCursor?: string; lastSeqNo?: number }>
  > {
    try {
      const result = await this.port.listMessages({ convId, cursor, limit });
      return success(result);
    } catch (error) {
      return failure(
        "ExternalServiceError",
        error instanceof Error ? error.message : "メッセージの取得に失敗しました。",
      );
    }
  }

  /**
   * ユーザーメッセージを作成
   */
  async createUserMessage(convId: string, authorId: string, content: string): Promise<UseCaseResult<Message>> {
    const trimmed = content.trim();
    if (!trimmed) {
      return failure("ValidationError", "メッセージを入力してください。");
    }

    try {
      const message = await this.port.createUserMessage({ convId, authorId, content: trimmed });
      return success(message);
    } catch (error) {
      return failure(
        "ExternalServiceError",
        error instanceof Error ? error.message : "メッセージの送信に失敗しました。",
      );
    }
  }

  /**
   * アシスタントメッセージを開始（Draft状態）
   */
  async beginAssistantMessage(convId: string): Promise<UseCaseResult<Message>> {
    try {
      const message = await this.port.beginAssistantMessage(convId);
      return success(message);
    } catch (error) {
      return failure(
        "ExternalServiceError",
        error instanceof Error ? error.message : "アシスタントメッセージの開始に失敗しました。",
      );
    }
  }

  /**
   * アシスタントメッセージを完成
   */
  async finalizeAssistantMessage(input: {
    msgId: string;
    finalText: string;
    convId?: string;
    sources?: MessageSources;
  }): Promise<UseCaseResult<Message>> {
    try {
      const message = await this.port.finalizeAssistantMessage(input);
      return success(message);
    } catch (error) {
      return failure(
        "ExternalServiceError",
        error instanceof Error ? error.message : "アシスタントメッセージの完了に失敗しました。",
      );
    }
  }

  /**
   * メンター用LLM応答を生成
   */
  async generateResponse(
    question: string,
    conversationId: string,
  ): Promise<UseCaseResult<LLMGenerateResponse>> {
    const trimmed = question.trim();
    if (!trimmed) {
      return failure("ValidationError", "質問を入力してください。");
    }

    try {
      const response = await this.port.generateMentorResponse({
        question: trimmed,
        conversationId,
      });
      return success(response);
    } catch (error) {
      return failure(
        "ExternalServiceError",
        error instanceof Error ? error.message : "AI応答の生成に失敗しました。",
      );
    }
  }

  /**
   * メンター用LLM応答をストリーミングで生成
   * SSEイベントをコールバックで受信
   */
  async generateResponseStream(
    input: {
      question: string;
      conversationId: string;
    },
    onEvent: (event: SSEEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const trimmed = input.question.trim();
    if (!trimmed) {
      throw new Error("質問を入力してください。");
    }

    return this.port.generateMentorResponseStream(
      {
        question: trimmed,
        conversationId: input.conversationId,
      },
      onEvent,
      signal,
    );
  }
}
