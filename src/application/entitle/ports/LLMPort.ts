/**
 * LLM Port Interface
 *
 * LLM応答生成に関するPort定義
 * Gateway層が実装すべきインターフェース
 */

import type {
  SearchSettings,
  LLMGenerateResponse,
} from "../../../interfaceAdapters/gateways/api/types";

/**
 * LLMPort
 *
 * LLM応答生成を定義するポート
 */
export interface LLMPort {
  /**
   * LLM応答を生成
   *
   * @param input - 生成パラメータ
   * @param input.question - ユーザーの質問
   * @param input.conversationId - 会話ID
   * @param input.modelId - 使用するモデルID（オプション）
   * @param input.runtimeId - 使用するランタイムID（オプション）
   * @param input.searchSettings - 検索設定（オプション）
   * @returns LLM生成応答
   */
  generateResponse(input: {
    question: string;
    conversationId: string;
    modelId?: string;
    runtimeId?: string;
    searchSettings?: SearchSettings;
  }): Promise<LLMGenerateResponse>;
}
