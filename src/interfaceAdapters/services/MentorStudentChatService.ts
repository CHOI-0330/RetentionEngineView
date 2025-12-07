/**
 * MentorStudentChat Service
 *
 * 純粋クラス（React非依存）
 * UseCaseを通じてビジネスロジックを実行し、ViewModelに変換
 */

import type { Feedback } from "../../domain/core";
import type { UseCaseResult } from "../../application/entitle/models";
import type { MentorStudentChatUseCase } from "../../application/entitle/MentorStudentChatUseCase";
import type {
  MentorChatBootstrapData,
  CreateFeedbackInput,
  CreateFeedbackResult,
} from "../../application/entitle/ports/MentorStudentChatPort";

// ============================================
// ViewModel型定義
// ============================================

export interface FeedbackViewModel {
  id: string;
  authorName: string;
  content: string;
  createdAt: Date;
}

export interface MessageViewModel {
  id: string;
  role: "NEW_HIRE" | "ASSISTANT";
  content: string;
  createdAt: Date;
  status?: "DRAFT" | "PARTIAL" | "DONE" | "CANCELLED";
  feedbacks: FeedbackViewModel[];
}

export interface MentorStudentChatViewModel {
  conversationTitle: string;
  studentName: string;
  mentorId: string;
  mentorName: string;
  messages: MessageViewModel[];
}

// ============================================
// Service クラス
// ============================================

export class MentorStudentChatService {
  constructor(private readonly useCase: MentorStudentChatUseCase) {}

  /**
   * チャット詳細データ取得
   */
  async fetchChatDetail(): Promise<UseCaseResult<MentorChatBootstrapData>> {
    return this.useCase.fetchChatDetail();
  }

  /**
   * フィードバック作成
   */
  async createFeedback(
    input: CreateFeedbackInput
  ): Promise<UseCaseResult<CreateFeedbackResult>> {
    return this.useCase.createFeedback(input);
  }

  /**
   * MentorChatBootstrapDataをViewModelに変換
   */
  toViewModel(data: MentorChatBootstrapData): MentorStudentChatViewModel {
    const messages: MessageViewModel[] = data.messages.map((message) => {
      const feedbacks = data.feedbackByMessageId[message.msgId] ?? [];

      return {
        id: message.msgId,
        role: message.role,
        content: message.content,
        createdAt: new Date(message.createdAt),
        status: message.status,
        feedbacks: feedbacks.map((fb) => this.toFeedbackViewModel(fb, data.authorNames)),
      };
    });

    return {
      conversationTitle: data.conversation.title,
      studentName: data.student.displayName,
      mentorId: data.mentor.userId,
      mentorName: data.mentor.displayName,
      messages,
    };
  }

  /**
   * FeedbackをFeedbackViewModelに変換
   */
  private toFeedbackViewModel(
    feedback: Feedback,
    authorNames: Record<string, string>
  ): FeedbackViewModel {
    return {
      id: feedback.fbId,
      authorName: authorNames[feedback.authorId] ?? feedback.authorId,
      content: feedback.content,
      createdAt: new Date(feedback.createdAt),
    };
  }

  /**
   * 新しいフィードバックでデータを更新
   */
  updateWithNewFeedback(
    currentData: MentorChatBootstrapData,
    messageId: string,
    result: CreateFeedbackResult
  ): MentorChatBootstrapData {
    const nextFeedbacks = {
      ...currentData.feedbackByMessageId,
      [messageId]: [result.feedback],
    };

    const nextAuthorNames = {
      ...currentData.authorNames,
      [result.feedback.authorId]:
        result.authorName ??
        currentData.authorNames[result.feedback.authorId] ??
        result.feedback.authorId,
    };

    return {
      ...currentData,
      feedbackByMessageId: nextFeedbacks,
      authorNames: nextAuthorNames,
    };
  }
}
