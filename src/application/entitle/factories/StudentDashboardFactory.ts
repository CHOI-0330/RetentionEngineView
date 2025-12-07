/**
 * StudentDashboard Factory
 *
 * 依存性注入を組み立てるFactoryパターン
 * Presenterから使用される
 */

import { StudentDashboardGateway } from "../../../interfaceAdapters/gateways/api/StudentDashboardGateway";
import { StudentDashboardUseCase } from "../StudentDashboardUseCase";
import { StudentDashboardService } from "../../../interfaceAdapters/services/StudentDashboardService";

// ============================================
// Factory設定
// ============================================

export interface StudentDashboardFactoryConfig {
  accessToken?: string;
}

// ============================================
// Factory関数
// ============================================

/**
 * StudentDashboardServiceを生成
 *
 * Gateway → UseCase → Service の依存関係を構築
 */
export function createStudentDashboardService(
  config: StudentDashboardFactoryConfig = {}
): StudentDashboardService {
  const { accessToken } = config;

  // Gateway生成
  const gateway = new StudentDashboardGateway({ accessToken });

  // UseCase生成
  const useCase = new StudentDashboardUseCase(gateway);

  // Service生成
  const service = new StudentDashboardService(useCase);

  return service;
}
