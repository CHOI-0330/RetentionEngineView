/**
 * Auth Factory
 *
 * 依存性注入を担当
 * Gateway → UseCase → Service の組み立て
 */

import { AuthGateway } from "../../../interfaceAdapters/gateways/api/AuthGateway";
import { AuthService } from "../../../interfaceAdapters/services/AuthService";
import {
  loginUserUseCase,
  registerUserUseCase,
  logoutUserUseCase,
} from "../authUseCases";

interface FactoryConfig {
  accessToken?: string;
}

/**
 * AuthService インスタンスを生成
 *
 * @param config - アクセストークン等の設定
 * @returns AuthService インスタンス
 */
export function createAuthService(config: FactoryConfig = {}): AuthService {
  const { accessToken } = config;

  // Gateway生成
  const authGateway = new AuthGateway({ accessToken });

  // Service生成（UseCaseは関数なのでそのまま渡す）
  return new AuthService(
    authGateway,
    loginUserUseCase,
    registerUserUseCase,
    logoutUserUseCase
  );
}

/**
 * テスト用：モックGatewayを注入してService生成
 */
export function createAuthServiceWithMocks(mockGateway: AuthGateway): AuthService {
  return new AuthService(
    mockGateway,
    loginUserUseCase,
    registerUserUseCase,
    logoutUserUseCase
  );
}
