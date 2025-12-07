/**
 * StudentChat Factory
 *
 * 依存性注入を担当
 * Gateway → UseCase → Service の組み立て
 */

import { ConversationGateway } from "../../../interfaceAdapters/gateways/api/ConversationGateway";
import { MessageGateway } from "../../../interfaceAdapters/gateways/api/MessageGateway";
import { LLMGateway } from "../../../interfaceAdapters/gateways/api/LLMGateway";
import { FeedbackGateway } from "../../../interfaceAdapters/gateways/api/FeedbackGateway";
import { InitialDataUseCase } from "../initialDataUseCase";
import { ConversationUseCase } from "../ConversationUseCase";
import { MessageUseCase } from "../MessageUseCase";
import { LLMUseCase } from "../LLMUseCase";
import { FeedbackUseCase } from "../FeedbackUseCase";
import { StudentChatService } from "../../../interfaceAdapters/services/StudentChatService";

export interface StudentChatFactoryConfig {
  accessToken?: string;
}

/**
 * StudentChatService インスタンスを生成
 *
 * @param config - アクセストークン等の設定
 * @returns StudentChatService インスタンス
 */
export function createStudentChatService(config: StudentChatFactoryConfig = {}): StudentChatService {
  const { accessToken } = config;

  // Gateway生成（共有）
  const conversationGateway = new ConversationGateway({ accessToken });
  const messageGateway = new MessageGateway({ accessToken });
  const llmGateway = new LLMGateway({ accessToken });
  const feedbackGateway = new FeedbackGateway({ accessToken });

  // UseCase生成
  const initialDataUseCase = new InitialDataUseCase(
    conversationGateway, // InitialDataPort実装
    conversationGateway  // ConversationCreatePort実装
  );
  const conversationUseCase = new ConversationUseCase(conversationGateway);
  const messageUseCase = new MessageUseCase(messageGateway);
  const llmUseCase = new LLMUseCase(llmGateway);
  const feedbackUseCase = new FeedbackUseCase(feedbackGateway);

  // Service生成
  return new StudentChatService(
    initialDataUseCase,
    conversationUseCase,
    messageUseCase,
    llmUseCase,
    feedbackUseCase
  );
}

/**
 * テスト用：モックを注入してService生成
 */
export function createStudentChatServiceWithMocks(mocks: {
  initialDataUseCase: InitialDataUseCase;
  conversationUseCase: ConversationUseCase;
  messageUseCase: MessageUseCase;
}): StudentChatService {
  return new StudentChatService(
    mocks.initialDataUseCase,
    mocks.conversationUseCase,
    mocks.messageUseCase
  );
}
