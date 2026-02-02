/**
 * MentorAiChat Factory
 *
 * 依存性注入を組み立てるFactoryパターン
 * Gateway → UseCase → Service の依存関係を構築
 */

import { MentorAiChatGateway } from "../../../interfaceAdapters/gateways/api/MentorAiChatGateway";
import { MentorAiChatUseCase } from "../MentorAiChatUseCase";
import { MentorAiChatService } from "../../../interfaceAdapters/services/MentorAiChatService";

// ============================================
// Factory設定
// ============================================

export interface MentorAiChatFactoryConfig {
  accessToken?: string;
  mentorId: string;
}

// ============================================
// Factory関数
// ============================================

/**
 * MentorAiChatServiceを生成
 *
 * Gateway → UseCase → Service の依存関係を構築
 */
export function createMentorAiChatService(
  config: MentorAiChatFactoryConfig,
): MentorAiChatService {
  const { accessToken, mentorId } = config;

  // Gateway生成
  const gateway = new MentorAiChatGateway({ accessToken, mentorId });

  // UseCase生成
  const useCase = new MentorAiChatUseCase(gateway);

  // Service生成
  const service = new MentorAiChatService(useCase);

  return service;
}
