/**
 * Profile Factory
 *
 * 依存性注入を組み立てるFactoryパターン
 * Presenterから使用される
 */

import { ProfileGateway } from "../../../interfaceAdapters/gateways/api/ProfileGateway";
import { ProfileUseCase } from "../ProfileUseCase";
import { ProfileService } from "../../../interfaceAdapters/services/ProfileService";

// ============================================
// Factory設定
// ============================================

export interface ProfileFactoryConfig {
  accessToken?: string;
}

// ============================================
// Factory関数
// ============================================

/**
 * ProfileServiceを生成
 *
 * Gateway → UseCase → Service の依存関係を構築
 */
export function createProfileService(
  config: ProfileFactoryConfig = {}
): ProfileService {
  const { accessToken } = config;

  // Gateway生成
  const gateway = new ProfileGateway({ accessToken });

  // UseCase生成
  const useCase = new ProfileUseCase(gateway);

  // Service生成
  const service = new ProfileService(useCase);

  return service;
}
