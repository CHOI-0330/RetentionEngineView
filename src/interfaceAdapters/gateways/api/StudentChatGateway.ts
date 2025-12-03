/**
 * StudentChat API Gateway
 *
 * MessagePort, FeedbackPort 인터페이스를 구현하여
 * Page에서 직접 API를 호출하는 대신 Gateway를 통해 호출하도록 합니다.
 */

import type { Message, Feedback, Conversation } from "../../../domain/core";
import type { MessagePort, FeedbackPort } from "../../../application/entitle/ports";
import type { ValidatedFeedback } from "../../../application/entitle/models";
import { apiFetch } from "../../../lib/api";

export interface StudentChatGatewayConfig {
  accessToken?: string;
}

/**
 * StudentChat API Gateway
 *
 * Clean Architecture의 Gateway/Repository 역할을 수행합니다.
 * - Page 컴포넌트에서 직접 API를 호출하지 않고 이 Gateway를 통해 호출
 * - Port 인터페이스를 구현하여 의존성 역전 원칙 준수
 */
export class StudentChatGateway implements MessagePort, FeedbackPort {
  private accessToken?: string;

  constructor(config: StudentChatGatewayConfig = {}) {
    this.accessToken = config.accessToken;
  }

  /**
   * accessToken 업데이트 (세션 갱신 시 사용)
   */
  setAccessToken(token: string | undefined): void {
    this.accessToken = token;
  }

  /**
   * 공통 API 호출 헬퍼
   */
  private async callApi<T>(action: string, payload?: unknown): Promise<T> {
    const result = await apiFetch<T>("/api/entitle/student-chat", {
      method: "POST",
      body: { action, payload },
      accessToken: this.accessToken,
    });

    if (!result.ok) {
      throw new Error(result.error);
    }

    return result.data;
  }

  // ============================================
  // MessagePort 구현
  // ============================================

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
    // 현재 API 구조상 convId를 함께 전달해야 함
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

  // ============================================
  // FeedbackPort 구현
  // ============================================

  async createFeedback(
    input: ValidatedFeedback & { visibility?: "ALL" | "OWNER_ONLY" | "MENTOR_ONLY" }
  ): Promise<Feedback> {
    return this.callApi<Feedback>("createFeedback", {
      targetMsgId: input.targetMsgId,
      content: input.content,
      visibility: input.visibility,
    });
  }

  async listFeedbacks(input: {
    msgId: string;
    cursor?: string;
    limit?: number;
  }): Promise<{
    items: Feedback[];
    nextCursor?: string;
    authorNames?: Record<string, string>;
  }> {
    return this.callApi<{
      items: Feedback[];
      nextCursor?: string;
      authorNames?: Record<string, string>;
    }>("listFeedbacks", input);
  }

  async updateFeedback(input: {
    feedbackId: string;
    content: string;
  }): Promise<Feedback> {
    return this.callApi<Feedback>("updateFeedback", input);
  }

  // ============================================
  // Conversation 관련 메서드 (ConversationPort 확장)
  // ============================================

  async createConversation(input: { title: string }): Promise<Conversation> {
    return this.callApi<Conversation>("createConversation", input);
  }

  async deleteConversation(convId: string): Promise<void> {
    await this.callApi<unknown>("deleteConversation", { convId });
  }

  // ============================================
  // Bootstrap 데이터 로드
  // ============================================

  async fetchBootstrap(convId?: string): Promise<StudentChatBootstrap> {
    const params = new URLSearchParams();
    if (convId) {
      params.set("convId", convId);
    }
    const url = `/api/entitle/student-chat${params.toString() ? `?${params.toString()}` : ""}`;

    const result = await apiFetch<StudentChatBootstrap>(url, {
      method: "GET",
      accessToken: this.accessToken,
      cacheTtl: convId ? 0 : 30 * 1000,
    });

    if (!result.ok) {
      throw new Error(result.error);
    }

    return result.data;
  }
}

// ============================================
// Bootstrap 데이터 타입 (Page에서 이동)
// ============================================

import type { User, MentorAssignment } from "../../../domain/core";

export interface ConversationOption {
  convId: string;
  title: string;
  lastActiveAt: string;
}

export interface MentorOption {
  mentorId: string;
  displayName: string;
  email?: string;
}

export interface StudentChatBootstrap {
  conversation: Conversation | null;
  currentUser: User;
  initialMessages: Message[];
  initialFeedbacks: Record<string, Feedback[]>;
  authorNames: Record<string, string>;
  mentorAssignments: MentorAssignment[];
  availableConversations: ConversationOption[];
  availableMentors: MentorOption[];
}

// ============================================
// LLM Gateway (별도 분리)
// ============================================

export interface LLMGatewayConfig {
  accessToken?: string;
}

export class LLMGateway {
  private accessToken?: string;

  constructor(config: LLMGatewayConfig = {}) {
    this.accessToken = config.accessToken;
  }

  setAccessToken(token: string | undefined): void {
    this.accessToken = token;
  }

  async generateResponse(input: {
    question: string;
    conversationId: string;
    modelId?: string;
    runtimeId?: string;
  }): Promise<{ answer: string }> {
    const result = await apiFetch<{ answer: string }>("/api/llm/generate", {
      method: "POST",
      body: input,
      accessToken: this.accessToken,
    });

    if (!result.ok) {
      throw new Error(result.error);
    }

    return result.data;
  }
}
