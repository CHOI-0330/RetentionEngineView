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

/**
 * ウェブ検索ソース
 */
export interface WebSource {
  title: string;
  url: string;
  snippet?: string;
}

/**
 * ファイル検索のチャンク情報
 */
export interface FileSearchChunk {
  chunkId?: string;
  text: string;
  pageStart?: number;
  pageEnd?: number;
  confidence?: number;
}

/**
 * ファイル検索ソース (ファイル単位)
 */
export interface FileSearchSource {
  fileName: string;
  documentId?: string;
  chunks: FileSearchChunk[];
}

/**
 * メッセージソース (Hybrid RAG 検索結果)
 */
export interface MessageSources {
  fileSearch?: FileSearchSource[]; // [{ fileName: "...", chunks: [...] }]
  webSearch?: WebSource[]; // [{ title: "...", url: "..." }]
}

export interface Message {
  msgId: string;
  convId: string;
  role: MessageRole;
  content: string;
  status?: AssistantStatus;
  createdAt: string;
  sources?: MessageSources;
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

// ===== AI Avatar Types =====

export type AvatarGender = "female" | "male" | "neutral";

export type AvatarPersonality =
  | "friendly"
  | "professional"
  | "caring"
  | "energetic";

export type AvatarEmotion =
  | "neutral"
  | "happy"
  | "thinking"
  | "surprised"
  | "concerned"
  | "proud";

export type AvatarGenerationStatus =
  | "pending"
  | "generating"
  | "completed"
  | "failed";

export const AVATAR_EMOTIONS: AvatarEmotion[] = [
  "neutral",
  "happy",
  "thinking",
  "surprised",
  "concerned",
  "proud",
];

export interface AvatarSettings {
  id: string;
  userId: string;
  gender: AvatarGender;
  personalityPreset: AvatarPersonality;
  isGenerated: boolean;
  generationStatus: AvatarGenerationStatus;
  generationProgress: number;
  generationSeed?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvatarUrls {
  neutral: string;
  happy: string;
  thinking: string;
  surprised: string;
  concerned: string;
  proud: string;
}

// ===== AI Personality Preset Types =====

/**
 * AI性格プリセット
 * AIのコミュニケーションスタイル（口調・説明の深さ・スタンス）を決定
 */
export interface PersonalityPreset {
  id: string;
  displayName: string;
  description: string;
  sampleDialogue: string;
}

/**
 * ユーザーの性格プリセット設定
 */
export interface UserPersonalityPresetSetting {
  presetId: string | null;
}
