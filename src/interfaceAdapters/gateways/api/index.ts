/**
 * API Gateway 모듈
 *
 * 각 Gateway를 개별 파일로 분리하여 단일 책임 원칙(SRP) 준수
 */

// 타입 export
export type {
  GatewayConfig,
  ConversationOption,
  MentorOption,
  StudentChatBootstrap,
  SearchSettings,
  WebSource,
  ResponseSources,
  WebSearchConfirmationLabels,
  LLMGenerateResponse,
} from "./types";

export type { AuthGatewayConfig, LoginResponse, RegisterRequest } from "./AuthGateway";

export { ResponseType } from "./types";

// Gateway export
export { AuthGateway } from "./AuthGateway";
export { MessageGateway } from "./MessageGateway";
export { FeedbackGateway } from "./FeedbackGateway";
export { ConversationGateway } from "./ConversationGateway";
export { LLMGateway } from "./LLMGateway";

// 하위 호환성을 위한 StudentChatGateway (deprecated)
export { StudentChatGateway } from "./StudentChatGateway";

// V2 Gateways
export { MentorDashboardGateway } from "./MentorDashboardGateway";
export { MentorStudentChatGateway } from "./MentorStudentChatGateway";
export { StudentDashboardGateway } from "./StudentDashboardGateway";
export { ProfileGateway } from "./ProfileGateway";
export { AvatarGateway } from "./AvatarGateway";
