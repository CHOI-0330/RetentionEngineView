import { useCallback, useMemo, useRef, useState } from "react";

import type { Conversation, Feedback, Message, MentorAssignment, User } from "../../domain/core";
import {
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
import type { Prompt, UseCaseFailure, ValidatedFeedback } from "../../application/entitle/models";

const DEFAULT_HISTORY_WINDOW = 6;

const sortMessagesAscending = (entries: Message[]) =>
  entries.sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    if (!Number.isNaN(timeA) && !Number.isNaN(timeB) && timeA !== timeB) {
      return timeA - timeB;
    }
    if (a.createdAt !== b.createdAt) {
      return a.createdAt < b.createdAt ? -1 : 1;
    }
    return 0;
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
      kind: "REQUEST_GENERATE_ASSISTANT_RESPONSE";
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
  pendingEffects: StudentChatControllerEffect[];
  error: UseCaseFailure | null;
  nextCursor?: string;
  activeAssistantMessageId?: string | null;
  pendingUserMessage?: { convId: string; authorId: string; content: string } | null;
}

export interface StudentChatControllerActions {
  setNewMessage: (value: string) => void;
  sendMessage: () => void;
  acknowledgeEffect: (effectId: string) => void;
  requestOlderMessages: () => void;
  notifyMessagesLoaded: (input: { items: Message[]; nextCursor?: string }) => void;
  notifyUserMessagePersisted: (message: Message) => void;
  notifyAssistantMessageCreated: (message: Message) => void;
  notifyAssistantResponseReady: (finalText: string) => void;
  notifyAssistantResponseCancelled: () => void;
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
    pendingEffects: [],
    error: null,
    nextCursor: initialCursor,
    activeAssistantMessageId: null,
    pendingUserMessage: null,
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
    mutateState((previous) => {
      const next = previous.pendingEffects.filter((effect) => effect.id !== effectId);
      console.log("[StudentChat][debug] acknowledgeEffect", { effectId, before: previous.pendingEffects, after: next });
      return {
        ...previous,
        pendingEffects: next,
      };
    });
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
      console.log("[StudentChat][debug] owner check", {
        conversationOwnerId: conversation.ownerId,
        currentUserId: currentUser.userId,
      });
      const promptResult = buildPromptForConversationUseCase({
        user: currentUser,
        conversation,
        messages: messagesWithUser,
        question: userMessageContent,
        historyWindow,
      });
      if (promptResult.kind === "failure") {
        console.warn("[StudentChat][debug] promptResult failure", promptResult.error);
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
        console.warn("[StudentChat][debug] beginAssistantMessageUseCase failure", beginResult.error);
        mutateState((previous) => ({
          ...previous,
          error: beginResult.error,
        }));
        return;
      }
      console.log("[StudentChat][debug] enqueue begin/generate effects", {
        promptMessages: promptResult.value.messages.length,
        modelId,
        runtimeId,
      });
      setState((previous) => {
        const beginEffect = createEffect({
          kind: "REQUEST_BEGIN_ASSISTANT_MESSAGE",
          payload: { convId: conversation.convId },
        });
        const generateEffect = createEffect({
          kind: "REQUEST_GENERATE_ASSISTANT_RESPONSE",
          payload: {
            prompt: promptResult.value,
            modelId,
            runtimeId,
          },
        });
        const nextPendingEffects = [...previous.pendingEffects, beginEffect, generateEffect];
        console.log("[StudentChat][debug] pendingEffects ->", nextPendingEffects);
        return {
          ...previous,
          isAwaitingAssistant: true,
          pendingEffects: nextPendingEffects,
        };
      });
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
        const lastMessage = updated[updated.length - 1];
        const lastTimestamp = lastMessage ? new Date(lastMessage.createdAt).getTime() : null;
        const incomingTimestamp = new Date(message.createdAt).getTime();
        let normalizedCreatedAt = message.createdAt;
        if (
          lastTimestamp != null &&
          !Number.isNaN(lastTimestamp) &&
          (Number.isNaN(incomingTimestamp) || incomingTimestamp <= lastTimestamp)
        ) {
          normalizedCreatedAt = new Date(lastTimestamp + 1).toISOString();
        }
        const assistantMessage: Message = {
          ...message,
          createdAt: normalizedCreatedAt,
        };
        const index = updated.findIndex((item) => item.msgId === message.msgId);
        if (index >= 0) {
          updated[index] = assistantMessage;
        } else {
          updated.push(assistantMessage);
        }
        sortMessagesAscending(updated);
        return {
          ...previous,
          messages: updated,
          isAwaitingAssistant: true,
          activeAssistantMessageId: message.msgId,
        };
      });
    },
    [mutateState]
  );

  const notifyAssistantResponseReady = useCallback(
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
        return {
          ...previous,
          pendingEffects: [
            ...previous.pendingEffects,
            createEffect({
              kind: "REQUEST_FINALIZE_ASSISTANT_MESSAGE",
              payload: { msgId: activeId, finalText },
            }),
          ],
        };
      });
    },
    [createEffect]
  );

  const notifyAssistantResponseCancelled = useCallback(() => {
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
        const findIndexById = (targetId?: string | null) =>
          targetId ? previous.messages.findIndex((item) => item.msgId === targetId) : -1;
        let index = findIndexById(message.msgId);
        if (index < 0) {
          index = findIndexById(previous.activeAssistantMessageId);
        }
        if (index < 0) {
          return previous;
        }
        const updatedMessages = [...previous.messages];
        updatedMessages[index] = message;
        const isFinalized = message.status === "DONE" || message.status === "CANCELLED";
        return {
          ...previous,
          messages: updatedMessages,
          isAwaitingAssistant: isFinalized ? false : previous.isAwaitingAssistant,
          activeAssistantMessageId: isFinalized ? null : message.msgId,
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
      notifyAssistantResponseReady,
      notifyAssistantResponseCancelled,
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
      notifyAssistantMessageCreated,
      notifyAssistantResponseCancelled,
      notifyAssistantResponseReady,
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
