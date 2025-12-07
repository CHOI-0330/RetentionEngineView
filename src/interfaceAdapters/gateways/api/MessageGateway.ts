/**
 * Message API Gateway
 *
 * MessagePort 인터페이스 구현
 */

import type { Message } from "../../../domain/core";
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
    // 클라이언트에서 임시 메시지 생성 (서버 호출 없음)
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
  }): Promise<Message> {
    // convId가 필요하므로 별도 파라미터로 받아야 함
    throw new Error(
      "finalizeAssistantMessage requires convId. Use finalizeAssistantMessageWithConvId instead."
    );
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

  async cancelAssistantMessage(_msgId: string): Promise<Message> {
    // 클라이언트에서만 처리 (서버 호출 없음)
    return {
      msgId: _msgId,
      convId: "",
      role: "ASSISTANT",
      content: "",
      status: "CANCELLED",
      createdAt: new Date().toISOString(),
    };
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
}
