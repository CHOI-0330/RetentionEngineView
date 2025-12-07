/**
 * Message Port Interface
 *
 * メッセージ管理に関するPort定義
 * Gateway層が実装すべきインターフェース
 */

import type { Message } from "../../../domain/core";

/**
 * MessagePort
 *
 * メッセージのCRUD操作とページネーションを定義するポート
 */
export interface MessagePort {
  /**
   * ユーザーメッセージを作成
   *
   * @param input - メッセージ作成パラメータ
   * @param input.convId - 会話ID
   * @param input.authorId - 作成者ID
   * @param input.content - メッセージ内容
   * @returns 作成されたメッセージオブジェクト
   */
  createUserMessage(input: {
    convId: string;
    authorId: string;
    content: string;
  }): Promise<Message>;

  /**
   * アシスタントメッセージを開始（Draft状態）
   *
   * @param convId - 会話ID
   * @returns ドラフト状態のメッセージオブジェクト
   */
  beginAssistantMessage(convId: string): Promise<Message>;

  /**
   * アシスタントメッセージを完成
   *
   * @param input - 完成パラメータ
   * @param input.msgId - メッセージID
   * @param input.finalText - 最終テキスト
   * @returns 完成したメッセージオブジェクト
   */
  finalizeAssistantMessage(input: {
    msgId: string;
    finalText: string;
  }): Promise<Message>;

  /**
   * アシスタントメッセージをキャンセル
   *
   * @param msgId - メッセージID
   * @returns キャンセルされたメッセージオブジェクト
   */
  cancelAssistantMessage(msgId: string): Promise<Message>;

  /**
   * 会話のメッセージ一覧を取得（ページネーション対応）
   *
   * @param input - クエリパラメータ
   * @param input.convId - 会話ID
   * @param input.cursor - ページネーションカーソル（オプション）
   * @param input.limit - 取得件数上限（オプション）
   * @returns メッセージリストとページネーション情報
   */
  listConversationMessages(input: {
    convId: string;
    cursor?: string;
    limit?: number;
  }): Promise<{
    items: Message[];
    nextCursor?: string;
    lastSeqNo?: number;
  }>;
}
