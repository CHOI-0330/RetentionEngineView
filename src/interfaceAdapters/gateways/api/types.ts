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
 * LLM 응답 DTO
 */
export interface LLMGenerateResponse {
  type: ResponseType;
  answer: string;
  sources?: ResponseSources;
}
