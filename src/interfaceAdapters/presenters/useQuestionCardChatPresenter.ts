"use client";

import { useState, useCallback, useRef } from "react";
import {
  QuestionCardGateway,
  type QuestionCardCandidate,
  type QCChatMessage,
  type QCStreamEvent,
} from "../gateways/api/QuestionCardGateway";

// ============================================
// 型定義
// ============================================

export type QCChatPhase = "chatting" | "previewing" | "saving" | "done";

export interface QCChatMessageVM {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface UseQuestionCardChatPresenterProps {
  accessToken?: string;
  originalAiMessage: string;
  sourceConvId?: string;
  sourceMsgId?: string;
}

export interface QCChatViewModel {
  phase: QCChatPhase;
  messages: QCChatMessageVM[];
  candidates: QuestionCardCandidate[];
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;
  isSaving: boolean;
}

export interface QCChatActions {
  sendMessage: (text: string) => Promise<void>;
  updateCandidate: (index: number, data: Partial<QuestionCardCandidate>) => void;
  removeCandidate: (index: number) => void;
  saveCards: () => Promise<void>;
  backToChat: () => void;
  reset: () => void;
}

export interface QCChatPresenterOutput {
  viewModel: QCChatViewModel;
  actions: QCChatActions;
}

// ============================================
// Presenter Hook
// ============================================

export function useQuestionCardChatPresenter({
  accessToken,
  originalAiMessage,
  sourceConvId,
  sourceMsgId,
}: UseQuestionCardChatPresenterProps): QCChatPresenterOutput {
  const [phase, setPhase] = useState<QCChatPhase>("chatting");
  const [messages, setMessages] = useState<QCChatMessageVM[]>([]);
  const [candidates, setCandidates] = useState<QuestionCardCandidate[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingContentRef = useRef("");

  const sendMessage = useCallback(
    async (text: string) => {
      if (isStreaming || !text.trim()) return;

      const userMsg: QCChatMessageVM = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text.trim(),
      };

      // chatHistory for API (exclude current message since it's part of history)
      const chatHistory: QCChatMessage[] = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: text.trim() },
      ];

      const assistantMsgId = `assistant-${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantMsgId, role: "assistant", content: "" },
      ]);
      setIsStreaming(true);
      setStreamingContent("");
      setError(null);
      pendingContentRef.current = "";

      const gateway = new QuestionCardGateway({ accessToken });
      const abortController = new AbortController();
      abortRef.current = abortController;

      let accumulated = "";

      const flushContent = () => {
        const content = pendingContentRef.current;
        setStreamingContent(content);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, content } : m,
          ),
        );
        rafRef.current = null;
      };

      const scheduleFlush = () => {
        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(flushContent);
        }
      };

      const handleEvent = (event: QCStreamEvent) => {
        switch (event.type) {
          case "chunk":
            accumulated += event.data;
            pendingContentRef.current = accumulated;
            scheduleFlush();
            break;

          case "cards": {
            try {
              const cards = JSON.parse(event.data) as QuestionCardCandidate[];
              if (cards.length > 0) {
                setCandidates(
                  cards.map((c) => ({ ...c, isAnonymous: false })),
                );
                setPhase("previewing");
              }
            } catch {
              // ignore parse error
            }
            break;
          }

          case "done":
            if (rafRef.current !== null) {
              cancelAnimationFrame(rafRef.current);
              rafRef.current = null;
            }
            pendingContentRef.current = accumulated;
            flushContent();
            break;

          case "error":
            setError(event.data || "エラーが発生しました");
            break;
        }
      };

      try {
        await gateway.generateStream(
          {
            originalAiMessage,
            chatHistory,
            sourceConvId,
            sourceMsgId,
          },
          handleEvent,
          abortController.signal,
        );
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // user cancelled
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "質問カード生成中にエラーが発生しました",
          );
        }
      } finally {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        abortRef.current = null;
        setIsStreaming(false);
      }
    },
    [
      isStreaming,
      messages,
      accessToken,
      originalAiMessage,
      sourceConvId,
      sourceMsgId,
    ],
  );

  const updateCandidate = useCallback(
    (index: number, data: Partial<QuestionCardCandidate>) => {
      setCandidates((prev) =>
        prev.map((c, i) => (i === index ? { ...c, ...data } : c)),
      );
    },
    [],
  );

  const removeCandidate = useCallback((index: number) => {
    setCandidates((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const saveCards = useCallback(async () => {
    if (candidates.length === 0) return;

    setIsSaving(true);
    setError(null);

    try {
      const gateway = new QuestionCardGateway({ accessToken });
      await gateway.saveQuestionCards({
        cards: candidates,
        sourceConvId,
        sourceMsgId,
      });
      setPhase("done");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "質問カードの保存に失敗しました",
      );
    } finally {
      setIsSaving(false);
    }
  }, [candidates, accessToken, sourceConvId, sourceMsgId]);

  const backToChat = useCallback(() => {
    setPhase("chatting");
    setCandidates([]);
  }, []);

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setPhase("chatting");
    setMessages([]);
    setCandidates([]);
    setIsStreaming(false);
    setStreamingContent("");
    setError(null);
    setIsSaving(false);
  }, []);

  return {
    viewModel: {
      phase,
      messages,
      candidates,
      isStreaming,
      streamingContent,
      error,
      isSaving,
    },
    actions: {
      sendMessage,
      updateCandidate,
      removeCandidate,
      saveCards,
      backToChat,
      reset,
    },
  };
}
