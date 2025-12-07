/**
 * Feedback Port Interface
 *
 * フィードバック管理に関するPort定義
 * Gateway層が実装すべきインターフェース
 */

import type { Feedback } from "../../../domain/core";
import type { ValidatedFeedback } from "../models";

/**
 * FeedbackPort
 *
 * フィードバックのCRUD操作を定義するポート
 */
export interface FeedbackPort {
  /**
   * 新規フィードバックを作成
   *
   * @param input - フィードバック作成パラメータ
   * @param input.visibility - 公開範囲（ALL / OWNER_ONLY / MENTOR_ONLY）
   * @returns 作成されたフィードバックオブジェクト
   */
  createFeedback(
    input: ValidatedFeedback & {
      visibility?: "ALL" | "OWNER_ONLY" | "MENTOR_ONLY";
    }
  ): Promise<Feedback>;

  /**
   * フィードバック一覧を取得（ページネーション対応）
   *
   * @param input - クエリパラメータ
   * @param input.msgId - 対象メッセージID
   * @param input.cursor - ページネーションカーソル（オプション）
   * @param input.limit - 取得件数上限（オプション）
   * @returns フィードバックリストとページネーション情報
   */
  listFeedbacks(input: {
    msgId: string;
    cursor?: string;
    limit?: number;
  }): Promise<{
    items: Feedback[];
    nextCursor?: string;
  }>;

  /**
   * フィードバックを更新
   *
   * @param input - 更新パラメータ
   * @param input.feedbackId - フィードバックID
   * @param input.content - 新しい内容
   * @returns 更新されたフィードバックオブジェクト
   */
  updateFeedback(input: {
    feedbackId: string;
    content: string;
  }): Promise<Feedback>;
}
