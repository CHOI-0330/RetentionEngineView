/**
 * Feedback UseCase
 *
 * フィードバック関連のビジネスロジック
 * Port（Gateway）を注入して検証からAPI呼び出しまで一貫して処理
 */

import type {
  Conversation,
  Feedback,
  FeedbackAuthorRole,
  MentorAssignment,
  Message,
  User,
} from "../../domain/core";
import type { UseCaseResult, UseCaseFailureKind } from "./models";
import type { FeedbackPort } from "./ports/FeedbackPort";

// ============================================
// 定数
// ============================================

const MAX_FEEDBACK_LENGTH = 2000;

// ============================================
// ヘルパー関数
// ============================================

const success = <T>(value: T): UseCaseResult<T> => ({ kind: "success", value });

const failure = (kind: UseCaseFailureKind, message: string): UseCaseResult<never> => ({
  kind: "failure",
  error: { kind, message },
});

/**
 * 会話へのアクセス権限チェック
 */
const canAccessConversation = (
  requester: User,
  conversation: Conversation,
  mentorAssignments?: MentorAssignment[]
): boolean => {
  if (requester.userId === conversation.ownerId) {
    return true;
  }

  if (requester.role !== "MENTOR" || !mentorAssignments) {
    return false;
  }

  return mentorAssignments.some(
    (assignment) =>
      assignment.mentorId === requester.userId &&
      assignment.newhireId === conversation.ownerId &&
      assignment.revokedAt == null
  );
};

/**
 * フィードバック作成者ロール決定
 */
const determineAuthorRole = (
  requester: User,
  conversation: Conversation,
  mentorAssignments?: MentorAssignment[]
): FeedbackAuthorRole | null => {
  if (requester.userId === conversation.ownerId) {
    return "NEW_HIRE";
  }

  const activeAssignment = mentorAssignments?.some(
    (assignment) =>
      assignment.mentorId === requester.userId &&
      assignment.newhireId === conversation.ownerId &&
      assignment.revokedAt == null
  );

  if (activeAssignment) {
    return "MENTOR";
  }

  return null;
};

// ============================================
// UseCase クラス
// ============================================

/**
 * Feedback UseCaseクラス
 *
 * フィードバックの作成/一覧取得/更新を担当
 */
export class FeedbackUseCase {
  constructor(private readonly port: FeedbackPort) {}

  /**
   * フィードバック作成
   */
  async create(args: {
    requester: User;
    conversation: Conversation;
    targetMessage: Message;
    content: string;
    mentorAssignments?: MentorAssignment[];
    existingFeedbackCount?: number;
  }): Promise<UseCaseResult<Feedback>> {
    // 検証: メッセージロール（ASSISTANTのみ）
    if (args.targetMessage.role !== "ASSISTANT") {
      return failure("ValidationError", "Feedback can be written only for assistant messages.");
    }

    // 複数フィードバック作成を許可（既存フィードバック検証を削除）

    // 検証: 空内容
    const trimmed = args.content.trim();
    if (trimmed.length === 0) {
      return failure("ValidationError", "Feedback content must not be empty.");
    }

    // 検証: 最大長
    if (trimmed.length > MAX_FEEDBACK_LENGTH) {
      return failure("ValidationError", "Feedback content exceeds the allowed length.");
    }

    // 検証: 権限とロール決定
    const authorRole = determineAuthorRole(
      args.requester,
      args.conversation,
      args.mentorAssignments
    );

    if (!authorRole) {
      return failure("Forbidden", "User is not allowed to write feedback for this conversation.");
    }

    // API呼び出し
    try {
      const feedback = await this.port.createFeedback({
        targetMsgId: args.targetMessage.msgId,
        authorId: args.requester.userId,
        authorRole,
        content: trimmed,
      });
      return success(feedback);
    } catch (error) {
      return failure(
        "ValidationError",
        error instanceof Error ? error.message : "Failed to create feedback."
      );
    }
  }

  /**
   * フィードバック一覧取得
   */
  async list(args: {
    requester: User;
    conversation: Conversation;
    targetMessage: Message;
    mentorAssignments?: MentorAssignment[];
    cursor?: string;
    limit?: number;
  }): Promise<UseCaseResult<{ items: Feedback[]; nextCursor?: string }>> {
    // 検証: 会話アクセス権限
    if (!canAccessConversation(args.requester, args.conversation, args.mentorAssignments)) {
      return failure("Forbidden", "User is not allowed to read feedback for this conversation.");
    }

    // 検証: メッセージ所属
    if (args.targetMessage.convId !== args.conversation.convId) {
      return failure("ValidationError", "Target message does not belong to the conversation.");
    }

    // API呼び出し
    try {
      const result = await this.port.listFeedbacks({
        msgId: args.targetMessage.msgId,
        cursor: args.cursor,
        limit: args.limit,
      });
      return success(result);
    } catch (error) {
      return failure(
        "ValidationError",
        error instanceof Error ? error.message : "Failed to list feedbacks."
      );
    }
  }

  /**
   * フィードバック更新
   */
  async update(args: {
    requester: User;
    conversation: Conversation;
    targetMessage: Message;
    existingFeedback: Feedback;
    content: string;
    mentorAssignments?: MentorAssignment[];
  }): Promise<UseCaseResult<Feedback>> {
    // 検証: 会話アクセス権限
    if (!canAccessConversation(args.requester, args.conversation, args.mentorAssignments)) {
      return failure("Forbidden", "User is not allowed to access this conversation.");
    }

    // 検証: メッセージロール
    if (args.targetMessage.role !== "ASSISTANT") {
      return failure("ValidationError", "Feedback can be written only for assistant messages.");
    }

    // 検証: フィードバック所属
    if (args.existingFeedback.targetMsgId !== args.targetMessage.msgId) {
      return failure("ValidationError", "Feedback does not belong to the specified message.");
    }

    // 検証: 作成者のみ更新可能
    if (args.existingFeedback.authorId !== args.requester.userId) {
      return failure("Forbidden", "Only the original author can update this feedback.");
    }

    // 検証: 空内容
    const trimmed = args.content.trim();
    if (trimmed.length === 0) {
      return failure("ValidationError", "Feedback content must not be empty.");
    }

    // 検証: 最大長
    if (trimmed.length > MAX_FEEDBACK_LENGTH) {
      return failure("ValidationError", "Feedback content exceeds the allowed length.");
    }

    // API呼び出し
    try {
      const feedback = await this.port.updateFeedback({
        feedbackId: args.existingFeedback.fbId,
        content: trimmed,
      });
      return success(feedback);
    } catch (error) {
      return failure(
        "ValidationError",
        error instanceof Error ? error.message : "Failed to update feedback."
      );
    }
  }
}
