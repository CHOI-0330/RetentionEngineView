/**
 * Profile UseCase
 *
 * プロフィール（MBTI）関連のビジネスロジック
 */

import type { MbtiType } from "../../domain/mbti.types";
import { isValidMbtiType } from "../../domain/mbti.types";
import type { UseCaseResult } from "./models";

// ============================================
// ProfileUseCase Port Interface
// ============================================

/**
 * ProfileUseCase用ポート
 * Gatewayが実装すべきインターフェース
 */
export interface ProfileUseCasePort {
  fetchMbti(userId: string): Promise<MbtiType | null>;
  updateMbti(userId: string, mbti: MbtiType): Promise<void>;
}

// ============================================
// ProfileUseCase Class
// ============================================

/**
 * ProfileUseCase
 *
 * MBTI取得・更新のビジネスロジック
 * バリデーションとエラーハンドリングを担当
 */
export class ProfileUseCase {
  constructor(private readonly port: ProfileUseCasePort) {}

  /**
   * ユーザーのMBTIを取得
   */
  async getMbti(args: { userId: string }): Promise<UseCaseResult<MbtiType | null>> {
    // ユーザーID検証
    if (!args.userId || args.userId.trim().length === 0) {
      return {
        kind: "failure",
        error: {
          kind: "ValidationError",
          message: "ユーザーIDが不正です",
        },
      };
    }

    try {
      const mbti = await this.port.fetchMbti(args.userId);
      return { kind: "success", value: mbti };
    } catch (error) {
      return {
        kind: "failure",
        error: {
          kind: "ExternalServiceError",
          message:
            error instanceof Error ? error.message : "MBTIの取得に失敗しました",
        },
      };
    }
  }

  /**
   * ユーザーのMBTIを更新
   */
  async updateMbti(args: {
    userId: string;
    mbti: MbtiType;
  }): Promise<UseCaseResult<void>> {
    // ユーザーID検証
    if (!args.userId || args.userId.trim().length === 0) {
      return {
        kind: "failure",
        error: {
          kind: "ValidationError",
          message: "ユーザーIDが不正です",
        },
      };
    }

    // MBTI検証
    if (!isValidMbtiType(args.mbti)) {
      return {
        kind: "failure",
        error: {
          kind: "ValidationError",
          message: "無効なMBTIタイプです",
        },
      };
    }

    try {
      await this.port.updateMbti(args.userId, args.mbti);
      return { kind: "success", value: undefined };
    } catch (error) {
      return {
        kind: "failure",
        error: {
          kind: "ExternalServiceError",
          message:
            error instanceof Error ? error.message : "MBTIの更新に失敗しました",
        },
      };
    }
  }
}
