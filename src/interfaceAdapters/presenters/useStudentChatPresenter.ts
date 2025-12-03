import { useMemo } from "react";

import type { Feedback, Message } from "../../domain/core";
import type { UseCaseFailure } from "../../application/entitle/models";
import type {
  StudentChatController,
  StudentChatControllerEffect,
} from "../controllers/useStudentChatController";

export type StudentChatMessageSender = "student" | "ai";

export interface StudentChatMessageView {
  id: string;
  content: string;
  format: "markdown" | "text";
  sender: StudentChatMessageSender;
  timestamp: Date;
  status?: Message["status"];
}

export interface StudentChatFeedbackView {
  id: string;
  messageId: string;
  content: string;
  authorName: string;
  timestamp: Date;
  status: "pending" | "reviewed" | "applied";
}

export interface StudentChatViewModel {
  messages: StudentChatMessageView[];
  mentorFeedbacks: StudentChatFeedbackView[];
  newMessage: string;
  onChangeNewMessage: (value: string) => void;
  onSend: () => void;
}

export interface StudentChatPresenterStatus {
  isSending: boolean;
  isAwaitingAssistant: boolean;
  error: UseCaseFailure | null;
}

export interface StudentChatPresenterMeta {
  canSend: boolean;
  hasMoreHistory: boolean;
  isHistoryLoading: boolean;
}

export interface StudentChatPresenterInteractions {
  acknowledgeEffect: (effectId: string) => void;
  requestOlderMessages: () => void;
  requestFeedbackForMessage: (msgId: string) => void;
  applyFeedbackForMessage: (msgId: string, feedbacks: Feedback[], authorNames?: Record<string, string>) => void;
  requestCreateFeedback: (content: string, message: Message) => void;
  clearError: () => void;
  reportExternalFailure: (error: UseCaseFailure) => void;
}

export interface StudentChatPresenterOutput {
  viewModel: StudentChatViewModel;
  pendingEffects: StudentChatControllerEffect[];
  status: StudentChatPresenterStatus;
  meta: StudentChatPresenterMeta;
  interactions: StudentChatPresenterInteractions;
}

const toMessageView = (message: Message): StudentChatMessageView => ({
  id: message.msgId,
  content: message.content,
  format: message.role === "ASSISTANT" ? "markdown" : "text",
  sender: message.role === "ASSISTANT" ? "ai" : "student",
  timestamp: new Date(message.createdAt),
  status: message.role === "ASSISTANT" ? message.status ?? "DONE" : message.status,
});

const toFeedbackView = (
  feedback: Feedback,
  authorName: string
): StudentChatFeedbackView => ({
  id: feedback.fbId,
  messageId: feedback.targetMsgId,
  content: feedback.content,
  authorName,
  timestamp: new Date(feedback.createdAt),
  status: feedback.visibility === "ALL" ? "applied" : "reviewed",
});

export const useStudentChatPresenter = (controller: StudentChatController): StudentChatPresenterOutput => {
  const { state, actions } = controller;

  const messages = useMemo(() => state.messages.map(toMessageView), [state.messages]);

  const mentorFeedbacks = useMemo(() => {
    const items: StudentChatFeedbackView[] = [];
    for (const [, feedbacks] of Object.entries(state.feedbackByMessageId)) {
      for (const feedback of feedbacks) {
        const authorName = state.authorNames[feedback.authorId] ?? feedback.authorId;
        items.push(toFeedbackView(feedback, authorName));
      }
    }
    return items;
  }, [state.authorNames, state.feedbackByMessageId]);

  // meta 계산 (조건 로직이 있어 useMemo 유지)
  const meta = useMemo<StudentChatPresenterMeta>(() => {
    const hasMoreHistory = Boolean(state.nextCursor);
    const isHistoryLoading = state.pendingEffects.some((effect) => effect.kind === "REQUEST_LIST_MESSAGES");
    const canSend = state.newMessage.trim().length > 0 && !state.isSending && !state.isAwaitingAssistant;
    return { canSend, hasMoreHistory, isHistoryLoading };
  }, [state.nextCursor, state.pendingEffects, state.newMessage, state.isAwaitingAssistant, state.isSending]);

  // 단순 객체들은 직접 반환
  return {
    viewModel: {
      messages,
      mentorFeedbacks,
      newMessage: state.newMessage,
      onChangeNewMessage: actions.setNewMessage,
      onSend: actions.sendMessage,
    },
    pendingEffects: state.pendingEffects,
    status: {
      isSending: state.isSending,
      isAwaitingAssistant: state.isAwaitingAssistant,
      error: state.error,
    },
    meta,
    interactions: {
      acknowledgeEffect: actions.acknowledgeEffect,
      requestOlderMessages: actions.requestOlderMessages,
      requestFeedbackForMessage: actions.requestFeedbackForMessage,
      applyFeedbackForMessage: actions.applyFeedbackForMessage,
      requestCreateFeedback: actions.requestCreateFeedback,
      clearError: actions.clearError,
      reportExternalFailure: actions.reportExternalFailure,
    },
  };
};
