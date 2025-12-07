/**
 * StudentChat Service
 *
 * 純粋クラス（React非依存）
 * UseCaseを組み合わせてStudentChat機能を提供
 * ViewModelへの変換も担当
 */

import type { User, Conversation, Message } from "../../domain/core";
import type { UseCaseResult } from "../../application/entitle/models";
import type {
  StudentChatBootstrap,
  ConversationOption,
  MentorOption,
} from "../gateways/api/types";
import type { InitialDataUseCase } from "../../application/entitle/initialDataUseCase";
import type { ConversationUseCase } from "../../application/entitle/ConversationUseCase";
import type { MessageUseCase } from "../../application/entitle/MessageUseCase";
import type { LLMUseCase } from "../../application/entitle/LLMUseCase";
import type { FeedbackUseCase } from "../../application/entitle/FeedbackUseCase";
import type { SearchSettings, LLMGenerateResponse } from "../gateways/api/types";
import type { Feedback, MentorAssignment } from "../../domain/core";

// ============================================
// ViewModel型定義
// ============================================

export interface ConversationViewModel {
  convId: string;
  title: string;
  lastActiveAt: string;
  isActive: boolean;
}

export interface MessageViewModel {
  msgId: string;
  content: string;
  role: "user" | "assistant";
  status: "draft" | "partial" | "done" | "cancelled";
  createdAt: string;
}

export interface StudentChatViewModel {
  currentUser: User;
  conversation: Conversation | null;
  messages: MessageViewModel[];
  conversations: ConversationViewModel[];
  mentors: MentorOption[];
  authorNames: Record<string, string>;
}

// ============================================
// Service クラス
// ============================================

/**
 * StudentChat Service
 *
 * UseCase経由でビジネスロジックを実行
 * データをViewModelに変換
 */
export class StudentChatService {
  constructor(
    private readonly initialDataUseCase: InitialDataUseCase,
    private readonly conversationUseCase: ConversationUseCase,
    private readonly messageUseCase: MessageUseCase,
    private readonly llmUseCase?: LLMUseCase,
    private readonly feedbackUseCase?: FeedbackUseCase
  ) {}

  // ============================================
  // 初期データ
  // ============================================

  /**
   * 初期データ取得
   */
  async fetchInitialData(
    requester: Pick<User, "userId" | "role">,
    convId?: string
  ): Promise<UseCaseResult<StudentChatBootstrap>> {
    return this.initialDataUseCase.execute(requester, convId);
  }

  // ============================================
  // 会話操作
  // ============================================

  /**
   * 会話作成
   */
  async createConversation(
    requester: Pick<User, "userId" | "role">,
    title: string,
    allowedMentorIds: string[] = []
  ): Promise<UseCaseResult<Conversation>> {
    return this.conversationUseCase.create({
      requester,
      title,
      allowedMentorIds,
    });
  }

  /**
   * 会話削除
   */
  async deleteConversation(
    requester: Pick<User, "userId" | "role">,
    conversation: Conversation
  ): Promise<UseCaseResult<void>> {
    return this.conversationUseCase.delete({
      requester,
      conversation,
    });
  }

  // ============================================
  // メッセージ操作
  // ============================================

  /**
   * ユーザーメッセージ作成
   */
  async sendMessage(
    user: User,
    conversation: Conversation,
    content: string
  ): Promise<UseCaseResult<Message>> {
    return this.messageUseCase.createUserMessage({
      user,
      conversation,
      content,
    });
  }

  /**
   * アシスタントメッセージ開始
   */
  async beginAssistantMessage(
    conversation: Conversation,
    requester: User
  ): Promise<UseCaseResult<Message>> {
    return this.messageUseCase.beginAssistantMessage({
      conversation,
      requester,
    });
  }

  /**
   * アシスタントメッセージ完了
   */
  async finalizeAssistantMessage(
    message: Message,
    finalText: string
  ): Promise<UseCaseResult<Message>> {
    return this.messageUseCase.finalizeAssistantMessage({
      message,
      finalText,
    });
  }

  /**
   * アシスタントメッセージキャンセル
   */
  async cancelAssistantMessage(
    message: Message
  ): Promise<UseCaseResult<Message>> {
    return this.messageUseCase.cancelAssistantMessage({ message });
  }

  // ============================================
  // LLM操作
  // ============================================

  /**
   * LLM応答を生成
   */
  async generateLLMResponse(
    user: User,
    conversation: Conversation,
    question: string,
    searchSettings?: SearchSettings
  ): Promise<UseCaseResult<LLMGenerateResponse>> {
    if (!this.llmUseCase) {
      return {
        kind: "failure",
        error: {
          kind: "ValidationError",
          message: "LLM機能が有効になっていません。",
        },
      };
    }

    return this.llmUseCase.generate({
      requester: user,
      conversation,
      question,
      searchSettings,
    });
  }

  // ============================================
  // Feedback操作
  // ============================================

  /**
   * フィードバック一覧取得
   */
  async listFeedbacks(
    user: User,
    conversation: Conversation,
    message: Message,
    mentorAssignments?: MentorAssignment[]
  ): Promise<UseCaseResult<{ items: Feedback[]; nextCursor?: string }>> {
    if (!this.feedbackUseCase) {
      return {
        kind: "failure",
        error: {
          kind: "ValidationError",
          message: "Feedback機能が有効になっていません。",
        },
      };
    }

    return this.feedbackUseCase.list({
      requester: user,
      conversation,
      targetMessage: message,
      mentorAssignments,
    });
  }

  /**
   * フィードバック作成
   */
  async createFeedback(
    user: User,
    conversation: Conversation,
    message: Message,
    content: string,
    mentorAssignments?: MentorAssignment[],
    existingFeedbackCount?: number
  ): Promise<UseCaseResult<Feedback>> {
    if (!this.feedbackUseCase) {
      return {
        kind: "failure",
        error: {
          kind: "ValidationError",
          message: "Feedback機能が有効になっていません。",
        },
      };
    }

    return this.feedbackUseCase.create({
      requester: user,
      conversation,
      targetMessage: message,
      content,
      mentorAssignments,
      existingFeedbackCount,
    });
  }

  // ============================================
  // ViewModel変換
  // ============================================

  /**
   * BootstrapデータをViewModelに変換
   */
  toViewModel(
    data: StudentChatBootstrap,
    activeConvId?: string
  ): StudentChatViewModel {
    const selectedConvId = activeConvId ?? data.conversation?.convId;

    return {
      currentUser: data.currentUser,
      conversation: data.conversation,
      messages: this.toMessageViewModels(data.initialMessages),
      conversations: this.toConversationViewModels(
        data.availableConversations,
        selectedConvId
      ),
      mentors: data.availableMentors,
      authorNames: data.authorNames,
    };
  }

  /**
   * メッセージ配列をViewModelに変換
   */
  private toMessageViewModels(messages: Message[]): MessageViewModel[] {
    return messages.map((m) => ({
      msgId: m.msgId,
      content: m.content,
      role: m.role === "NEW_HIRE" ? "user" : "assistant",
      status: this.mapMessageStatus(m.status),
      createdAt: m.createdAt,
    }));
  }

  /**
   * メッセージステータスをViewModel用にマップ
   */
  private mapMessageStatus(
    status: Message["status"]
  ): MessageViewModel["status"] {
    if (!status) return "done";

    const statusMap: Record<NonNullable<Message["status"]>, MessageViewModel["status"]> = {
      DRAFT: "draft",
      PARTIAL: "partial",
      DONE: "done",
      CANCELLED: "cancelled",
    };
    return statusMap[status];
  }

  /**
   * 会話オプション配列をViewModelに変換
   */
  private toConversationViewModels(
    conversations: ConversationOption[],
    activeConvId?: string
  ): ConversationViewModel[] {
    return conversations.map((c) => ({
      convId: c.convId,
      title: c.title,
      lastActiveAt: c.lastActiveAt,
      isActive: c.convId === activeConvId,
    }));
  }
}
