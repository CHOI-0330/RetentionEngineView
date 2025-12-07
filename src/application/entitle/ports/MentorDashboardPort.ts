/**
 * MentorDashboard Port Interface
 *
 * メンターダッシュボードに関するPort定義
 * Gateway層が実装すべきインターフェース
 */

import type { Conversation, Message, User } from "../../../domain/core";
import type { NewhireOption } from "../../../interfaceAdapters/gateways/api/MentorDashboardGateway";

/**
 * StudentSummary
 *
 * メンターダッシュボードに表示する学生サマリー情報
 */
export interface StudentSummary {
  /** 新入社員ユーザー情報 */
  newhire: User;
  /** 会話情報 */
  conversation: Conversation;
  /** 最新メッセージ（オプション） */
  recentMessage?: Message;
  /** レビューが必要かどうか */
  needsReview: boolean;
  /** 総チャット数 */
  totalChats: number;
  /** 最終アクティブ日時 */
  lastActivityAt: string;
}

/**
 * MentorDashboardPort
 *
 * メンター用ダッシュボード操作を定義するポート
 */
export interface MentorDashboardPort {
  /**
   * 担当学生のサマリー一覧を取得
   *
   * @param input - クエリパラメータ
   * @param input.mentorId - メンターID
   * @returns 学生サマリーリスト
   */
  listStudentSummaries(input: { mentorId: string }): Promise<StudentSummary[]>;

  /**
   * フィードバック品質評価を送信
   *
   * @param input - 評価パラメータ
   * @param input.mentorId - メンターID
   * @param input.studentId - 学生（新入社員）ID
   * @param input.isPositive - 肯定的評価かどうか
   */
  submitFeedbackQuality(input: {
    mentorId: string;
    studentId: string;
    isPositive: boolean;
  }): Promise<void>;

  /**
   * 割り当て可能な新入社員一覧を取得
   *
   * @returns 新入社員オプションリスト
   */
  listAvailableNewhires(): Promise<NewhireOption[]>;

  /**
   * 新入社員へのメンター割り当てを作成
   *
   * @param newhireId - 新入社員ID
   */
  createAssignment(newhireId: string): Promise<void>;
}
