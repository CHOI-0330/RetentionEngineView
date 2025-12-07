/**
 * MentorDashboard UseCase（クラスラッパー）
 *
 * メンターダッシュボード関連のビジネスロジック
 * Factoryでの依存性注入のために使用
 */

import type { MentorDashboardPort, StudentSummary } from "./ports";
import type { UseCaseResult } from "./models";
import type { NewhireOption } from "../../interfaceAdapters/gateways/api/MentorDashboardGateway";

/**
 * MentorDashboard UseCase用ポート
 */
export interface MentorDashboardUseCasePort extends MentorDashboardPort {
  listAvailableNewhires(): Promise<NewhireOption[]>;
  createAssignment(newhireId: string): Promise<void>;
}

/**
 * MentorDashboard UseCaseクラス
 *
 * 学生サマリー取得、新入社員リスト、アサイン作成を担当
 */
export class MentorDashboardUseCase {
  constructor(private readonly port: MentorDashboardUseCasePort) {}

  /**
   * 学生サマリー一覧取得
   */
  async listStudentSummaries(args: {
    mentorId: string;
  }): Promise<UseCaseResult<StudentSummary[]>> {
    try {
      const summaries = await this.port.listStudentSummaries(args);
      return { kind: "success", value: summaries };
    } catch (error) {
      return {
        kind: "failure",
        error: {
          kind: "ExternalServiceError",
          message: error instanceof Error ? error.message : "学生情報の取得に失敗しました",
        },
      };
    }
  }

  /**
   * 割り当て可能な新入社員一覧取得
   */
  async listAvailableNewhires(): Promise<UseCaseResult<NewhireOption[]>> {
    try {
      const newhires = await this.port.listAvailableNewhires();
      return { kind: "success", value: newhires };
    } catch (error) {
      return {
        kind: "failure",
        error: {
          kind: "ExternalServiceError",
          message: error instanceof Error ? error.message : "新入社員リストの取得に失敗しました",
        },
      };
    }
  }

  /**
   * メンター割り当て作成
   */
  async createAssignment(args: {
    newhireId: string;
  }): Promise<UseCaseResult<void>> {
    try {
      await this.port.createAssignment(args.newhireId);
      return { kind: "success", value: undefined };
    } catch (error) {
      return {
        kind: "failure",
        error: {
          kind: "ExternalServiceError",
          message: error instanceof Error ? error.message : "メンターアサインの作成に失敗しました",
        },
      };
    }
  }

  /**
   * フィードバック品質評価提出
   */
  async submitFeedbackQuality(args: {
    mentorId: string;
    studentId: string;
    isPositive: boolean;
  }): Promise<UseCaseResult<void>> {
    try {
      await this.port.submitFeedbackQuality(args);
      return { kind: "success", value: undefined };
    } catch (error) {
      return {
        kind: "failure",
        error: {
          kind: "ExternalServiceError",
          message: error instanceof Error ? error.message : "フィードバック評価の送信に失敗しました",
        },
      };
    }
  }
}
