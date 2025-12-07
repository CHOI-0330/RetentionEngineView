/**
 * MentorDashboard Factory
 *
 * 依存性注入を組み立てるFactoryパターン
 * Presenterから使用される
 */

import { MentorDashboardGateway } from "../../../interfaceAdapters/gateways/api/MentorDashboardGateway";
import { MentorDashboardUseCase } from "../MentorDashboardUseCase";
import { MentorDashboardService } from "../../../interfaceAdapters/services/MentorDashboardService";

// ============================================
// Factory設定
// ============================================

export interface MentorDashboardFactoryConfig {
  accessToken?: string;
}

// ============================================
// Factory関数
// ============================================

/**
 * MentorDashboardServiceを生成
 *
 * Gateway → UseCase → Service の依存関係を構築
 */
export function createMentorDashboardService(
  config: MentorDashboardFactoryConfig = {}
): MentorDashboardService {
  const { accessToken } = config;

  // Gateway生成
  const gateway = new MentorDashboardGateway({ accessToken });

  // UseCase生成
  const useCase = new MentorDashboardUseCase(gateway);

  // Service生成
  const service = new MentorDashboardService(useCase);

  return service;
}
