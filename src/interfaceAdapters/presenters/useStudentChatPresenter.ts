import { useCallback, useMemo } from "react";

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
  sender: message.role === "ASSISTANT" ? "ai" : "student",
  timestamp: new Date(message.createdAt),
  status: message.status,
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
    for (const [msgId, feedbacks] of Object.entries(state.feedbackByMessageId)) {
      for (const feedback of feedbacks) {
        const authorName = state.authorNames[feedback.authorId] ?? feedback.authorId;
        items.push(toFeedbackView(feedback, authorName));
      }
    }
    return items;
  }, [state.authorNames, state.feedbackByMessageId]);

  const handleChangeNewMessage = useCallback(
    (value: string) => {
      actions.setNewMessage(value);
    },
    [actions]
  );

  const handleSend = useCallback(() => {
    actions.sendMessage();
  }, [actions]);

  const viewModel = useMemo<StudentChatViewModel>(
    () => ({
      messages,
      mentorFeedbacks,
      newMessage: state.newMessage,
      onChangeNewMessage: handleChangeNewMessage,
      onSend: handleSend,
    }),
    [handleChangeNewMessage, handleSend, mentorFeedbacks, messages, state.newMessage]
  );

  const status = useMemo<StudentChatPresenterStatus>(
    () => ({
      isSending: state.isSending,
      isAwaitingAssistant: state.isAwaitingAssistant,
      error: state.error,
    }),
    [state.error, state.isAwaitingAssistant, state.isSending]
  );

  const meta = useMemo<StudentChatPresenterMeta>(() => {
    const hasMoreHistory = Boolean(state.nextCursor);
    const isHistoryLoading = state.pendingEffects.some((effect) => effect.kind === "REQUEST_LIST_MESSAGES");
    const canSend = state.newMessage.trim().length > 0 && !state.isSending && !state.isAwaitingAssistant;
    return {
      canSend,
      hasMoreHistory,
      isHistoryLoading,
    };
  }, [state.nextCursor, state.pendingEffects, state.newMessage, state.isAwaitingAssistant, state.isSending]);

  const interactions = useMemo<StudentChatPresenterInteractions>(
    () => ({
      acknowledgeEffect: actions.acknowledgeEffect,
      requestOlderMessages: actions.requestOlderMessages,
      requestFeedbackForMessage: actions.requestFeedbackForMessage,
      applyFeedbackForMessage: actions.applyFeedbackForMessage,
      requestCreateFeedback: actions.requestCreateFeedback,
      clearError: actions.clearError,
      reportExternalFailure: actions.reportExternalFailure,
    }),
    [
      actions.acknowledgeEffect,
      actions.applyFeedbackForMessage,
      actions.clearError,
      actions.reportExternalFailure,
      actions.requestCreateFeedback,
      actions.requestFeedbackForMessage,
      actions.requestOlderMessages,
    ]
  );

  return {
    viewModel,
    pendingEffects: state.pendingEffects,
    status,
    meta,
    interactions,
  };
};
