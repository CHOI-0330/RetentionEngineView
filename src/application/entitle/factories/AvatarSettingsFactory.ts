/**
 * AvatarSettings Factory
 *
 * AvatarSettingsServiceとその依存関係を生成
 */

import { AvatarGateway } from "../../../interfaceAdapters/gateways/api/AvatarGateway";
import { AvatarSettingsService } from "../../../interfaceAdapters/services/AvatarSettingsService";

export interface AvatarSettingsFactoryConfig {
  accessToken?: string;
}

/**
 * AvatarSettingsServiceを生成
 */
export function createAvatarSettingsService(
  config: AvatarSettingsFactoryConfig = {}
): AvatarSettingsService {
  // Gateway生成
  const gateway = new AvatarGateway({ accessToken: config.accessToken });

  // Service生成
  return new AvatarSettingsService(gateway);
}
