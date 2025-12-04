import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Conversation, Feedback, Message, MentorAssignment, MessageSources, User } from "../../domain/core";
import type { SearchSettings } from "../gateways/api/StudentChatGateway";
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
      payload: { prompt: Prompt; modelId?: string; runtimeId?: string; convId?: string; searchSettings?: SearchSettings };
    }
  | {
      id: string;
      kind: "REQUEST_FINALIZE_ASSISTANT_MESSAGE";
      payload: { msgId: string; finalText: string; sources?: MessageSources };
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
  // Hybrid RAG 設定
  searchSettings: SearchSettings;
  // ウェブ検索確認待機状態
  pendingWebSearchConfirmation?: {
    question: string;
    reason: string;
    labels?: {
      confirm: string;
      cancel: string;
    };
  } | null;
}

export interface StudentChatControllerActions {
  setNewMessage: (value: string) => void;
  sendMessage: () => void;
  acknowledgeEffect: (effectId: string) => void;
  requestOlderMessages: () => void;
  notifyMessagesLoaded: (input: { items: Message[]; nextCursor?: string }) => void;
  notifyUserMessagePersisted: (message: Message) => void;
  notifyAssistantMessageCreated: (message: Message) => void;
  notifyAssistantResponseReady: (finalText: string, sources?: MessageSources) => void;
  notifyAssistantResponseCancelled: () => void;
  syncAssistantMessage: (message: Message) => void;
  enqueueAssistantAfterUserMessage: (message: Message) => void;
  requestFeedbackForMessage: (msgId: string) => void;
  applyFeedbackForMessage: (msgId: string, feedbacks: Feedback[], authorNames?: Record<string, string>) => void;
  requestCreateFeedback: (content: string, targetMessage: Message) => void;
  clearError: () => void;
  reportExternalFailure: (error: UseCaseFailure) => void;
  // Hybrid RAG 設定アクション
  setSearchSettings: (settings: Partial<SearchSettings>) => void;
  // ウェブ検索確認アクション
  showWebSearchConfirmation: (question: string, reason: string, labels?: { confirm: string; cancel: string }) => void;
  confirmWebSearch: () => void;
  cancelWebSearch: () => void;
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
    // Hybrid RAG デフォルト設定
    searchSettings: {
      enableFileSearch: true,
      allowWebSearch: false,
      executeWebSearch: false,
    },
    pendingWebSearchConfirmation: null,
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
        return null;
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
        return null;
      }
      return {
        prompt: promptResult.value,
      };
    },
    [conversation, currentUser, historyWindow, modelId, mutateState, runtimeId]
  );

  const notifyUserMessagePersisted = useCallback(
    (message: Message) => {
      setState((previous) => {
        const merged = sortMessagesAscending([...previous.messages, message]);
        return {
          ...previous,
          messages: merged,
          isSending: false,
          pendingUserMessage: null,
        };
      });
    },
    []
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
    (finalText: string, sources?: MessageSources) => {
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
              payload: { msgId: activeId, finalText, sources },
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

  const enqueueAssistantAfterUserMessage = useCallback(
    (userMessage: Message) => {
      setState((previous) => {
        const messagesWithUser = sortMessagesAscending([...previous.messages]);
        const prep = enqueueAssistantPreparation(messagesWithUser, userMessage.content);
        if (!prep) {
          return previous;
        }
        const beginEffect = createEffect({
          kind: "REQUEST_BEGIN_ASSISTANT_MESSAGE",
          payload: { convId: conversation.convId },
        });
        const generateEffect = createEffect({
          kind: "REQUEST_GENERATE_ASSISTANT_RESPONSE",
          payload: {
            prompt: prep.prompt,
            modelId,
            runtimeId,
            convId: conversation.convId,
            searchSettings: previous.searchSettings,
          },
        });
        const nextPendingEffects = [...previous.pendingEffects, beginEffect, generateEffect];
        return {
          ...previous,
          isAwaitingAssistant: true,
          pendingEffects: nextPendingEffects,
        };
      });
    },
    [conversation.convId, createEffect, enqueueAssistantPreparation, modelId, runtimeId]
  );

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

  // Hybrid RAG 設定アクション
  const setSearchSettings = useCallback(
    (settings: Partial<SearchSettings>) => {
      mutateState((previous) => {
        const newSettings = { ...previous.searchSettings, ...settings };
        return {
          ...previous,
          searchSettings: newSettings,
        };
      });
    },
    [mutateState]
  );

  // ウェブ検索確認ダイアログアクション
  const showWebSearchConfirmation = useCallback(
    (question: string, reason: string, labels?: { confirm: string; cancel: string }) => {
      mutateState((previous) => ({
        ...previous,
        pendingWebSearchConfirmation: { question, reason, labels },
      }));
    },
    [mutateState]
  );

  const confirmWebSearch = useCallback(() => {
    setState((previous) => {
      if (!previous.pendingWebSearchConfirmation) {
        return previous;
      }

      // pendingWebSearchConfirmationに保存された元の質問を使用
      const originalQuestion = previous.pendingWebSearchConfirmation.question;

      // ウェブ検索実行設定を有効化
      const updatedSettings = { ...previous.searchSettings, executeWebSearch: true };

      // 新しいリクエストを生成（元の質問で検索）
      const messagesWithUser = sortMessagesAscending([...previous.messages]);
      const promptResult = buildPromptForConversationUseCase({
        user: currentUser,
        conversation,
        messages: messagesWithUser,
        question: originalQuestion,
        historyWindow,
      });

      if (promptResult.kind === "failure") {
        return {
          ...previous,
          error: promptResult.error,
          pendingWebSearchConfirmation: null,
        };
      }

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
          convId: conversation.convId,
          searchSettings: updatedSettings,
        },
      });

      return {
        ...previous,
        searchSettings: updatedSettings,
        pendingWebSearchConfirmation: null,
        isAwaitingAssistant: true,
        pendingEffects: [...previous.pendingEffects, beginEffect, generateEffect],
      };
    });
  }, [conversation, createEffect, currentUser, historyWindow, modelId, runtimeId]);

  const cancelWebSearch = useCallback(() => {
    mutateState((previous) => ({
      ...previous,
      pendingWebSearchConfirmation: null,
    }));
  }, [mutateState]);

  // pendingEffectsの自動クリーンアップ（60秒後に未処理のeffectを削除）
  const effectTimestampsRef = useRef<Map<string, number>>(new Map());
  const EFFECT_TIMEOUT_MS = 60000;

  useEffect(() => {
    // 新しいeffectにタイムスタンプを設定
    const now = Date.now();
    for (const effect of state.pendingEffects) {
      if (!effectTimestampsRef.current.has(effect.id)) {
        effectTimestampsRef.current.set(effect.id, now);
      }
    }

    // タイムアウトしたeffectを検出して削除
    const expiredEffectIds: string[] = [];
    for (const [effectId, timestamp] of effectTimestampsRef.current) {
      if (now - timestamp > EFFECT_TIMEOUT_MS) {
        expiredEffectIds.push(effectId);
      }
    }

    if (expiredEffectIds.length > 0) {
      // タイムスタンプマップからも削除
      for (const id of expiredEffectIds) {
        effectTimestampsRef.current.delete(id);
      }
      // stateから期限切れeffectを削除
      mutateState((previous) => ({
        ...previous,
        pendingEffects: previous.pendingEffects.filter((e) => !expiredEffectIds.includes(e.id)),
      }));
    }

    // 処理済みeffectのタイムスタンプをクリーンアップ
    const currentEffectIds = new Set(state.pendingEffects.map((e) => e.id));
    for (const effectId of effectTimestampsRef.current.keys()) {
      if (!currentEffectIds.has(effectId)) {
        effectTimestampsRef.current.delete(effectId);
      }
    }
  }, [state.pendingEffects, mutateState]);

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
      enqueueAssistantAfterUserMessage,
      requestFeedbackForMessage,
      applyFeedbackForMessage,
      requestCreateFeedback,
      clearError,
      reportExternalFailure,
      setSearchSettings,
      showWebSearchConfirmation,
      confirmWebSearch,
      cancelWebSearch,
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
      enqueueAssistantAfterUserMessage,
      reportExternalFailure,
      requestCreateFeedback,
      requestFeedbackForMessage,
      requestOlderMessages,
      sendMessage,
      setNewMessage,
      setSearchSettings,
      showWebSearchConfirmation,
      confirmWebSearch,
      cancelWebSearch,
    ]
  );

  return {
    state,
    actions,
  };
};
