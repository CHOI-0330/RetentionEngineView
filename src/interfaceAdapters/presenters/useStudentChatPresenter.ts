/**
 * StudentChat Presenter V2
 *
 * 新アーキテクチャ：React Hook（React依存層）
 * - Factory経由でServiceを生成
 * - React状態管理
 * - ViewModelをViewに提供
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { toast } from "sonner";

import type {
  User,
  Conversation,
  Message,
  Feedback,
  MentorAssignment,
} from "../../domain/core";
import type { UseCaseFailure } from "../../application/entitle/models";
import type {
  StudentChatBootstrap,
  LLMGenerateResponse,
  SSEEvent,
} from "../gateways/api/types";
import { ResponseType } from "../gateways/api/types";
import { createStudentChatService } from "../../application/entitle/factories/StudentChatFactory";
import type {
  StudentChatViewModel,
  MessageViewModel,
} from "../services/StudentChatService";

// ============================================
// 状態型定義
// ============================================

interface PresenterState {
  bootstrap: StudentChatBootstrap | null;
  activeConversationId: string | null;
  isLoading: boolean;
  error: UseCaseFailure | null;
  // メッセージ送信状態
  isSending: boolean;
  isAwaitingAssistant: boolean;
  newMessage: string;
  // Web検索設定（シンプルなboolean）
  requireWebSearch: boolean;
  // ストリーミング状態
  streamingContent: string;
  streamingStep: string | null;
  // フィードバック状態
  feedbacks: Record<string, Feedback[]>; // msgId -> Feedback[]
  feedbackLoading: Record<string, boolean>; // msgId -> loading
  feedbackInput: Record<string, string>; // msgId -> input text
  feedbackSubmitting: Record<string, boolean>; // msgId -> submitting
}

// ============================================
// Props型定義
// ============================================

interface UseStudentChatPresenterProps {
  accessToken?: string;
  userId?: string;
  role?: User["role"];
  initialConvId?: string;
}

// ============================================
// Output型定義
// ============================================

export interface StudentChatPresenterOutput {
  // ViewModel
  viewModel: StudentChatViewModel | null;
  // 状態
  isLoading: boolean;
  error: UseCaseFailure | null;
  isSending: boolean;
  isAwaitingAssistant: boolean;
  newMessage: string;
  // ストリーミング状態
  streamingStep: string | null;
  // アクション
  actions: {
    // メッセージ
    setNewMessage: (value: string) => void;
    sendMessage: () => Promise<void>;
    // 会話
    selectConversation: (convId: string) => Promise<void>;
    createConversation: (title: string) => Promise<void>;
    deleteConversation: (convId: string) => Promise<void>;
    // エラー
    clearError: () => void;
    // リロード
    reload: () => Promise<void>;
  };
  // Web検索設定
  requireWebSearch: boolean;
  setRequireWebSearch: (value: boolean) => void;
  // フィードバック
  feedback: {
    feedbacks: Record<string, Feedback[]>;
    isLoading: (msgId: string) => boolean;
    isSubmitting: (msgId: string) => boolean;
    getInput: (msgId: string) => string;
    setInput: (msgId: string, value: string) => void;
    loadFeedbacks: (msgId: string) => Promise<void>;
    submitFeedback: (msgId: string) => Promise<void>;
  };
}

// ============================================
// 初期状態
// ============================================

const initialState: PresenterState = {
  bootstrap: null,
  activeConversationId: null,
  isLoading: true,
  error: null,
  isSending: false,
  isAwaitingAssistant: false,
  newMessage: "",
  requireWebSearch: false,
  streamingContent: "",
  streamingStep: null,
  feedbacks: {},
  feedbackLoading: {},
  feedbackInput: {},
  feedbackSubmitting: {},
};

// ============================================
// Presenter Hook
// ============================================

export function useStudentChatPresenter(
  props: UseStudentChatPresenterProps
): StudentChatPresenterOutput {
  const { accessToken, userId, role, initialConvId } = props;

  // Service生成（Factory使用）
  const service = useMemo(
    () => createStudentChatService({ accessToken }),
    [accessToken]
  );

  // 状態
  const [state, setState] = useState<PresenterState>(initialState);

  // 送信中ガード（stale closure 回避のため useRef を使用）
  const isBusyRef = useRef(false);
  // ストリーミングAbortController
  const abortControllerRef = useRef<AbortController | null>(null);
  // RAF バッチ処理用
  const rafIdRef = useRef<number | null>(null);
  const pendingContentRef = useRef<string>("");

  // リクエスター情報
  const requester = useMemo(() => {
    if (!userId || !role) return null;
    return { userId, role };
  }, [userId, role]);

  // ============================================
  // 初期データロード
  // ============================================

  const loadInitialData = useCallback(
    async (convId?: string) => {
      if (!requester) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: { kind: "ValidationError", message: "ログインしてください。" },
        }));
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const result = await service.fetchInitialData(requester, convId);

      if (result.kind === "failure") {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: result.error,
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        bootstrap: result.value,
        activeConversationId: result.value.conversation?.convId ?? null,
        isLoading: false,
        error: null,
        // 初期フィードバックを状態に反映
        feedbacks: result.value.initialFeedbacks ?? {},
      }));
    },
    [requester, service]
  );

  // 初回ロード
  useEffect(() => {
    if (requester) {
      void loadInitialData(initialConvId);
    }
  }, [requester, initialConvId, loadInitialData]);

  // ============================================
  // アクション
  // ============================================

  const setNewMessage = useCallback((value: string) => {
    setState((prev) => ({ ...prev, newMessage: value }));
  }, []);

  const sendMessage = useCallback(async () => {
    // useRef による同期ガード（stale closure でもすり抜けない）
    if (isBusyRef.current) {
      return;
    }

    const { bootstrap, newMessage, requireWebSearch } = state;

    if (
      !bootstrap?.conversation ||
      !bootstrap.currentUser ||
      !newMessage.trim()
    ) {
      return;
    }

    isBusyRef.current = true;
    const questionText = newMessage.trim();
    setState((prev) => ({ ...prev, isSending: true, error: null }));

    // 1. ユーザーメッセージ送信
    const result = await service.sendMessage(
      bootstrap.currentUser,
      bootstrap.conversation,
      questionText
    );

    if (result.kind === "failure") {
      isBusyRef.current = false;
      setState((prev) => ({
        ...prev,
        isSending: false,
        error: result.error,
      }));
      return;
    }

    // ユーザーメッセージをローカル状態に追加 + プレースホルダーアシスタントメッセージを追加
    const placeholderMsgId = `streaming-${Date.now()}`;
    const placeholderAssistant: Message = {
      msgId: placeholderMsgId,
      convId: bootstrap.conversation.convId,
      authorId: "assistant",
      role: "MENTOR_AI",
      content: "",
      status: "PARTIAL",
      createdAt: new Date().toISOString(),
    };

    setState((prev) => {
      if (!prev.bootstrap) return prev;
      return {
        ...prev,
        newMessage: "",
        isSending: false,
        isAwaitingAssistant: true,
        streamingContent: "",
        streamingStep: null,
        bootstrap: {
          ...prev.bootstrap,
          initialMessages: [
            ...prev.bootstrap.initialMessages,
            result.value,
            placeholderAssistant,
          ],
        },
      };
    });

    // 2. ストリーミングLLM応答
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    pendingContentRef.current = "";

    let accumulatedContent = "";
    let accumulatedSources: Message["sources"] | undefined;

    // RAF でバッチ更新するヘルパー
    const flushContent = () => {
      const content = pendingContentRef.current;
      setState((prev) => {
        if (!prev.bootstrap) return prev;
        const msgs = [...prev.bootstrap.initialMessages];
        const lastIdx = msgs.length - 1;
        if (lastIdx >= 0 && msgs[lastIdx].msgId === placeholderMsgId) {
          msgs[lastIdx] = { ...msgs[lastIdx], content };
        }
        return {
          ...prev,
          streamingContent: content,
          bootstrap: { ...prev.bootstrap, initialMessages: msgs },
        };
      });
      rafIdRef.current = null;
    };

    const scheduleFlush = () => {
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(flushContent);
      }
    };

    const handleSSEEvent = (event: SSEEvent) => {
      switch (event.type) {
        case "chunk":
          accumulatedContent += event.data;
          pendingContentRef.current = accumulatedContent;
          scheduleFlush();
          break;

        case "step":
          setState((prev) => ({ ...prev, streamingStep: event.data }));
          break;

        case "sources":
          if (event.metadata?.sources) {
            accumulatedSources = event.metadata.sources;
          }
          break;

        case "done":
          // 最終フラッシュ
          if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
          }
          pendingContentRef.current = accumulatedContent;
          flushContent();
          break;

        case "error": {
          const errMsg = event.metadata?.error?.message ?? event.data ?? "ストリーミング中にエラーが発生しました";
          setState((prev) => ({
            ...prev,
            streamingStep: null,
            error: { kind: "UnexpectedError", message: errMsg },
          }));
          break;
        }
      }
    };

    try {
      await service.generateLLMResponseStream(
        {
          question: questionText,
          conversationId: bootstrap.conversation.convId,
          requireWebSearch,
        },
        handleSSEEvent,
        abortController.signal
      );
    } catch (err) {
      // AbortErrorは無視（ユーザーキャンセル）
      if (err instanceof Error && err.name === "AbortError") {
        // 部分コンテンツは維持
      } else {
        const errMsg = err instanceof Error ? err.message : "ストリーミング中にエラーが発生しました";
        setState((prev) => ({
          ...prev,
          error: { kind: "UnexpectedError", message: errMsg },
        }));
      }
    }

    // RAFクリーンアップ
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    abortControllerRef.current = null;

    // 3. アシスタントメッセージ保存（ストリーミング完了後）
    const finalContent = accumulatedContent || pendingContentRef.current;
    if (!finalContent) {
      // ストリーミングでコンテンツが取得できなかった場合
      isBusyRef.current = false;
      setState((prev) => ({
        ...prev,
        isAwaitingAssistant: false,
        streamingStep: null,
        streamingContent: "",
      }));
      return;
    }

    const beginResult = await service.beginAssistantMessage(
      bootstrap.conversation,
      bootstrap.currentUser
    );

    if (beginResult.kind === "failure") {
      // 保存は失敗したがストリーミングコンテンツは表示を維持
      isBusyRef.current = false;
      setState((prev) => {
        if (!prev.bootstrap) return prev;
        const msgs = [...prev.bootstrap.initialMessages];
        const lastIdx = msgs.length - 1;
        if (lastIdx >= 0 && msgs[lastIdx].msgId === placeholderMsgId) {
          msgs[lastIdx] = {
            ...msgs[lastIdx],
            content: finalContent,
            status: "DONE",
            sources: accumulatedSources,
          };
        }
        return {
          ...prev,
          isAwaitingAssistant: false,
          streamingStep: null,
          streamingContent: "",
          bootstrap: { ...prev.bootstrap, initialMessages: msgs },
        };
      });
      return;
    }

    const finalizeResult = await service.finalizeAssistantMessage(
      beginResult.value,
      finalContent,
      accumulatedSources
    );

    // プレースホルダーを実際のメッセージに置き換え
    isBusyRef.current = false;
    setState((prev) => {
      if (!prev.bootstrap) return prev;
      const assistantMessage =
        finalizeResult.kind === "success"
          ? { ...finalizeResult.value, sources: accumulatedSources }
          : {
              ...beginResult.value,
              content: finalContent,
              status: "DONE" as const,
              sources: accumulatedSources,
            };

      const msgs = prev.bootstrap.initialMessages.map((m) =>
        m.msgId === placeholderMsgId ? assistantMessage : m
      );

      return {
        ...prev,
        isAwaitingAssistant: false,
        streamingStep: null,
        streamingContent: "",
        bootstrap: { ...prev.bootstrap, initialMessages: msgs },
      };
    });
  }, [state, service]);

  const selectConversation = useCallback(
    async (convId: string) => {
      setState((prev) => ({ ...prev, activeConversationId: convId }));
      await loadInitialData(convId);
    },
    [loadInitialData]
  );

  const createConversation = useCallback(
    async (title: string) => {
      if (!requester) return;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const result = await service.createConversation(requester, title);

      if (result.kind === "failure") {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: result.error,
        }));
        return;
      }

      await loadInitialData(result.value.convId);
    },
    [requester, service, loadInitialData]
  );

  const deleteConversation = useCallback(
    async (convId: string) => {
      if (!requester || !state.bootstrap) return;

      const conversation =
        state.bootstrap.conversation?.convId === convId
          ? state.bootstrap.conversation
          : {
              convId,
              ownerId: requester.userId,
              title: "",
              state: "ACTIVE" as const,
              createdAt: "",
              lastActiveAt: "",
            };

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const result = await service.deleteConversation(requester, conversation);

      if (result.kind === "failure") {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: result.error,
        }));
        return;
      }

      await loadInitialData();
    },
    [requester, state.bootstrap, service, loadInitialData]
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const reload = useCallback(async () => {
    await loadInitialData(state.activeConversationId ?? undefined);
  }, [loadInitialData, state.activeConversationId]);

  const setRequireWebSearch = useCallback((value: boolean) => {
    setState((prev) => ({
      ...prev,
      requireWebSearch: value,
    }));
  }, []);


  // ============================================
  // フィードバック操作
  // ============================================

  const isFeedbackLoading = useCallback(
    (msgId: string) => state.feedbackLoading[msgId] ?? false,
    [state.feedbackLoading]
  );

  const isFeedbackSubmitting = useCallback(
    (msgId: string) => state.feedbackSubmitting[msgId] ?? false,
    [state.feedbackSubmitting]
  );

  const getFeedbackInput = useCallback(
    (msgId: string) => state.feedbackInput[msgId] ?? "",
    [state.feedbackInput]
  );

  const setFeedbackInput = useCallback((msgId: string, value: string) => {
    setState((prev) => ({
      ...prev,
      feedbackInput: { ...prev.feedbackInput, [msgId]: value },
    }));
  }, []);

  const loadFeedbacks = useCallback(
    async (msgId: string) => {
      const { bootstrap } = state;
      if (!bootstrap?.currentUser || !bootstrap.conversation) return;

      // 対象メッセージを取得
      const targetMessage = bootstrap.initialMessages.find(
        (m) => m.msgId === msgId
      );
      if (!targetMessage) return;

      setState((prev) => ({
        ...prev,
        feedbackLoading: { ...prev.feedbackLoading, [msgId]: true },
      }));

      const result = await service.listFeedbacks(
        bootstrap.currentUser,
        bootstrap.conversation,
        targetMessage,
        bootstrap.mentorAssignments
      );

      if (result.kind === "failure") {
        setState((prev) => ({
          ...prev,
          feedbackLoading: { ...prev.feedbackLoading, [msgId]: false },
          error: result.error,
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        feedbackLoading: { ...prev.feedbackLoading, [msgId]: false },
        feedbacks: { ...prev.feedbacks, [msgId]: result.value.items },
      }));
    },
    [state, service]
  );

  const submitFeedback = useCallback(
    async (msgId: string) => {
      const { bootstrap, feedbackInput, feedbacks } = state;
      const content = feedbackInput[msgId]?.trim();
      if (!bootstrap?.currentUser || !bootstrap.conversation || !content)
        return;

      // 対象メッセージを取得
      const targetMessage = bootstrap.initialMessages.find(
        (m) => m.msgId === msgId
      );
      if (!targetMessage) return;

      setState((prev) => ({
        ...prev,
        feedbackSubmitting: { ...prev.feedbackSubmitting, [msgId]: true },
      }));

      const existingCount = feedbacks[msgId]?.length ?? 0;

      const result = await service.createFeedback(
        bootstrap.currentUser,
        bootstrap.conversation,
        targetMessage,
        content,
        bootstrap.mentorAssignments,
        existingCount
      );

      if (result.kind === "failure") {
        setState((prev) => ({
          ...prev,
          feedbackSubmitting: { ...prev.feedbackSubmitting, [msgId]: false },
          error: result.error,
        }));
        toast.error("フィードバックの送信に失敗しました", {
          description: result.error.message,
          duration: 4000,
        });
        return;
      }

      // フィードバックをローカル状態に追加
      setState((prev) => ({
        ...prev,
        feedbackSubmitting: { ...prev.feedbackSubmitting, [msgId]: false },
        feedbackInput: { ...prev.feedbackInput, [msgId]: "" },
        feedbacks: {
          ...prev.feedbacks,
          [msgId]: [...(prev.feedbacks[msgId] ?? []), result.value],
        },
      }));

      // 성공 알림 표시
      toast.success("フィードバックを送信しました", {
        description: "新人にフィードバックが届きました",
        duration: 3000,
      });
    },
    [state, service]
  );

  // ============================================
  // ViewModel生成
  // ============================================

  const viewModel = useMemo(() => {
    if (!state.bootstrap) return null;
    return service.toViewModel(
      state.bootstrap,
      state.activeConversationId ?? undefined
    );
  }, [service, state.bootstrap, state.activeConversationId]);

  // ============================================
  // 返却
  // ============================================

  return {
    viewModel,
    isLoading: state.isLoading,
    error: state.error,
    isSending: state.isSending,
    isAwaitingAssistant: state.isAwaitingAssistant,
    newMessage: state.newMessage,
    streamingStep: state.streamingStep,
    actions: {
      setNewMessage,
      sendMessage,
      selectConversation,
      createConversation,
      deleteConversation,
      clearError,
      reload,
    },
    requireWebSearch: state.requireWebSearch,
    setRequireWebSearch,
    feedback: {
      feedbacks: state.feedbacks,
      isLoading: isFeedbackLoading,
      isSubmitting: isFeedbackSubmitting,
      getInput: getFeedbackInput,
      setInput: setFeedbackInput,
      loadFeedbacks,
      submitFeedback,
    },
  };
}
