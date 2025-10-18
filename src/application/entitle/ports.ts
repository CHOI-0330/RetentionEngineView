import type {
  Conversation,
  Feedback,
  LLMRuntime,
  Message,
  MentorAssignment,
  ModelConfig,
  User,
} from "../../type/core";
import type { MessageDelta, Prompt, QuerySpec, ValidatedFeedback } from "./models";

export interface MessagePort {
  createUserMessage(input: {
    convId: string;
    authorId: string;
    content: string;
  }): Promise<Message>;
  beginAssistantMessage(convId: string): Promise<Message>;
  appendAssistantDelta(input: { msgId: string; delta: string; seqNo: number }): Promise<void>;
  finalizeAssistantMessage(input: { msgId: string; finalText: string }): Promise<Message>;
  cancelAssistantMessage(msgId: string): Promise<Message>;
  listConversationMessages(input: { convId: string; cursor?: string; limit?: number }): Promise<{
    items: Message[];
    nextCursor?: string;
    lastSeqNo?: number;
  }>;
}

export interface FeedbackPort {
  createFeedback(input: ValidatedFeedback & { visibility?: "ALL" | "OWNER_ONLY" | "MENTOR_ONLY" }): Promise<Feedback>;
  listFeedbacks(input: { msgId: string; cursor?: string; limit?: number }): Promise<{
    items: Feedback[];
    nextCursor?: string;
  }>;
  updateFeedback(input: { feedbackId: string; content: string }): Promise<Feedback>;
}

export interface AuthPort {
  registerUser(input: {
    email: string;
    password: string;
    displayName: string;
    role: User["role"];
  }): Promise<{ userId: string }>;
  loginUser(input: { email: string; password: string }): Promise<{
    accessToken: string;
    refreshToken: string;
    userId: string;
    role: User["role"];
  }>;
  refreshSession(input: { refreshToken: string }): Promise<{
    accessToken: string;
    refreshToken: string;
    userId: string;
    role: User["role"];
  }>;
  logoutUser(input: { accessToken: string }): Promise<void>;
  getUserFromAccessToken(accessToken: string): Promise<{ userId: string; role: User["role"] }>;
}

export interface ConversationPort {
  getConversation(convId: string): Promise<Conversation | null>;
  touchLastActive(convId: string): Promise<void>;
  listMentorConversations(input: { mentorId: string }): Promise<Conversation[]>;
}

export interface MentorAssignmentPort {
  listActiveAssignments(input: { mentorId?: string; newhireId?: string }): Promise<MentorAssignment[]>;
}

export interface LLMPort {
  streamGenerate(input: {
    prompt: Prompt;
    modelId?: string;
    runtimeId?: string;
    signal?: AbortSignal;
  }): AsyncIterable<MessageDelta>;
}

export interface ModelConfigPort {
  listModelConfigs(): Promise<ModelConfig[]>;
  listRuntimes(): Promise<LLMRuntime[]>;
}

export interface StudentSummary {
  newhire: User;
  conversation: Conversation;
  recentMessage?: Message;
  needsReview: boolean;
  totalChats: number;
  lastActivityAt: string;
}

export interface MentorDashboardPort {
  listStudentSummaries(input: { mentorId: string }): Promise<StudentSummary[]>;
  submitFeedbackQuality(input: { mentorId: string; studentId: string; isPositive: boolean }): Promise<void>;
}

export interface FeedbackLookupPort {
  getUserDisplayName(userId: string): Promise<string | null>;
}
