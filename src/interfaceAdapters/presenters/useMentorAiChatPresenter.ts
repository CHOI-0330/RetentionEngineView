/**
 * MentorAiChat Presenter
 *
 * React Hook（React依存層）
 * - Factory経由でServiceを生成
 * - React状態管理
 * - ViewModelをViewに提供
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { toast } from "sonner";

import type { Conversation, Message } from "../../domain/core";
import type { UseCaseFailure } from "../../application/entitle/models";
import { createMentorAiChatService } from "../../application/entitle/factories/MentorAiChatFactory";
import type { MentorAiChatService } from "../services/MentorAiChatService";
import type {
  SSEEvent,
  TriggerDetectionResult,
  TriggerSessionResponse,
} from "../gateways/api/types";
import type {
  MentorAiConversationViewModel,
  MentorAiMessageViewModel,
} from "../services/MentorAiChatService";
import {
  useKnowledgeDetection,
  type KnowledgeDetectionState,
  type KnowledgeDetectionActions,
} from "../hooks/useKnowledgeDetection";
import {
  useTriggerDetection,
  type TriggerDetectionState,
  type TriggerDetectionActions,
} from "../hooks/useTriggerDetection";

// ============================================
// 状態型定義
// ============================================

interface PresenterState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  error: UseCaseFailure | null;
  isSending: boolean;
  isAwaitingAssistant: boolean;
  newMessage: string;
  // ストリーミング状態
  streamingContent: string;
  streamingStep: string | null;
}

// ============================================
// Props型定義
// ============================================

interface UseMentorAiChatPresenterProps {
  accessToken?: string;
  userId?: string;
}

// ============================================
// Output型定義
// ============================================

export interface MentorAiChatPresenterOutput {
  // ViewModel
  conversations: MentorAiConversationViewModel[];
  messages: MentorAiMessageViewModel[];
  activeConversation: Conversation | null;
  // 状態
  isLoading: boolean;
  error: UseCaseFailure | null;
  isSending: boolean;
  isAwaitingAssistant: boolean;
  newMessage: string;
  // ストリーミング状態
  streamingStep: string | null;
  // 暗黙知検出
  knowledgeDetection: KnowledgeDetectionState;
  // トリガー検出（リアルタイム）
  triggerDetection: TriggerDetectionState;
  // アクション
  actions: {
    setNewMessage: (value: string) => void;
    sendMessage: () => Promise<void>;
    selectConversation: (convId: string) => Promise<void>;
    createConversation: (title: string) => Promise<void>;
    deleteConversation: (convId: string) => Promise<void>;
    clearError: () => void;
    reload: () => Promise<void>;
    knowledgeDetection: KnowledgeDetectionActions;
    triggerDetection: TriggerDetectionActions;
  };
}

// ============================================
// 初期状態
// ============================================

const initialState: PresenterState = {
  conversations: [],
  activeConversation: null,
  messages: [],
  isLoading: true,
  error: null,
  isSending: false,
  isAwaitingAssistant: false,
  newMessage: "",
  streamingContent: "",
  streamingStep: null,
};

// ============================================
// Presenter Hook
// ============================================

export function useMentorAiChatPresenter(
  props: UseMentorAiChatPresenterProps,
): MentorAiChatPresenterOutput {
  const { accessToken, userId } = props;

  // Service生成（Factory使用）
  const service = useMemo<MentorAiChatService | null>(() => {
    if (!accessToken || !userId) return null;
    return createMentorAiChatService({ accessToken, mentorId: userId });
  }, [accessToken, userId]);

  // 状態
  const [state, setState] = useState<PresenterState>(initialState);

  // ストリーミング用Ref
  const abortControllerRef = useRef<AbortController | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const pendingContentRef = useRef<string>("");
  const isBusyRef = useRef(false);

  // 暗黙知検出（ラウンドベース）
  const knowledgeDetection = useKnowledgeDetection({
    accessToken,
    conversationId: state.activeConversation?.convId,
  });

  // トリガー検出（リアルタイム・レスポンスごと）
  const triggerDetection = useTriggerDetection({
    accessToken,
    conversationId: state.activeConversation?.convId,
  });

  // ============================================
  // データロード
  // ============================================

  const loadConversations = useCallback(async () => {
    if (!service) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const result = await service.listConversations();

    if (result.kind === "failure") {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: result.error,
      }));
      return;
    }

    const conversations = result.value;

    setState((prev) => ({
      ...prev,
      conversations,
      isLoading: false,
      error: null,
    }));

    return conversations;
  }, [service]);

  const loadMessages = useCallback(
    async (convId: string) => {
      if (!service) return;

      const result = await service.listMessages(convId);

      if (result.kind === "failure") {
        setState((prev) => ({ ...prev, error: result.error }));
        return;
      }

      setState((prev) => ({
        ...prev,
        messages: result.value.items,
      }));
    },
    [service],
  );

  const selectConversation = useCallback(
    async (convId: string) => {
      const conv =
        state.conversations.find((c) => c.convId === convId) ?? null;
      setState((prev) => ({
        ...prev,
        activeConversation: conv,
        messages: [],
      }));
      // 会話切替時にトリガー検出をクリア
      triggerDetection.actions.clearTriggers();
      if (conv) {
        await loadMessages(conv.convId);
      }
    },
    [state.conversations, loadMessages, triggerDetection.actions],
  );

  // 初回ロード
  useEffect(() => {
    if (!service) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    const init = async () => {
      const conversations = await loadConversations();
      // 最新の会話を自動選択
      if (conversations && conversations.length > 0) {
        const latest = conversations[0];
        setState((prev) => ({ ...prev, activeConversation: latest }));
        await loadMessages(latest.convId);
      }
    };

    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service]);

  // ============================================
  // アクション
  // ============================================

  const setNewMessage = useCallback((value: string) => {
    setState((prev) => ({ ...prev, newMessage: value }));
  }, []);

  const sendMessage = useCallback(async () => {
    // useRef による同期ガード（stale closure でもすり抜けない）
    if (isBusyRef.current) return;
    if (!service || !userId) return;

    const { activeConversation, newMessage } = state;

    if (!activeConversation || !newMessage.trim()) return;

    isBusyRef.current = true;
    const questionText = newMessage.trim();
    setState((prev) => ({ ...prev, isSending: true, error: null }));

    // 1. ユーザーメッセージ送信
    const sendResult = await service.sendMessage(
      activeConversation.convId,
      userId,
      questionText,
    );

    if (sendResult.kind === "failure") {
      isBusyRef.current = false;
      setState((prev) => ({
        ...prev,
        isSending: false,
        error: sendResult.error,
      }));
      return;
    }

    // ユーザーメッセージをローカル状態に追加 + プレースホルダーアシスタントメッセージを追加
    const placeholderMsgId = `streaming-${Date.now()}`;
    const placeholderAssistant: Message = {
      msgId: placeholderMsgId,
      convId: activeConversation.convId,
      role: "ASSISTANT",
      content: "",
      status: "PARTIAL",
      createdAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      newMessage: "",
      isSending: false,
      isAwaitingAssistant: true,
      streamingContent: "",
      streamingStep: null,
      messages: [...prev.messages, sendResult.value, placeholderAssistant],
    }));

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
        const msgs = [...prev.messages];
        const lastIdx = msgs.length - 1;
        if (lastIdx >= 0 && msgs[lastIdx].msgId === placeholderMsgId) {
          msgs[lastIdx] = { ...msgs[lastIdx], content };
        }
        return {
          ...prev,
          streamingContent: content,
          messages: msgs,
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
          // マーカー除去済みのクリーンコンテンツがあれば置き換え
          if (event.data) {
            accumulatedContent = event.data;
          }
          // 最終フラッシュ
          if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
          }
          pendingContentRef.current = accumulatedContent;
          flushContent();
          break;

        case "trigger": {
          try {
            const raw = JSON.parse(event.data);
            if (raw.detected) {
              // V2データをそのまま渡す（recordTriggerがV2対応済み）
              triggerDetection.actions.recordTrigger(
                sendResult.value.msgId,
                raw,
              );
            }
          } catch {
            // Ignore parse errors
          }
          break;
        }

        case "session": {
          try {
            const sessionResponse = JSON.parse(event.data) as TriggerSessionResponse;
            triggerDetection.actions.recordSession(
              sessionResponse,
              sendResult.value.msgId,
            );
          } catch {
            // Ignore parse errors
          }
          break;
        }

        case "error": {
          const errMsg = event.metadata?.error?.message ?? event.data ?? "ストリーミング中にエラーが発生しました";
          setState((prev) => ({
            ...prev,
            streamingStep: null,
            error: { kind: "ExternalServiceError", message: errMsg },
          }));
          break;
        }
      }
    };

    try {
      await service.generateResponseStream(
        {
          question: questionText,
          conversationId: activeConversation.convId,
        },
        handleSSEEvent,
        abortController.signal,
      );
    } catch (err) {
      // AbortErrorは無視（ユーザーキャンセル）
      if (err instanceof Error && err.name === "AbortError") {
        // 部分コンテンツは維持
      } else {
        const errMsg = err instanceof Error ? err.message : "ストリーミング中にエラーが発生しました";
        setState((prev) => ({
          ...prev,
          error: { kind: "ExternalServiceError", message: errMsg },
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
      activeConversation.convId,
    );

    if (beginResult.kind === "failure") {
      // 保存は失敗したがストリーミングコンテンツは表示を維持
      isBusyRef.current = false;
      setState((prev) => {
        const msgs = [...prev.messages];
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
          messages: msgs,
        };
      });
      return;
    }

    const finalizeResult = await service.finalizeAssistantMessage(
      beginResult.value.msgId,
      finalContent,
      activeConversation.convId,
      accumulatedSources,
    );

    // プレースホルダーを実際のメッセージに置き換え
    isBusyRef.current = false;
    setState((prev) => {
      const assistantMessage =
        finalizeResult.kind === "success"
          ? { ...finalizeResult.value, sources: accumulatedSources }
          : {
              ...beginResult.value,
              content: finalContent,
              status: "DONE" as const,
              sources: accumulatedSources,
            };

      const msgs = prev.messages.map((m) =>
        m.msgId === placeholderMsgId ? assistantMessage : m,
      );

      return {
        ...prev,
        isAwaitingAssistant: false,
        streamingStep: null,
        streamingContent: "",
        messages: msgs,
      };
    });

    // 暗黙知検出: ラウンドベース検出は無効化（V2リアルタイム検出に統合済み）
    // knowledgeDetection.actions.onMessageSent();
  }, [state, service, userId]);

  const createConversation = useCallback(
    async (title: string) => {
      if (!service) return;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const result = await service.createConversation(title);

      if (result.kind === "failure") {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: result.error,
        }));
        return;
      }

      // 会話一覧をリロードして新しい会話を選択
      const conversations = await loadConversations();
      if (conversations) {
        const newConv =
          conversations.find((c) => c.convId === result.value.convId) ??
          result.value;
        setState((prev) => ({
          ...prev,
          activeConversation: newConv,
          messages: [],
          isLoading: false,
        }));
      }
    },
    [service, loadConversations],
  );

  const deleteConversation = useCallback(
    async (convId: string) => {
      if (!service) return;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const result = await service.deleteConversation(convId);

      if (result.kind === "failure") {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: result.error,
        }));
        toast.error("会話の削除に失敗しました", {
          description: result.error.message,
          duration: 4000,
        });
        return;
      }

      // 会話一覧をリロード
      const conversations = await loadConversations();
      if (conversations && conversations.length > 0) {
        const next = conversations[0];
        setState((prev) => ({
          ...prev,
          activeConversation: next,
          messages: [],
        }));
        await loadMessages(next.convId);
      } else {
        setState((prev) => ({
          ...prev,
          activeConversation: null,
          messages: [],
        }));
      }

      toast.success("会話を削除しました");
    },
    [service, loadConversations, loadMessages],
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const reload = useCallback(async () => {
    const conversations = await loadConversations();
    if (state.activeConversation && conversations) {
      const stillExists = conversations.find(
        (c) => c.convId === state.activeConversation!.convId,
      );
      if (stillExists) {
        await loadMessages(stillExists.convId);
      } else if (conversations.length > 0) {
        setState((prev) => ({
          ...prev,
          activeConversation: conversations[0],
          messages: [],
        }));
        await loadMessages(conversations[0].convId);
      }
    }
  }, [loadConversations, loadMessages, state.activeConversation]);

  // ============================================
  // ViewModel生成
  // ============================================

  const conversationViewModels = useMemo(() => {
    if (!service) return [];
    return service.toConversationViewModels(
      state.conversations,
      state.activeConversation?.convId,
    );
  }, [service, state.conversations, state.activeConversation?.convId]);

  const messageViewModels = useMemo(() => {
    if (!service) return [];
    return service.toMessageViewModels(state.messages);
  }, [service, state.messages]);

  // ============================================
  // 返却
  // ============================================

  return {
    conversations: conversationViewModels,
    messages: messageViewModels,
    activeConversation: state.activeConversation,
    isLoading: state.isLoading,
    error: state.error,
    isSending: state.isSending,
    isAwaitingAssistant: state.isAwaitingAssistant,
    newMessage: state.newMessage,
    streamingStep: state.streamingStep,
    knowledgeDetection: knowledgeDetection.state,
    triggerDetection: triggerDetection.state,
    actions: {
      setNewMessage,
      sendMessage,
      selectConversation,
      createConversation,
      deleteConversation,
      clearError,
      reload,
      knowledgeDetection: knowledgeDetection.actions,
      triggerDetection: triggerDetection.actions,
    },
  };
}
