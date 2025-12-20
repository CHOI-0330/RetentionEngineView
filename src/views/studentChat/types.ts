/**
 * StudentChat View 共通型定義
 */

import type { Feedback } from "../../domain/core";
import type { StudentChatViewModel } from "../../interfaceAdapters/services/StudentChatService";
import type { UseCaseFailure } from "../../application/entitle/models";

/**
 * View 状態
 */
export interface StudentChatViewStatus {
  isSending: boolean;
  isAwaitingAssistant: boolean;
  error: UseCaseFailure | null;
}

/**
 * View アクション
 */
export interface StudentChatViewActions {
  setNewMessage: (value: string) => void;
  sendMessage: () => Promise<void>;
  selectConversation: (convId: string) => Promise<void>;
  createConversation: (title: string) => Promise<void>;
  deleteConversation: (convId: string) => Promise<void>;
  clearError: () => void;
  reload: () => Promise<void>;
}

/**
 * 無限スクロール制御
 */
export interface InfiniteScrollState {
  hasOlderMessages: boolean;
  isLoadingOlder: boolean;
  loadOlderMessages: () => void;
}

/**
 * フィードバック操作
 */
export interface FeedbackActions {
  feedbacks: Record<string, Feedback[]>;
  isLoading: (msgId: string) => boolean;
  isSubmitting: (msgId: string) => boolean;
  getInput: (msgId: string) => string;
  setInput: (msgId: string, value: string) => void;
  loadFeedbacks: (msgId: string) => Promise<void>;
  submitFeedback: (msgId: string) => Promise<void>;
}

/**
 * View Props
 */
export interface StudentChatViewProps {
  viewModel: StudentChatViewModel;
  newMessage: string;
  status: StudentChatViewStatus;
  actions: StudentChatViewActions;
  requireWebSearch: boolean;
  onRequireWebSearchChange: (value: boolean) => void;
  feedback: FeedbackActions;
  infiniteScroll?: InfiniteScrollState;
}
