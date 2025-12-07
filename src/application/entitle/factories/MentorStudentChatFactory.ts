/**
 * MentorStudentChat Factory
 *
 * 依存性注入を組み立てるFactoryパターン
 * Presenterから使用される
 */

import { MentorStudentChatGateway } from "../../../interfaceAdapters/gateways/api/MentorStudentChatGateway";
import { MentorStudentChatUseCase } from "../MentorStudentChatUseCase";
import { MentorStudentChatService } from "../../../interfaceAdapters/services/MentorStudentChatService";

// ============================================
// Factory設定
// ============================================

export interface MentorStudentChatFactoryConfig {
  accessToken?: string;
  convId: string;
}

// ============================================
// Factory関数
// ============================================

/**
 * MentorStudentChatServiceを生成
 *
 * Gateway → UseCase → Service の依存関係を構築
 */
export function createMentorStudentChatService(
  config: MentorStudentChatFactoryConfig
): MentorStudentChatService {
  const { accessToken, convId } = config;

  // Gateway生成
  const gateway = new MentorStudentChatGateway({ accessToken, convId });

  // UseCase生成
  const useCase = new MentorStudentChatUseCase(gateway);

  // Service生成
  const service = new MentorStudentChatService(useCase);

  return service;
}
