import type { FeedbackAuthorRole } from "../../type/core";

export type UseCaseFailureKind = "Forbidden" | "NotFound" | "ValidationError";

export interface UseCaseFailure {
  kind: UseCaseFailureKind;
  message: string;
}

export type UseCaseResult<T> =
  | { kind: "success"; value: T }
  | { kind: "failure"; error: UseCaseFailure };

export interface PromptMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface Prompt {
  system?: string;
  messages: PromptMessage[];
}

export interface StreamAssistantRequest {
  kind: "REQUEST_STREAM";
  prompt: Prompt;
  modelId?: string;
  runtimeId?: string;
}

export interface MessageDelta {
  text: string;
  seqNo: number;
}

export interface ValidatedFeedback {
  targetMsgId: string;
  authorId: string;
  authorRole: FeedbackAuthorRole;
  content: string;
}

export interface QuerySpec {
  convId?: string;
  msgId?: string;
  cursor?: string;
  limit: number;
}

