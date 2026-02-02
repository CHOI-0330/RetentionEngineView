/**
 * MentorAiChat API Gateway
 *
 * MentorAiChatPort インターフェース実装
 * BFF Route (/api/entitle/mentor-ai-chat) を通じてバックエンドと通信
 */

import type { Conversation, Message, MessageSources } from "../../../domain/core";
import type { MentorAiChatPort } from "../../../application/entitle/ports/MentorAiChatPort";
import type { LLMGenerateResponse } from "./types";
import { apiFetch } from "../../../lib/api";
import { createErrorFromStatus } from "../../errors";

// ============================================
// 型定義
// ============================================

export interface MentorAiChatGatewayConfig {
  accessToken?: string;
  mentorId: string;
}

type MentorAiChatAction =
  | "listConversations"
  | "createConversation"
  | "deleteConversation"
  | "listMessages"
  | "createUserMessage"
  | "beginAssistantMessage"
  | "finalizeAssistantMessage";

// ============================================
// Gateway クラス
// ============================================

export class MentorAiChatGateway implements MentorAiChatPort {
  private accessToken?: string;
  private mentorId: string;

  constructor(config: MentorAiChatGatewayConfig) {
    this.accessToken = config.accessToken;
    this.mentorId = config.mentorId;
  }

  setAccessToken(token: string | undefined): void {
    this.accessToken = token;
  }

  // ============================================
  // 内部ヘルパー
  // ============================================

  private async callAction<T>(action: MentorAiChatAction, payload?: unknown): Promise<T> {
    const result = await apiFetch<T>("/api/entitle/mentor-ai-chat", {
      method: "POST",
      body: { action, payload },
      accessToken: this.accessToken,
    });

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    return result.data;
  }

  // ============================================
  // 会話操作
  // ============================================

  async listConversations(): Promise<Conversation[]> {
    const data = await this.callAction<Conversation[]>("listConversations");
    return data;
  }

  async createConversation(input: { title: string }): Promise<Conversation> {
    const data = await this.callAction<Conversation>("createConversation", {
      title: input.title,
    });
    return data;
  }

  async deleteConversation(convId: string): Promise<void> {
    await this.callAction<void>("deleteConversation", { convId });
  }

  // ============================================
  // メッセージ操作
  // ============================================

  async listMessages(input: {
    convId: string;
    cursor?: string;
    limit?: number;
  }): Promise<{ items: Message[]; nextCursor?: string; lastSeqNo?: number }> {
    const data = await this.callAction<{
      items: Message[];
      nextCursor?: string;
      lastSeqNo?: number;
    }>("listMessages", input);
    return data;
  }

  async createUserMessage(input: {
    convId: string;
    authorId: string;
    content: string;
  }): Promise<Message> {
    const data = await this.callAction<Message>("createUserMessage", input);
    return data;
  }

  /**
   * アシスタントメッセージを開始（クライアント側でDraft生成）
   */
  async beginAssistantMessage(convId: string): Promise<Message> {
    // StudentChatと同じパターン: クライアント側でDraft生成
    const tempMsg: Message = {
      msgId: crypto.randomUUID(),
      convId,
      role: "ASSISTANT",
      content: "",
      status: "DRAFT",
      createdAt: new Date().toISOString(),
    };
    return tempMsg;
  }

  /**
   * アシスタントメッセージを完成（サーバーに保存）
   */
  async finalizeAssistantMessage(input: {
    msgId: string;
    finalText: string;
    convId?: string;
    sources?: MessageSources;
  }): Promise<Message> {
    const data = await this.callAction<Message>("finalizeAssistantMessage", {
      convId: input.convId,
      content: input.finalText,
      sources: input.sources,
    });
    return data;
  }

  // ============================================
  // LLM操作
  // ============================================

  async generateMentorResponse(input: {
    question: string;
    conversationId: string;
  }): Promise<LLMGenerateResponse> {
    const result = await apiFetch<LLMGenerateResponse>("/api/llm/mentor/generate", {
      method: "POST",
      body: {
        question: input.question,
        conversationId: input.conversationId,
      },
      accessToken: this.accessToken,
    });

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    return result.data;
  }
}
