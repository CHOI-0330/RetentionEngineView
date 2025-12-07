/**
 * StudentChat API Gateway (Facade)
 *
 * @deprecated 개별 Gateway 사용을 권장합니다:
 * - MessageGateway: 메시지 관련 작업
 * - FeedbackGateway: 피드백 관련 작업
 * - ConversationGateway: 대화 관련 작업
 * - LLMGateway: LLM 생성 관련 작업
 *
 * 이 파일은 하위 호환성을 위해 유지됩니다.
 */

import type { Message, Feedback, Conversation } from "../../../domain/core";
import type { MessagePort, FeedbackPort } from "../../../application/entitle/ports";
import type { ConversationPort } from "../../../application/entitle/ports/ConversationPort";
import type { ValidatedFeedback } from "../../../application/entitle/models";

import { MessageGateway } from "./MessageGateway";
import { FeedbackGateway } from "./FeedbackGateway";
import { ConversationGateway } from "./ConversationGateway";
import type { GatewayConfig, StudentChatBootstrap } from "./types";

// 타입 re-export (하위 호환성)
export type {
  GatewayConfig as StudentChatGatewayConfig,
  ConversationOption,
  MentorOption,
  StudentChatBootstrap,
  SearchSettings,
  WebSource,
  ResponseSources,
  WebSearchConfirmationLabels,
  LLMGenerateResponse,
} from "./types";

export { ResponseType } from "./types";
export { LLMGateway } from "./LLMGateway";
export type { GatewayConfig as LLMGatewayConfig } from "./types";

/**
 * StudentChat API Gateway (Facade)
 *
 * 개별 Gateway들을 조합하여 기존 인터페이스 유지
 *
 * @deprecated 개별 Gateway 사용을 권장합니다.
 */
export class StudentChatGateway implements MessagePort, FeedbackPort, ConversationPort {
  private messageGateway: MessageGateway;
  private feedbackGateway: FeedbackGateway;
  private conversationGateway: ConversationGateway;

  constructor(config: GatewayConfig = {}) {
    this.messageGateway = new MessageGateway(config);
    this.feedbackGateway = new FeedbackGateway(config);
    this.conversationGateway = new ConversationGateway(config);
  }

  /**
   * accessToken 업데이트 (세션 업데이트 시 사용)
   */
  setAccessToken(token: string | undefined): void {
    this.messageGateway.setAccessToken(token);
    this.feedbackGateway.setAccessToken(token);
    this.conversationGateway.setAccessToken(token);
  }

  // ============================================
  // MessagePort 구현 (위임)
  // ============================================

  async createUserMessage(input: {
    convId: string;
    authorId: string;
    content: string;
  }): Promise<Message> {
    return this.messageGateway.createUserMessage(input);
  }

  async beginAssistantMessage(convId: string): Promise<Message> {
    return this.messageGateway.beginAssistantMessage(convId);
  }

  async finalizeAssistantMessage(input: {
    msgId: string;
    finalText: string;
  }): Promise<Message> {
    return this.messageGateway.finalizeAssistantMessage(input);
  }

  async finalizeAssistantMessageWithConvId(input: {
    convId: string;
    content: string;
  }): Promise<Message> {
    return this.messageGateway.finalizeAssistantMessageWithConvId(input);
  }

  async cancelAssistantMessage(msgId: string): Promise<Message> {
    return this.messageGateway.cancelAssistantMessage(msgId);
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
    return this.messageGateway.listConversationMessages(input);
  }

  // ============================================
  // FeedbackPort 구현 (위임)
  // ============================================

  async createFeedback(
    input: ValidatedFeedback & { visibility?: "ALL" | "OWNER_ONLY" | "MENTOR_ONLY" }
  ): Promise<Feedback> {
    return this.feedbackGateway.createFeedback(input);
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
    return this.feedbackGateway.listFeedbacks(input);
  }

  async updateFeedback(input: {
    feedbackId: string;
    content: string;
  }): Promise<Feedback> {
    return this.feedbackGateway.updateFeedback(input);
  }

  // ============================================
  // ConversationPort 구현 (위임)
  // ============================================

  async createConversation(input: { title: string; mentorId?: string | null }): Promise<Conversation> {
    return this.conversationGateway.createConversation(input);
  }

  async deleteConversation(convId: string): Promise<void> {
    return this.conversationGateway.deleteConversation(convId);
  }

  async listConversations(): Promise<Conversation[]> {
    return this.conversationGateway.listConversations();
  }

  async getConversation(convId: string): Promise<Conversation | null> {
    return this.conversationGateway.getConversation(convId);
  }

  async touchLastActive(convId: string): Promise<void> {
    return this.conversationGateway.touchLastActive(convId);
  }

  async listMentorConversations(input: { mentorId: string }): Promise<Conversation[]> {
    return this.conversationGateway.listMentorConversations(input);
  }

  // ============================================
  // Bootstrap 데이터 로드 (위임)
  // ============================================

  async fetchBootstrap(convId?: string): Promise<StudentChatBootstrap> {
    return this.conversationGateway.fetchBootstrap(convId);
  }
}
