/**
 * MentorStudentChat Port Interface
 *
 * メンター用学生チャット詳細に関するPort定義
 * Gateway層が実装すべきインターフェース
 */

import type { Conversation, Feedback, Message, User } from "../../../domain/core";

/**
 * メンターチャットブートストラップデータ（Port用独立定義）
 */
export interface MentorChatBootstrapData {
  conversation: Conversation;
  student: User;
  mentor: User;
  messages: Message[];
  feedbackByMessageId: Record<string, Feedback[]>;
  authorNames: Record<string, string>;
}

/**
 * フィードバック作成入力（Port用独立定義）
 */
export interface CreateFeedbackInput {
  messageId: string;
  content: string;
  feedbackId?: string;
}

/**
 * フィードバック作成結果（Port用独立定義）
 */
export interface CreateFeedbackResult {
  feedback: Feedback;
  authorName?: string;
}

/**
 * MentorStudentChatPort
 *
 * メンターが学生のチャット詳細を閲覧・フィードバックする操作を定義するポート
 */
export interface MentorStudentChatPort {
  /**
   * メンター用チャット詳細データを取得
   *
   * @returns チャット詳細データ（会話、メッセージ、フィードバック等）
   */
  fetchChatDetail(): Promise<MentorChatBootstrapData>;

  /**
   * フィードバックを作成/更新
   *
   * @param input - フィードバック作成パラメータ
   * @param input.messageId - 対象メッセージID
   * @param input.content - フィードバック内容
   * @param input.feedbackId - 更新する場合の既存フィードバックID（オプション）
   * @returns 作成/更新結果
   */
  createFeedback(input: CreateFeedbackInput): Promise<CreateFeedbackResult>;
}
