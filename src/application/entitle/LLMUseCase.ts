/**
 * LLM UseCase
 *
 * LLM応答生成のビジネスロジック
 */

import type { Conversation, User, Message } from "../../domain/core";
import type { UseCaseResult } from "./models";
import type { LLMGenerateResponse } from "../../interfaceAdapters/gateways/api/types";

/**
 * LLM生成用Portインターフェース
 */
export interface LLMPort {
  generateResponse(input: {
    question: string;
    conversationId: string;
    modelId?: string;
    runtimeId?: string;
    requireWebSearch?: boolean;
  }): Promise<LLMGenerateResponse>;
}

/**
 * LLM UseCaseクラス
 *
 * LLM応答生成を担当
 */
export class LLMUseCase {
  constructor(private readonly port: LLMPort) {}

  /**
   * LLM応答を生成
   *
   * @param args - 生成パラメータ
   * @returns LLM応答
   */
  async generate(args: {
    requester: User;
    conversation: Conversation;
    question: string;
    requireWebSearch?: boolean;
  }): Promise<UseCaseResult<LLMGenerateResponse>> {
    // 検証: 権限（会話オーナーのみ）
    if (args.requester.userId !== args.conversation.ownerId) {
      return {
        kind: "failure",
        error: {
          kind: "Forbidden",
          message: "この会話でLLM応答を生成する権限がありません。",
        },
      };
    }

    // 検証: 質問が空
    const question = args.question.trim();
    if (question.length === 0) {
      return {
        kind: "failure",
        error: {
          kind: "ValidationError",
          message: "質問を入力してください。",
        },
      };
    }

    try {
      const response = await this.port.generateResponse({
        question,
        conversationId: args.conversation.convId,
        requireWebSearch: args.requireWebSearch,
      });

      return { kind: "success", value: response };
    } catch (error) {
      return {
        kind: "failure",
        error: {
          kind: "ValidationError",
          message: error instanceof Error ? error.message : "LLM応答の生成に失敗しました。",
        },
      };
    }
  }
}
