/**
 * InitialData Port Interface
 *
 * 初期データロードに関するPort定義
 * Gateway層が実装すべきインターフェース
 */

import type { StudentChatBootstrap } from "../../../interfaceAdapters/gateways/api/types";

/**
 * InitialDataPort
 *
 * アプリケーション初期データ取得を定義するポート
 */
export interface InitialDataPort {
  /**
   * Bootstrap初期データを取得
   *
   * @param convId - 会話ID（オプション）
   * @returns Bootstrap初期データ（会話、メッセージ、ユーザー情報等）
   */
  fetchBootstrap(convId?: string): Promise<StudentChatBootstrap>;
}
