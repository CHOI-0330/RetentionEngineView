/**
 * API Gateway 공통 타입 정의
 */

import type {
  User,
  Message,
  Feedback,
  Conversation,
  MentorAssignment,
  FileSearchSource,
} from "../../../domain/core";

// ============================================
// Gateway 설정
// ============================================

export interface GatewayConfig {
  accessToken?: string;
}

// ============================================
// Bootstrap 데이터 타입
// ============================================

export interface ConversationOption {
  convId: string;
  title: string;
  lastActiveAt: string;
}

export interface MentorOption {
  mentorId: string;
  displayName: string;
  email?: string;
}

export interface StudentChatBootstrap {
  conversation: Conversation | null;
  currentUser: User;
  initialMessages: Message[];
  initialFeedbacks: Record<string, Feedback[]>;
  authorNames: Record<string, string>;
  mentorAssignments: MentorAssignment[];
  availableConversations: ConversationOption[];
  availableMentors: MentorOption[];
}

// ============================================
// LLM 관련 타입
// ============================================

/**
 * 검색 설정 (Hybrid RAG)
 */
export interface SearchSettings {
  requireWebSearch: boolean; // Web検索を要求するか (기본값: false)
}

/**
 * ウェブ検索ソース
 */
export interface WebSource {
  title: string;
  url: string;
  snippet?: string;
}

/**
 * レスポンスソース
 */
export interface ResponseSources {
  fileSearch?: FileSearchSource[]; // [{ fileName: "...", chunks: [...] }]
  webSearch?: WebSource[]; // [{ title: "...", url: "..." }]
}

/**
 * 응답 타입
 */
export enum ResponseType {
  ANSWER = "ANSWER",
}

/**
 * トリガー検出結果 (暗黙知の兆候)
 */
export interface TriggerDetectionResult {
  detected: boolean;
  triggerType: string | null;
  confidence: number;
  excerpt: string | null;
  followUpQuestion?: string;
}

/**
 * Story 2-10: 自動ヒアリングセッション応答
 * KC候補構造（ヒアリング完了時に含まれる）
 */
export interface TriggerKCCandidate {
  title: string;
  situation: string;
  knowhow: string;
  precaution: string;
  tags: string[];
  importance?: string;
  example?: string;
}

/**
 * Story 2-10: トリガーセッション状態
 * サーバー側のヒアリングセッション状態を反映
 */
export interface TriggerSessionResponse {
  /** セッションID */
  id: string;
  /** 状態: hearing=ヒアリング中, ready=KC準備完了, created=保存済, dismissed=無視 */
  status: "hearing" | "ready" | "created" | "dismissed";
  /** 現在のヒアリングラウンド (1-3) */
  hearingRound: number;
  /** トリガーが発生したユーザーメッセージID（星表示用） */
  triggerMsgId?: string;
  /** KC候補（ready状態時のみ） */
  kcCandidate?: TriggerKCCandidate;
}

/**
 * LLM 응답 DTO
 */
export interface LLMGenerateResponse {
  type: ResponseType;
  answer: string;
  sources?: ResponseSources;
  triggerDetection?: TriggerDetectionResult;
  /** Story 2-10: 自動ヒアリングセッション状態 */
  triggerSession?: TriggerSessionResponse;
}

// ============================================
// SSE (Server-Sent Events) ストリーミング型
// ============================================

/**
 * SSEイベントタイプ
 */
export type SSEEventType = "step" | "chunk" | "sources" | "done" | "error" | "trigger" | "session";

/**
 * パイプラインステップ識別子
 */
export type PipelineStep = "file_search" | "web_search" | "synthesis";

/**
 * SSEエラー情報
 */
export interface SSEEventError {
  code: string;
  message: string;
  retryable: boolean;
}

/**
 * SSEイベントメタデータ
 */
export interface SSEEventMetadata {
  step?: PipelineStep;
  sources?: ResponseSources;
  error?: SSEEventError;
  triggerDetection?: TriggerDetectionResult;
  triggerSession?: TriggerSessionResponse;
}

/**
 * SSEイベント
 *
 * ストリーミングレスポンスで使用される個々のイベント
 */
export interface SSEEvent {
  type: SSEEventType;
  data: string;
  metadata?: SSEEventMetadata;
}
