/**
 * Conversation Port Interface
 *
 * 会話管理に関するPort定義
 * Gateway層が実装すべきインターフェース
 */

import type { Conversation } from "../../../domain/core";

/**
 * ConversationPort
 *
 * 会話のCRUD操作を定義するポート
 */
export interface ConversationPort {
  /**
   * 新規会話を作成
   *
   * @param input - 会話作成パラメータ
   * @param input.title - 会話タイトル
   * @param input.mentorId - メンターID（オプション）
   * @returns 作成された会話オブジェクト
   */
  createConversation(input: {
    title: string;
    mentorId?: string | null;
  }): Promise<Conversation>;

  /**
   * 会話を削除
   *
   * @param convId - 削除する会話ID
   */
  deleteConversation(convId: string): Promise<void>;

  /**
   * 全会話一覧を取得
   *
   * @returns 会話リスト
   */
  listConversations(): Promise<Conversation[]>;

  /**
   * 特定会話を取得
   *
   * @param convId - 会話ID
   * @returns 会話オブジェクト、見つからない場合はnull
   */
  getConversation(convId: string): Promise<Conversation | null>;

  /**
   * 会話の最終アクティブ時刻を更新
   *
   * @param convId - 会話ID
   */
  touchLastActive(convId: string): Promise<void>;

  /**
   * メンターが担当する会話一覧を取得
   *
   * @param input - クエリパラメータ
   * @param input.mentorId - メンターID
   * @returns メンター担当の会話リスト
   */
  listMentorConversations(input: { mentorId: string }): Promise<Conversation[]>;
}
