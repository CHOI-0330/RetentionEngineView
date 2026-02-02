/**
 * MentorAiChat Presenter
 *
 * React Hook（React依存層）
 * - Factory経由でServiceを生成
 * - React状態管理
 * - ViewModelをViewに提供
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";

import type { Conversation, Message } from "../../domain/core";
import type { UseCaseFailure } from "../../application/entitle/models";
import { createMentorAiChatService } from "../../application/entitle/factories/MentorAiChatFactory";
import type {
  MentorAiChatService,
} from "../services/MentorAiChatService";
import type {
  MentorAiConversationViewModel,
  MentorAiMessageViewModel,
} from "../services/MentorAiChatService";
import {
  useKnowledgeDetection,
  type KnowledgeDetectionState,
  type KnowledgeDetectionActions,
} from "../hooks/useKnowledgeDetection";

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
  // 暗黙知検出
  knowledgeDetection: KnowledgeDetectionState;
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

  // 暗黙知検出
  const knowledgeDetection = useKnowledgeDetection({
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
      if (conv) {
        await loadMessages(conv.convId);
      }
    },
    [state.conversations, loadMessages],
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
    if (!service || !userId) return;

    const { activeConversation, newMessage, isSending, isAwaitingAssistant } =
      state;

    // 重複防止
    if (isSending || isAwaitingAssistant) return;
    if (!activeConversation || !newMessage.trim()) return;

    const questionText = newMessage.trim();
    setState((prev) => ({ ...prev, isSending: true, error: null }));

    // 1. ユーザーメッセージ送信
    const sendResult = await service.sendMessage(
      activeConversation.convId,
      userId,
      questionText,
    );

    if (sendResult.kind === "failure") {
      setState((prev) => ({
        ...prev,
        isSending: false,
        error: sendResult.error,
      }));
      return;
    }

    // ユーザーメッセージをローカル状態に追加
    setState((prev) => ({
      ...prev,
      newMessage: "",
      isSending: false,
      isAwaitingAssistant: true,
      messages: [...prev.messages, sendResult.value],
    }));

    // 2. LLM応答を生成
    const llmResult = await service.generateResponse(
      questionText,
      activeConversation.convId,
    );

    if (llmResult.kind === "failure") {
      setState((prev) => ({
        ...prev,
        isAwaitingAssistant: false,
        error: llmResult.error,
      }));
      return;
    }

    // 3. アシスタントメッセージをDraft→Finalize
    const beginResult = await service.beginAssistantMessage(
      activeConversation.convId,
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
      beginResult.value.msgId,
      llmResult.value.answer,
      activeConversation.convId,
      llmResult.value.sources,
    );

    // アシスタントメッセージをローカル状態に追加
    setState((prev) => {
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
        messages: [...prev.messages, assistantMessage],
      };
    });

    // 暗黙知検出: ラウンドカウンタ更新（自動検出トリガー）
    knowledgeDetection.actions.onMessageSent();
  }, [state, service, userId, knowledgeDetection.actions]);

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
    knowledgeDetection: knowledgeDetection.state,
    actions: {
      setNewMessage,
      sendMessage,
      selectConversation,
      createConversation,
      deleteConversation,
      clearError,
      reload,
      knowledgeDetection: knowledgeDetection.actions,
    },
  };
}
