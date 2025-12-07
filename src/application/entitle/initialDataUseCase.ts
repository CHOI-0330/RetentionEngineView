/**
 * InitialData UseCase
 *
 * ページ初期データロードを担当する純粋クラス
 * Bootstrapデータ取得 + 会話がない場合の作成ロジックを含む
 */

import type { User } from "../../domain/core";
import type { StudentChatBootstrap } from "../../interfaceAdapters/gateways/api/types";
import type { UseCaseResult } from "./models";
import type { ConversationPort } from "./ports/ConversationPort";
import { ConversationUseCase } from "./ConversationUseCase";

/**
 * Bootstrapデータを取得するPortインターフェース
 */
export interface InitialDataPort {
  fetchBootstrap(convId?: string): Promise<StudentChatBootstrap>;
}

/**
 * InitialData UseCaseクラス
 *
 * 初期データロード及び必要に応じて会話作成を担当
 */
export class InitialDataUseCase {
  private readonly conversationUseCase: ConversationUseCase;

  constructor(
    private readonly initialDataPort: InitialDataPort,
    conversationPort: ConversationPort
  ) {
    this.conversationUseCase = new ConversationUseCase(conversationPort);
  }

  /**
   * 初期データロード
   *
   * @param requester - リクエスター情報 (userId, role)
   * @param convId - 特定の会話ID（オプション）
   * @returns Bootstrapデータ
   */
  async execute(
    requester: Pick<User, "userId" | "role">,
    convId?: string
  ): Promise<UseCaseResult<StudentChatBootstrap>> {
    try {
      let data = await this.initialDataPort.fetchBootstrap(convId);

      // 会話がなければ新規作成
      if (!data.conversation && requester.role === "NEW_HIRE") {
        const createResult = await this.conversationUseCase.create({
          requester,
          title: "新しい会話",
          allowedMentorIds: [],
        });

        if (createResult.kind === "failure") {
          return createResult;
        }

        // 新規作成した会話で再度Bootstrapをロード
        data = await this.initialDataPort.fetchBootstrap(createResult.value.convId);
      }

      if (!data.conversation) {
        return {
          kind: "failure",
          error: {
            kind: "NotFound",
            message: "会話データが取得できませんでした。",
          },
        };
      }

      return { kind: "success", value: data };
    } catch (error) {
      return {
        kind: "failure",
        error: {
          kind: "ValidationError",
          message: error instanceof Error ? error.message : "初期データの取得に失敗しました。",
        },
      };
    }
  }
}
