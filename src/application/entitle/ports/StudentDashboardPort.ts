/**
 * StudentDashboard Port Interface
 *
 * 学生ダッシュボードに関するPort定義
 * Gateway層が実装すべきインターフェース
 */

/**
 * 会話リストアイテム（Port用独立定義）
 */
export interface ConversationListItem {
  convId: string;
  title: string;
  lastActiveAt: string;
}

/**
 * StudentDashboardPort
 *
 * 学生用ダッシュボード操作を定義するポート
 */
export interface StudentDashboardPort {
  /**
   * 会話一覧を取得
   *
   * @returns 会話リスト
   */
  listConversations(): Promise<ConversationListItem[]>;

  /**
   * 新規会話を作成
   *
   * @param title - 会話タイトル
   * @returns 作成された会話ID
   */
  createConversation(title: string): Promise<{ convId: string }>;

  /**
   * 会話を削除
   *
   * @param convId - 削除する会話ID
   */
  deleteConversation(convId: string): Promise<void>;
}
