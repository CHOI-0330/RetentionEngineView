/**
 * Entitle Application Layer - Public API
 *
 * UseCase、Model、Portをエクスポート
 */

// ============================================
// Models
// ============================================

export type {
  UseCaseFailure,
  UseCaseFailureKind,
  UseCaseResult,
  Prompt,
  PromptMessage,
  AssistantResponse,
  ValidatedFeedback,
  QuerySpec,
} from "./models";

// ============================================
// Ports (Interfaces)
// ============================================

export type {
  MessagePort,
  FeedbackPort,
  AuthPort,
  ConversationPort,
  MentorDashboardPort,
  StudentSummary,
  ProfilePort,
  LLMPort,
  StudentDashboardPort,
  ConversationListItem,
  MentorStudentChatPort,
  MentorChatBootstrapData,
  CreateFeedbackInput,
  CreateFeedbackResult,
} from "./ports";

// ============================================
// UseCases (Class-based - 推奨)
// ============================================

// Core UseCase Classes
export { ConversationUseCase } from "./ConversationUseCase";
export { MessageUseCase } from "./MessageUseCase";
export { FeedbackUseCase } from "./FeedbackUseCase";
export { LLMUseCase } from "./LLMUseCase";
export { ProfileUseCase } from "./ProfileUseCase";
export { StudentDashboardUseCase } from "./StudentDashboardUseCase";
export { MentorDashboardUseCase } from "./MentorDashboardUseCase";
export { MentorStudentChatUseCase } from "./MentorStudentChatUseCase";
export { InitialDataUseCase, type InitialDataPort } from "./initialDataUseCase";

// Auth UseCases (純粋検証関数)
export {
  registerUserUseCase,
  loginUserUseCase,
  logoutUserUseCase,
  type RegisterUserInput,
  type LoginUserInput,
} from "./authUseCases";
