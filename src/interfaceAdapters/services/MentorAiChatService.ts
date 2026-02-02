/**
 * MentorAiChat Service
 *
 * 純粋クラス（React非依存）
 * UseCaseを組み合わせてMentorAiChat機能を提供
 * ViewModelへの変換も担当
 */

import type { Conversation, Message, MessageSources } from "../../domain/core";
import type { UseCaseResult } from "../../application/entitle/models";
import type { MentorAiChatUseCase } from "../../application/entitle/MentorAiChatUseCase";
import type { LLMGenerateResponse } from "../gateways/api/types";

// ============================================
// ViewModel型定義
// ============================================

export interface MentorAiConversationViewModel {
  convId: string;
  title: string;
  createdAt: string;
  isActive: boolean;
}

export interface MentorAiMessageViewModel {
  msgId: string;
  content: string;
  role: "user" | "assistant";
  status: "draft" | "partial" | "done" | "cancelled";
  createdAt: string;
  sources?: MessageSources;
}

export interface MentorAiChatViewModel {
  conversations: MentorAiConversationViewModel[];
  conversation: Conversation | null;
  messages: MentorAiMessageViewModel[];
}

// ============================================
// Service クラス
// ============================================

export class MentorAiChatService {
  constructor(private readonly useCase: MentorAiChatUseCase) {}

  // ============================================
  // 会話操作
  // ============================================

  async listConversations(): Promise<UseCaseResult<Conversation[]>> {
    return this.useCase.listConversations();
  }

  async createConversation(title: string): Promise<UseCaseResult<Conversation>> {
    return this.useCase.createConversation(title);
  }

  async deleteConversation(convId: string): Promise<UseCaseResult<void>> {
    return this.useCase.deleteConversation(convId);
  }

  // ============================================
  // メッセージ操作
  // ============================================

  async listMessages(
    convId: string,
    cursor?: string,
    limit?: number,
  ): Promise<UseCaseResult<{ items: Message[]; nextCursor?: string; lastSeqNo?: number }>> {
    return this.useCase.listMessages(convId, cursor, limit);
  }

  async sendMessage(
    convId: string,
    authorId: string,
    content: string,
  ): Promise<UseCaseResult<Message>> {
    return this.useCase.createUserMessage(convId, authorId, content);
  }

  async beginAssistantMessage(convId: string): Promise<UseCaseResult<Message>> {
    return this.useCase.beginAssistantMessage(convId);
  }

  async finalizeAssistantMessage(
    msgId: string,
    finalText: string,
    convId?: string,
    sources?: MessageSources,
  ): Promise<UseCaseResult<Message>> {
    return this.useCase.finalizeAssistantMessage({ msgId, finalText, convId, sources });
  }

  // ============================================
  // LLM操作
  // ============================================

  async generateResponse(
    question: string,
    conversationId: string,
  ): Promise<UseCaseResult<LLMGenerateResponse>> {
    return this.useCase.generateResponse(question, conversationId);
  }

  // ============================================
  // ViewModel変換
  // ============================================

  toMessageViewModel(msg: Message): MentorAiMessageViewModel {
    return {
      msgId: msg.msgId,
      content: msg.content,
      role: msg.role === "MENTOR" ? "user" : "assistant",
      status: this.mapMessageStatus(msg.status),
      createdAt: msg.createdAt,
      sources: msg.sources,
    };
  }

  toMessageViewModels(messages: Message[]): MentorAiMessageViewModel[] {
    return messages.map((m) => this.toMessageViewModel(m));
  }

  toConversationViewModels(
    conversations: Conversation[],
    activeConvId?: string,
  ): MentorAiConversationViewModel[] {
    return conversations.map((c) => ({
      convId: c.convId,
      title: c.title,
      createdAt: c.createdAt,
      isActive: c.convId === activeConvId,
    }));
  }

  private mapMessageStatus(
    status: Message["status"],
  ): MentorAiMessageViewModel["status"] {
    if (!status) return "done";

    const statusMap: Record<NonNullable<Message["status"]>, MentorAiMessageViewModel["status"]> = {
      DRAFT: "draft",
      PARTIAL: "partial",
      DONE: "done",
      CANCELLED: "cancelled",
    };
    return statusMap[status];
  }
}
