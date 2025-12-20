/**
 * Message API Gateway
 *
 * MessagePort 인터페이스 구현
 */

import type { Message, MessageSources } from "../../../domain/core";
import type { MessagePort } from "../../../application/entitle/ports";
import { apiFetch } from "../../../lib/api";
import { createErrorFromStatus } from "../../errors";
import type { GatewayConfig } from "./types";

export class MessageGateway implements MessagePort {
  private accessToken?: string;

  constructor(config: GatewayConfig = {}) {
    this.accessToken = config.accessToken;
  }

  setAccessToken(token: string | undefined): void {
    this.accessToken = token;
  }

  private async callApi<T>(action: string, payload?: unknown): Promise<T> {
    const result = await apiFetch<T>("/api/entitle/student-chat", {
      method: "POST",
      body: { action, payload },
      accessToken: this.accessToken,
    });

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    return result.data;
  }

  async createUserMessage(input: {
    convId: string;
    authorId: string;
    content: string;
  }): Promise<Message> {
    return this.callApi<Message>("createUserMessage", {
      convId: input.convId,
      content: input.content,
    });
  }

  async beginAssistantMessage(convId: string): Promise<Message> {
    // 클라이언트에서 임시 메시지 생성 (서버는 finalizeAssistantMessage에서 저장)
    const tempId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `assistant-${Date.now()}`;

    return {
      msgId: tempId,
      convId,
      role: "ASSISTANT",
      content: "",
      status: "DRAFT",
      createdAt: new Date().toISOString(),
    };
  }

  async finalizeAssistantMessage(input: {
    msgId: string;
    finalText: string;
    convId?: string;
    sources?: MessageSources;
  }): Promise<Message> {
    // 서버에 ASSISTANT 메시지 저장 요청 (convId + content + sources 전송)
    if (!input.convId) {
      throw new Error("convId is required for finalizeAssistantMessage");
    }
    return this.callApi<Message>("finalizeAssistantMessage", {
      convId: input.convId,
      content: input.finalText,
      sources: input.sources,
    });
  }

  /**
   * convId를 포함한 finalizeAssistantMessage
   */
  async finalizeAssistantMessageWithConvId(input: {
    convId: string;
    content: string;
  }): Promise<Message> {
    return this.callApi<Message>("finalizeAssistantMessage", input);
  }

  async cancelAssistantMessage(msgId: string): Promise<Message> {
    // 서버에 ASSISTANT 메시지 취소 요청
    return this.callApi<Message>("cancelAssistantMessage", { msgId });
  }

  async listConversationMessages(input: {
    convId: string;
    cursor?: string;
    limit?: number;
  }): Promise<{
    items: Message[];
    nextCursor?: string;
    lastSeqNo?: number;
  }> {
    return this.callApi<{
      items: Message[];
      nextCursor?: string;
      lastSeqNo?: number;
    }>("listConversationMessages", input);
  }

  /**
   * 無限スクロール用ページネーション
   * created_atベースのカーソルでバックエンドAPIを直接使用
   */
  async listConversationMessagesPaginated(input: {
    convId: string;
    cursor?: string; // created_at ISO文字列
    limit?: number;
  }): Promise<{
    items: Message[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    return this.callApi<{
      items: Message[];
      nextCursor?: string;
      hasMore: boolean;
    }>("listConversationMessagesPaginated", input);
  }
}
