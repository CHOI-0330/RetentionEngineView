/**
 * StudentChat Presenter V2
 *
 * 新アーキテクチャ：React Hook（React依存層）
 * - Factory経由でServiceを生成
 * - React状態管理
 * - ViewModelをViewに提供
 */

import { useState, useEffect, useMemo, useCallback } from "react";
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
  SearchSettings,
  LLMGenerateResponse,
  WebSearchConfirmationLabels,
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

interface WebSearchPendingState {
  questionText: string;
  reason: string;
  labels: WebSearchConfirmationLabels;
}

interface PresenterState {
  bootstrap: StudentChatBootstrap | null;
  activeConversationId: string | null;
  isLoading: boolean;
  error: UseCaseFailure | null;
  // メッセージ送信状態
  isSending: boolean;
  isAwaitingAssistant: boolean;
  newMessage: string;
  // 検索設定
  searchSettings: SearchSettings;
  // ウェブ検索確認状態
  webSearchPending: WebSearchPendingState | null;
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
    // ウェブ検索確認
    confirmWebSearch: () => Promise<void>;
    cancelWebSearch: () => void;
  };
  // 検索設定
  searchSettings: SearchSettings;
  setSearchSettings: (settings: Partial<SearchSettings>) => void;
  // ウェブ検索確認状態
  webSearchPending: WebSearchPendingState | null;
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
  searchSettings: {
    enableFileSearch: true,
    allowWebSearch: false,
    executeWebSearch: false,
  },
  webSearchPending: null,
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
    const { bootstrap, newMessage, searchSettings } = state;
    if (
      !bootstrap?.conversation ||
      !bootstrap.currentUser ||
      !newMessage.trim()
    ) {
      return;
    }

    const questionText = newMessage.trim();
    setState((prev) => ({ ...prev, isSending: true, error: null }));

    // 1. ユーザーメッセージ送信
    const result = await service.sendMessage(
      bootstrap.currentUser,
      bootstrap.conversation,
      questionText
    );

    if (result.kind === "failure") {
      setState((prev) => ({
        ...prev,
        isSending: false,
        error: result.error,
      }));
      return;
    }

    // ユーザーメッセージをローカル状態に追加（リロードなし）
    setState((prev) => {
      if (!prev.bootstrap) return prev;
      return {
        ...prev,
        newMessage: "",
        isSending: false,
        isAwaitingAssistant: true,
        bootstrap: {
          ...prev.bootstrap,
          initialMessages: [...prev.bootstrap.initialMessages, result.value],
        },
      };
    });

    // 2. LLM応答生成
    const llmResult = await service.generateLLMResponse(
      bootstrap.currentUser,
      bootstrap.conversation,
      questionText,
      searchSettings
    );

    if (llmResult.kind === "failure") {
      setState((prev) => ({
        ...prev,
        isAwaitingAssistant: false,
        error: llmResult.error,
      }));
      return;
    }

    // 3. ウェブ検索確認が必要な場合
    if (llmResult.value.type === ResponseType.WEB_SEARCH_CONFIRMATION) {
      setState((prev) => ({
        ...prev,
        isAwaitingAssistant: false,
        webSearchPending: {
          questionText,
          reason:
            llmResult.value.webSearchReason ??
            "社内ドキュメントで回答が見つかりませんでした。",
          labels: llmResult.value.confirmationLabels ?? {
            confirm: "ウェブ検索を許可",
            cancel: "キャンセル",
          },
        },
      }));
      return;
    }

    // 4. アシスタントメッセージ保存
    const beginResult = await service.beginAssistantMessage(
      bootstrap.conversation,
      bootstrap.currentUser
    );

    if (beginResult.kind === "failure") {
      setState((prev) => ({
        ...prev,
        isAwaitingAssistant: false,
        error: beginResult.error,
      }));
      return;
    }

    const finalizeResult = await service.finalizeAssistantMessage(
      beginResult.value,
      llmResult.value.answer,
      llmResult.value.sources
    );

    // アシスタントメッセージをローカル状態に追加（リロードなし）
    // NOTE: サーバー応答にはsourcesが含まれないため、LLM応答から取得したsourcesを必ず付与する
    setState((prev) => {
      if (!prev.bootstrap) return prev;
      const assistantMessage =
        finalizeResult.kind === "success"
          ? { ...finalizeResult.value, sources: llmResult.value.sources }
          : {
              ...beginResult.value,
              content: llmResult.value.answer,
              status: "DONE" as const,
              sources: llmResult.value.sources,
            };

      return {
        ...prev,
        isAwaitingAssistant: false,
        bootstrap: {
          ...prev.bootstrap,
          initialMessages: [
            ...prev.bootstrap.initialMessages,
            assistantMessage,
          ],
        },
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

  const setSearchSettings = useCallback((settings: Partial<SearchSettings>) => {
    setState((prev) => ({
      ...prev,
      searchSettings: { ...prev.searchSettings, ...settings },
    }));
  }, []);

  // ============================================
  // ウェブ検索確認操作
  // ============================================

  const confirmWebSearch = useCallback(async () => {
    const { bootstrap, webSearchPending, searchSettings } = state;
    if (
      !bootstrap?.conversation ||
      !bootstrap.currentUser ||
      !webSearchPending
    ) {
      return;
    }

    setState((prev) => ({
      ...prev,
      webSearchPending: null,
      isAwaitingAssistant: true,
    }));

    // executeWebSearch: true でLLM再呼び出し
    const llmResult = await service.generateLLMResponse(
      bootstrap.currentUser,
      bootstrap.conversation,
      webSearchPending.questionText,
      { ...searchSettings, executeWebSearch: true }
    );

    if (llmResult.kind === "failure") {
      setState((prev) => ({
        ...prev,
        isAwaitingAssistant: false,
        error: llmResult.error,
      }));
      return;
    }

    // アシスタントメッセージ保存
    const beginResult = await service.beginAssistantMessage(
      bootstrap.conversation,
      bootstrap.currentUser
    );

    if (beginResult.kind === "failure") {
      setState((prev) => ({
        ...prev,
        isAwaitingAssistant: false,
        error: beginResult.error,
      }));
      return;
    }

    const finalizeResult = await service.finalizeAssistantMessage(
      beginResult.value,
      llmResult.value.answer,
      llmResult.value.sources
    );

    // NOTE: サーバー応答にはsourcesが含まれないため、LLM応答から取得したsourcesを必ず付与する
    setState((prev) => {
      if (!prev.bootstrap) return prev;
      const assistantMessage =
        finalizeResult.kind === "success"
          ? { ...finalizeResult.value, sources: llmResult.value.sources }
          : {
              ...beginResult.value,
              content: llmResult.value.answer,
              status: "DONE" as const,
              sources: llmResult.value.sources,
            };

      return {
        ...prev,
        isAwaitingAssistant: false,
        bootstrap: {
          ...prev.bootstrap,
          initialMessages: [
            ...prev.bootstrap.initialMessages,
            assistantMessage,
          ],
        },
      };
    });
  }, [state, service]);

  const cancelWebSearch = useCallback(() => {
    setState((prev) => ({
      ...prev,
      webSearchPending: null,
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
  // Actions メモ化（子コンポーネントの不要な再レンダリング防止）
  // ============================================

  const actions = useMemo(
    () => ({
      setNewMessage,
      sendMessage,
      selectConversation,
      createConversation,
      deleteConversation,
      clearError,
      reload,
      confirmWebSearch,
      cancelWebSearch,
    }),
    [
      setNewMessage,
      sendMessage,
      selectConversation,
      createConversation,
      deleteConversation,
      clearError,
      reload,
      confirmWebSearch,
      cancelWebSearch,
    ]
  );

  const feedback = useMemo(
    () => ({
      feedbacks: state.feedbacks,
      isLoading: isFeedbackLoading,
      isSubmitting: isFeedbackSubmitting,
      getInput: getFeedbackInput,
      setInput: setFeedbackInput,
      loadFeedbacks,
      submitFeedback,
    }),
    [
      state.feedbacks,
      isFeedbackLoading,
      isFeedbackSubmitting,
      getFeedbackInput,
      setFeedbackInput,
      loadFeedbacks,
      submitFeedback,
    ]
  );

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
    actions,
    searchSettings: state.searchSettings,
    setSearchSettings,
    webSearchPending: state.webSearchPending,
    feedback,
  };
}
