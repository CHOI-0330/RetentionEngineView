import { useCallback, useMemo, useRef, useState } from "react";

import type { Conversation, Feedback, Message, MentorAssignment, User } from "../../type/core";
import {
  appendAssistantDeltaUseCase,
  beginAssistantMessageUseCase,
  buildPromptForConversationUseCase,
  cancelAssistantMessageUseCase,
  createFeedbackUseCase,
  createUserMessageUseCase,
  finalizeAssistantMessageUseCase,
  listConversationMessagesUseCase,
  listMessageFeedbacksUseCase,
  validateFeedbackRulesUseCase,
} from "../../application/entitle/useCases";
import type { MessageDelta, Prompt, UseCaseFailure, ValidatedFeedback } from "../../application/entitle/models";

const DEFAULT_HISTORY_WINDOW = 6;

const sortMessagesAscending = (entries: Message[]) =>
  entries.sort((a, b) => {
    if (a.createdAt === b.createdAt) {
      return a.msgId.localeCompare(b.msgId);
    }
    return a.createdAt < b.createdAt ? -1 : 1;
  });

export type StudentChatControllerEffect =
  | {
      id: string;
      kind: "REQUEST_PERSIST_USER_MESSAGE";
      payload: { convId: string; authorId: string; content: string };
    }
  | {
      id: string;
      kind: "REQUEST_BEGIN_ASSISTANT_MESSAGE";
      payload: { convId: string };
    }
  | {
      id: string;
      kind: "REQUEST_STREAM_ASSISTANT_RESPONSE";
      payload: { prompt: Prompt; modelId?: string; runtimeId?: string };
    }
  | {
      id: string;
      kind: "REQUEST_FINALIZE_ASSISTANT_MESSAGE";
      payload: { msgId: string; finalText: string };
    }
  | {
      id: string;
      kind: "REQUEST_CANCEL_ASSISTANT_MESSAGE";
      payload: { msgId: string };
    }
  | {
      id: string;
      kind: "REQUEST_LIST_MESSAGES";
      payload: { convId: string; cursor?: string };
    }
  | {
      id: string;
      kind: "REQUEST_LIST_FEEDBACKS";
      payload: { msgId: string };
    }
  | {
      id: string;
      kind: "REQUEST_CREATE_FEEDBACK";
      payload: ValidatedFeedback;
    };

export interface StudentChatControllerState {
  messages: Message[];
  feedbackByMessageId: Record<string, Feedback[]>;
  authorNames: Record<string, string>;
  newMessage: string;
  isSending: boolean;
  isAwaitingAssistant: boolean;
  isStreaming: boolean;
  pendingEffects: StudentChatControllerEffect[];
  error: UseCaseFailure | null;
  nextCursor?: string;
  activeAssistantMessageId?: string | null;
  pendingUserMessage?: { convId: string; authorId: string; content: string } | null;
  assistantSeqByMessageId: Record<string, number>;
}

export interface StudentChatControllerActions {
  setNewMessage: (value: string) => void;
  sendMessage: () => void;
  acknowledgeEffect: (effectId: string) => void;
  requestOlderMessages: () => void;
  notifyMessagesLoaded: (input: { items: Message[]; nextCursor?: string }) => void;
  notifyUserMessagePersisted: (message: Message) => void;
  notifyAssistantMessageCreated: (message: Message) => void;
  notifyAssistantDelta: (delta: MessageDelta) => void;
  notifyAssistantStreamCompleted: (finalText: string) => void;
  notifyAssistantStreamCancelled: () => void;
  syncAssistantMessage: (message: Message) => void;
  requestFeedbackForMessage: (msgId: string) => void;
  applyFeedbackForMessage: (msgId: string, feedbacks: Feedback[], authorNames?: Record<string, string>) => void;
  requestCreateFeedback: (content: string, targetMessage: Message) => void;
  clearError: () => void;
  reportExternalFailure: (error: UseCaseFailure) => void;
}

export interface UseStudentChatControllerParams {
  conversation: Conversation;
  currentUser: User;
  mentorAssignments?: MentorAssignment[];
  initialMessages?: Message[];
  initialFeedbacks?: Record<string, Feedback[]>;
  initialAuthorNames?: Record<string, string>;
  initialCursor?: string;
  historyWindow?: number;
  modelId?: string;
  runtimeId?: string;
}

export interface StudentChatController {
  state: StudentChatControllerState;
  actions: StudentChatControllerActions;
}

export const useStudentChatController = (params: UseStudentChatControllerParams): StudentChatController => {
  const {
    conversation,
    currentUser,
    mentorAssignments,
    initialMessages,
    initialFeedbacks,
    initialAuthorNames,
    initialCursor,
    historyWindow = DEFAULT_HISTORY_WINDOW,
    modelId,
    runtimeId,
  } = params;

  const effectIdRef = useRef(0);
  const createEffect = useCallback(
    (effect: Omit<StudentChatControllerEffect, "id">): StudentChatControllerEffect =>
      ({
        id: `student-chat-effect-${effectIdRef.current++}`,
        ...effect,
      } as StudentChatControllerEffect),
    []
  );

  const [state, setState] = useState<StudentChatControllerState>(() => ({
    messages: initialMessages ?? [],
    feedbackByMessageId: initialFeedbacks ?? {},
    authorNames: initialAuthorNames ?? {},
    newMessage: "",
    isSending: false,
    isAwaitingAssistant: false,
    isStreaming: false,
    pendingEffects: [],
    error: null,
    nextCursor: initialCursor,
    activeAssistantMessageId: null,
    pendingUserMessage: null,
    assistantSeqByMessageId: {},
  }));

  const mutateState = useCallback((updater: (previous: StudentChatControllerState) => StudentChatControllerState) => {
    setState((previous) => updater(previous));
  }, []);

  const setNewMessage = useCallback((value: string) => {
    mutateState((previous) => ({
      ...previous,
      newMessage: value,
    }));
  }, [mutateState]);

  const sendMessage = useCallback(() => {
    setState((previous) => {
      if (previous.isSending) {
        return previous;
      }
      const result = createUserMessageUseCase({
        user: currentUser,
        conversation,
        content: previous.newMessage,
      });
      if (result.kind === "failure") {
        return { ...previous, error: result.error };
      }
      const nextEffect = createEffect({
        kind: "REQUEST_PERSIST_USER_MESSAGE",
        payload: {
          convId: result.value.convId,
          authorId: result.value.authorId,
          content: result.value.content,
        },
      });
      return {
        ...previous,
        newMessage: "",
        isSending: true,
        error: null,
        pendingEffects: [...previous.pendingEffects, nextEffect],
        pendingUserMessage: result.value,
      };
    });
  }, [conversation, createEffect, currentUser]);

  const acknowledgeEffect = useCallback((effectId: string) => {
    mutateState((previous) => ({
      ...previous,
      pendingEffects: previous.pendingEffects.filter((effect) => effect.id !== effectId),
    }));
  }, [mutateState]);

  const requestOlderMessages = useCallback(() => {
    setState((previous) => {
      if (!previous.nextCursor) {
        return previous;
      }
      const queryResult = listConversationMessagesUseCase({
        requester: currentUser,
        conversation,
        mentorAssignments,
        cursor: previous.nextCursor,
      });
      if (queryResult.kind === "failure") {
        return { ...previous, error: queryResult.error };
      }
      const effect = createEffect({
        kind: "REQUEST_LIST_MESSAGES",
        payload: { convId: conversation.convId, cursor: previous.nextCursor },
      });
      return {
        ...previous,
        pendingEffects: [...previous.pendingEffects, effect],
      };
    });
  }, [conversation, createEffect, currentUser, mentorAssignments]);

  const notifyMessagesLoaded = useCallback(
    (input: { items: Message[]; nextCursor?: string }) => {
      mutateState((previous) => {
        const existingIds = new Set(previous.messages.map((item) => item.msgId));
        const merged = [...previous.messages];
        for (const item of input.items) {
          if (!existingIds.has(item.msgId)) {
            merged.push(item);
          }
        }
        sortMessagesAscending(merged);
        return {
          ...previous,
          messages: merged,
          nextCursor: input.nextCursor,
        };
      });
    },
    [mutateState]
  );

  const enqueueAssistantPreparation = useCallback(
    (messagesWithUser: Message[], userMessageContent: string) => {
      const promptResult = buildPromptForConversationUseCase({
        user: currentUser,
        conversation,
        messages: messagesWithUser,
        question: userMessageContent,
        historyWindow,
      });
      if (promptResult.kind === "failure") {
        mutateState((previous) => ({
          ...previous,
          error: promptResult.error,
        }));
        return;
      }
      const beginResult = beginAssistantMessageUseCase({
        conversation,
        requester: currentUser,
      });
      if (beginResult.kind === "failure") {
        mutateState((previous) => ({
          ...previous,
          error: beginResult.error,
        }));
        return;
      }
      setState((previous) => ({
        ...previous,
        isAwaitingAssistant: true,
        pendingEffects: [
          ...previous.pendingEffects,
          createEffect({ kind: "REQUEST_BEGIN_ASSISTANT_MESSAGE", payload: { convId: conversation.convId } }),
          createEffect({
            kind: "REQUEST_STREAM_ASSISTANT_RESPONSE",
            payload: {
              prompt: promptResult.value,
              modelId,
              runtimeId,
            },
          }),
        ],
      }));
    },
    [conversation, createEffect, currentUser, historyWindow, modelId, mutateState, runtimeId]
  );

  const notifyUserMessagePersisted = useCallback(
    (message: Message) => {
      setState((previous) => {
        const merged = sortMessagesAscending([...previous.messages, message]);
        enqueueAssistantPreparation(merged, message.content);
        return {
          ...previous,
          messages: merged,
          isSending: false,
          pendingUserMessage: null,
        };
      });
    },
    [enqueueAssistantPreparation]
  );

  const notifyAssistantMessageCreated = useCallback(
    (message: Message) => {
      if (message.role !== "ASSISTANT") {
        mutateState((previous) => ({
          ...previous,
          error: {
            kind: "ValidationError",
            message: "Assistant message must have role ASSISTANT.",
          },
        }));
        return;
      }
      mutateState((previous) => {
        const updated = [...previous.messages];
        const index = updated.findIndex((item) => item.msgId === message.msgId);
        if (index >= 0) {
          updated[index] = message;
        } else {
          updated.push(message);
        }
        sortMessagesAscending(updated);
        return {
          ...previous,
          messages: updated,
          isAwaitingAssistant: false,
          activeAssistantMessageId: message.msgId,
          assistantSeqByMessageId: {
            ...previous.assistantSeqByMessageId,
            [message.msgId]: 0,
          },
        };
      });
    },
    [mutateState]
  );

  const notifyAssistantDelta = useCallback(
    (delta: MessageDelta) => {
      mutateState((previous) => {
        const activeId = previous.activeAssistantMessageId;
        if (!activeId) {
          return previous;
        }
        const index = previous.messages.findIndex((item) => item.msgId === activeId);
        if (index < 0) {
          return previous;
        }
        const target = previous.messages[index];
        const appendResult = appendAssistantDeltaUseCase({
          message: target,
          delta,
          lastSeqNo: previous.assistantSeqByMessageId[target.msgId],
        });
        if (appendResult.kind === "failure") {
          return {
            ...previous,
            error: appendResult.error,
          };
        }
        const updated = [...previous.messages];
        updated[index] = appendResult.value.message;
      return {
        ...previous,
        messages: updated,
        isStreaming: true,
        assistantSeqByMessageId: {
            ...previous.assistantSeqByMessageId,
            [target.msgId]: delta.seqNo,
          },
        };
      });
    },
    [mutateState]
  );

  const notifyAssistantStreamCompleted = useCallback(
    (finalText: string) => {
      setState((previous) => {
        const activeId = previous.activeAssistantMessageId;
        if (!activeId) {
          return previous;
        }
        const index = previous.messages.findIndex((item) => item.msgId === activeId);
        if (index < 0) {
          return previous;
        }
        const finalizeResult = finalizeAssistantMessageUseCase({
          message: previous.messages[index],
          finalText,
        });
        if (finalizeResult.kind === "failure") {
          return { ...previous, error: finalizeResult.error };
        }
        const updatedMessages = [...previous.messages];
        updatedMessages[index] = finalizeResult.value;
        return {
          ...previous,
          messages: updatedMessages,
          isStreaming: false,
          isAwaitingAssistant: false,
          pendingEffects: [
            ...previous.pendingEffects,
            createEffect({
              kind: "REQUEST_FINALIZE_ASSISTANT_MESSAGE",
              payload: { msgId: finalizeResult.value.msgId, finalText: finalizeResult.value.content },
            }),
          ],
        };
      });
    },
    [createEffect]
  );

  const notifyAssistantStreamCancelled = useCallback(() => {
    setState((previous) => {
      const activeId = previous.activeAssistantMessageId;
      if (!activeId) {
        return previous;
      }
      const index = previous.messages.findIndex((item) => item.msgId === activeId);
      if (index < 0) {
        return previous;
      }
      const cancelResult = cancelAssistantMessageUseCase({
        message: previous.messages[index],
      });
      if (cancelResult.kind === "failure") {
        return { ...previous, error: cancelResult.error };
      }
      const updatedMessages = [...previous.messages];
      updatedMessages[index] = cancelResult.value;
      return {
        ...previous,
        messages: updatedMessages,
        isStreaming: false,
        isAwaitingAssistant: false,
        activeAssistantMessageId: null,
        pendingEffects: [
          ...previous.pendingEffects,
          createEffect({ kind: "REQUEST_CANCEL_ASSISTANT_MESSAGE", payload: { msgId: cancelResult.value.msgId } }),
        ],
      };
    });
  }, [createEffect]);

  const syncAssistantMessage = useCallback(
    (message: Message) => {
      mutateState((previous) => {
        const index = previous.messages.findIndex((item) => item.msgId === message.msgId);
        if (index < 0) {
          return previous;
        }
        const updatedMessages = [...previous.messages];
        updatedMessages[index] = message;
        return {
          ...previous,
          messages: updatedMessages,
        };
      });
    },
    [mutateState]
  );

  const requestFeedbackForMessage = useCallback(
    (msgId: string) => {
      setState((previous) => {
        const message = previous.messages.find((item) => item.msgId === msgId);
        if (!message) {
          return previous;
        }
        const queryResult = listMessageFeedbacksUseCase({
          requester: currentUser,
          conversation,
          targetMessage: message,
          mentorAssignments,
        });
        if (queryResult.kind === "failure") {
          return { ...previous, error: queryResult.error };
        }
        return {
          ...previous,
          pendingEffects: [
            ...previous.pendingEffects,
            createEffect({ kind: "REQUEST_LIST_FEEDBACKS", payload: { msgId } }),
          ],
        };
      });
    },
    [conversation, createEffect, currentUser, mentorAssignments]
  );

  const applyFeedbackForMessage = useCallback(
    (msgId: string, feedbacks: Feedback[], authorNames?: Record<string, string>) => {
      const normalized = feedbacks.length > 0 ? [feedbacks[0]] : [];
      mutateState((previous) => ({
        ...previous,
        feedbackByMessageId: {
          ...previous.feedbackByMessageId,
          [msgId]: normalized,
        },
        authorNames: authorNames ? { ...previous.authorNames, ...authorNames } : previous.authorNames,
      }));
    },
    [mutateState]
  );

  const requestCreateFeedback = useCallback(
    (content: string, targetMessage: Message) => {
      const existingFeedbackCount = state.feedbackByMessageId[targetMessage.msgId]?.length ?? 0;
      const validationResult = validateFeedbackRulesUseCase({
        requester: currentUser,
        conversation,
        targetMessage,
        content,
        mentorAssignments,
        existingFeedbackCount,
      });
      if (validationResult.kind === "failure") {
        mutateState((previous) => ({
          ...previous,
          error: validationResult.error,
        }));
        return;
      }
      const createResult = createFeedbackUseCase({ validated: validationResult.value });
      setState((previous) => ({
        ...previous,
        pendingEffects: [
          ...previous.pendingEffects,
          createEffect({ kind: "REQUEST_CREATE_FEEDBACK", payload: createResult.payload }),
        ],
      }));
    },
    [conversation, createEffect, currentUser, mentorAssignments, mutateState, state.feedbackByMessageId]
  );

  const clearError = useCallback(() => {
    mutateState((previous) => ({
      ...previous,
      error: null,
    }));
  }, [mutateState]);

  const reportExternalFailure = useCallback(
    (error: UseCaseFailure) => {
      mutateState((previous) => ({
        ...previous,
        error,
      }));
    },
    [mutateState]
  );

  const actions = useMemo<StudentChatControllerActions>(
    () => ({
      setNewMessage,
      sendMessage,
      acknowledgeEffect,
      requestOlderMessages,
      notifyMessagesLoaded,
      notifyUserMessagePersisted,
      notifyAssistantMessageCreated,
      notifyAssistantDelta,
      notifyAssistantStreamCompleted,
      notifyAssistantStreamCancelled,
      syncAssistantMessage,
      requestFeedbackForMessage,
      applyFeedbackForMessage,
      requestCreateFeedback,
      clearError,
      reportExternalFailure,
    }),
    [
      acknowledgeEffect,
      applyFeedbackForMessage,
      clearError,
      notifyAssistantDelta,
      notifyAssistantMessageCreated,
      notifyAssistantStreamCancelled,
      notifyAssistantStreamCompleted,
      notifyMessagesLoaded,
      notifyUserMessagePersisted,
      reportExternalFailure,
      requestCreateFeedback,
      requestFeedbackForMessage,
      requestOlderMessages,
      sendMessage,
      setNewMessage,
    ]
  );

  return {
    state,
    actions,
  };
};
