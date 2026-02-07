"use client";

import { useState, useCallback, useRef } from "react";
import {
  AnswerCardGateway,
  type AnswerCardCandidate,
  type ACChatMessage,
  type ACStreamEvent,
} from "../gateways/api/AnswerCardGateway";

// ============================================
// 型定義
// ============================================

export type ACChatPhase = "chatting" | "previewing" | "saving" | "done";

export interface ACChatMessageVM {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface UseAnswerCardChatPresenterProps {
  accessToken?: string;
  questionCardId: string;
  questionTitle: string;
  questionBody: string;
}

export interface ACChatViewModel {
  phase: ACChatPhase;
  messages: ACChatMessageVM[];
  candidate: AnswerCardCandidate | null;
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;
  isSaving: boolean;
}

export interface ACChatActions {
  sendMessage: (text: string) => Promise<void>;
  updateCandidate: (data: Partial<AnswerCardCandidate>) => void;
  saveCard: () => Promise<void>;
  backToChat: () => void;
  reset: () => void;
}

export interface ACChatPresenterOutput {
  viewModel: ACChatViewModel;
  actions: ACChatActions;
}

// ============================================
// Presenter Hook
// ============================================

export function useAnswerCardChatPresenter({
  accessToken,
  questionCardId,
  questionTitle,
  questionBody,
}: UseAnswerCardChatPresenterProps): ACChatPresenterOutput {
  const [phase, setPhase] = useState<ACChatPhase>("chatting");
  const [messages, setMessages] = useState<ACChatMessageVM[]>([]);
  const [candidate, setCandidate] = useState<AnswerCardCandidate | null>(null);
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

      const userMsg: ACChatMessageVM = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text.trim(),
      };

      // chatHistory for API
      const chatHistory: ACChatMessage[] = [
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

      const gateway = new AnswerCardGateway({ accessToken });
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

      const handleEvent = (event: ACStreamEvent) => {
        switch (event.type) {
          case "chunk":
            accumulated += event.data;
            pendingContentRef.current = accumulated;
            scheduleFlush();
            break;

          case "answer": {
            try {
              const answer = JSON.parse(event.data) as AnswerCardCandidate;
              if (answer?.title && answer?.situation && answer?.knowhow) {
                setCandidate(answer);
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
            mentorInput: text.trim(),
            chatHistory,
            questionCardId,
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
              : "回答カード生成中にエラーが発生しました",
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
    [isStreaming, messages, accessToken],
  );

  const updateCandidate = useCallback(
    (data: Partial<AnswerCardCandidate>) => {
      setCandidate((prev) => (prev ? { ...prev, ...data } : prev));
    },
    [],
  );

  const saveCard = useCallback(async () => {
    if (!candidate) return;

    setIsSaving(true);
    setError(null);

    try {
      const gateway = new AnswerCardGateway({ accessToken });
      await gateway.saveAnswerCard({
        questionCardId,
        candidate,
      });
      setPhase("done");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "回答カードの保存に失敗しました",
      );
    } finally {
      setIsSaving(false);
    }
  }, [candidate, accessToken, questionCardId]);

  const backToChat = useCallback(() => {
    setPhase("chatting");
    setCandidate(null);
  }, []);

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setPhase("chatting");
    setMessages([]);
    setCandidate(null);
    setIsStreaming(false);
    setStreamingContent("");
    setError(null);
    setIsSaving(false);
  }, []);

  return {
    viewModel: {
      phase,
      messages,
      candidate,
      isStreaming,
      streamingContent,
      error,
      isSaving,
    },
    actions: {
      sendMessage,
      updateCandidate,
      saveCard,
      backToChat,
      reset,
    },
  };
}
