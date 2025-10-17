export type UserRole = "NEW_HIRE" | "MENTOR" | "ADMIN";

export type ConvState = "ACTIVE" | "ARCHIVED";

export type AssistantStatus = "DRAFT" | "PARTIAL" | "DONE" | "CANCELLED";

export interface User {
  userId: string;
  role: UserRole;
  displayName: string;
  email: string;
  createdAt: string;
  disabledAt?: string | null;
}

export interface MentorAssignment {
  mentorId: string;
  newhireId: string;
  createdAt: string;
  revokedAt?: string | null;
  createdBy?: string | null;
  note?: string | null;
}

export interface Conversation {
  convId: string;
  ownerId: string;
  title: string;
  state: ConvState;
  createdAt: string;
  lastActiveAt: string;
  archivedAt?: string | null;
}

export type MessageRole = "NEW_HIRE" | "ASSISTANT";

export interface Message {
  msgId: string;
  convId: string;
  role: MessageRole;
  content: string;
  status?: AssistantStatus;
  createdAt: string;
}

export type FeedbackAuthorRole = "MENTOR" | "NEW_HIRE";

export interface Feedback {
  fbId: string;
  targetMsgId: string;
  authorId: string;
  authorRole: FeedbackAuthorRole;
  content: string;
  createdAt: string;
  updatedAt?: string | null;
  visibility?: "ALL" | "OWNER_ONLY" | "MENTOR_ONLY";
}

export interface LLMRuntime {
  runtimeId: string;
  kind: "remote" | "local";
  adapter: string;
  endpoint: string;
  modelPath?: string | null;
  authRef?: string | null;
  headers?: Record<string, string>;
  settings?: Record<string, unknown>;
  createdAt: string;
  archivedAt?: string | null;
}

export interface ModelConfig {
  modelId: string;
  runtimeId: string;
  name: string;
  params: { temperature?: number; maxTokens?: number; topP?: number };
  isDefault: boolean;
  createdAt: string;
}

