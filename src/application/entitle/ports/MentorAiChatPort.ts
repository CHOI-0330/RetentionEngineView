/**
 * MentorAiChat Port Interface
 *
 * メンター用AI対話に関するPort定義
 * Gateway層が実装すべきインターフェース
 */

import type { Conversation, Message, MessageSources } from "../../../domain/core";
import type { LLMGenerateResponse } from "../../../interfaceAdapters/gateways/api/types";

/**
 * MentorAiChatPort
 *
 * メンターがAIと対話する操作を定義するポート
 */
export interface MentorAiChatPort {
  // ── 会話管理 ──

  /**
   * メンターAI会話一覧を取得
   */
  listConversations(): Promise<Conversation[]>;

  /**
   * メンターAI会話を作成
   */
  createConversation(input: { title: string }): Promise<Conversation>;

  /**
   * メンターAI会話を削除
   */
  deleteConversation(convId: string): Promise<void>;

  // ── メッセージ管理 ──

  /**
   * 会話のメッセージ一覧を取得
   */
  listMessages(input: {
    convId: string;
    cursor?: string;
    limit?: number;
  }): Promise<{
    items: Message[];
    nextCursor?: string;
    lastSeqNo?: number;
  }>;

  /**
   * メンターのユーザーメッセージを作成
   */
  createUserMessage(input: {
    convId: string;
    authorId: string;
    content: string;
  }): Promise<Message>;

  /**
   * アシスタントメッセージを開始（Draft状態）
   */
  beginAssistantMessage(convId: string): Promise<Message>;

  /**
   * アシスタントメッセージを完成
   */
  finalizeAssistantMessage(input: {
    msgId: string;
    finalText: string;
    convId?: string;
    sources?: MessageSources;
  }): Promise<Message>;

  // ── LLM生成 ──

  /**
   * メンター用LLM応答を生成
   */
  generateMentorResponse(input: {
    question: string;
    conversationId: string;
  }): Promise<LLMGenerateResponse>;
}
