"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import MentorStudentChatView from "../../../views/MentorStudentChatView";
import { Skeleton } from "../../../components/ui/skeleton";
import type {
  Conversation,
  Feedback,
  Message,
  User,
} from "../../../domain/core";
import type { UseCaseFailure } from "../../../application/entitle/models";
import { useSession } from "../../../components/SessionProvider";

interface MentorChatBootstrap {
  conversation: Conversation;
  student: User;
  mentor: User;
  messages: Message[];
  feedbackByMessageId: Record<string, Feedback[]>;
  authorNames: Record<string, string>;
}

interface MentorStudentChatPageProps {
  convId: string;
}

const normalizeError = (reason: unknown): UseCaseFailure => ({
  kind: "ValidationError",
  message: reason instanceof Error ? reason.message : String(reason),
});

const MentorStudentChatPage = ({ convId }: MentorStudentChatPageProps) => {
  const router = useRouter();
  const { session, isLoading: isSessionLoading } = useSession();
  const [bootstrap, setBootstrap] = useState<MentorChatBootstrap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<UseCaseFailure | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string | null>>(
    {}
  );
  const [editingFlags, setEditingFlags] = useState<Record<string, boolean>>({});

  const callMentorChatApi = async <T,>(init?: RequestInit): Promise<T> => {
    if (!session?.accessToken) {
      throw new Error("ログインしてください。");
    }
    const response = await fetch(
      `/api/entitle/mentor-chat/${encodeURIComponent(convId)}`,
      {
        cache: init?.cache ?? "no-store",
        credentials: init?.credentials ?? "include",
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
          ...(init?.headers ?? {}),
        },
      }
    );
    const raw = await response.text();
    let payload: any = null;
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = null;
      }
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("Unauthorized");
    }
    if (!response.ok) {
      const message =
        payload?.error ?? payload?.message ?? raw ?? "Unexpected error";
      throw new Error(message);
    }
    return payload as T;
  };

  useEffect(() => {
    let cancelled = false;
    const fetchConversation = async () => {
      if (!session?.accessToken) {
        // sessionがない場合はエラーにするが、ローディングは終了させる
        if (!isSessionLoading) {
          setLoadError({
            kind: "ValidationError",
            message: "ログインしてください。",
          });
          setIsLoading(false);
        }
        return;
      }
      setIsLoading(true);
      try {
        const response = await callMentorChatApi<{
          data: MentorChatBootstrap;
        }>();
        if (!response?.data) {
          throw new Error("会話データが取得できませんでした。");
        }
        if (!cancelled) {
          setBootstrap(response.data);
          setEditingFlags(() => {
            const flags: Record<string, boolean> = {};
            response.data.messages.forEach((message) => {
              flags[message.msgId] = false;
            });
            return flags;
          });
          setLoadError(null);
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof Error && error.message === "Unauthorized") {
            router.push("/?redirected=1");
            return;
          }
          setLoadError(normalizeError(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchConversation();
    return () => {
      cancelled = true;
    };
  }, [convId, router, session?.accessToken, isSessionLoading]);

  const viewData = useMemo(() => {
    if (!bootstrap) {
      return null;
    }
    return {
      conversationTitle: bootstrap.conversation.title,
      studentName: bootstrap.student.displayName,
      mentorName: bootstrap.mentor.displayName,
      messages: bootstrap.messages.map((message) => ({
        id: message.msgId,
        role: message.role,
        content: message.content,
        createdAt: new Date(message.createdAt),
        status: message.status,
        feedbacks:
          bootstrap.feedbackByMessageId[message.msgId]?.map((feedback) => ({
            id: feedback.fbId,
            authorName:
              bootstrap.authorNames[feedback.authorId] ?? feedback.authorId,
            content: feedback.content,
            createdAt: new Date(feedback.createdAt),
          })) ?? [],
      })),
    };
  }, [bootstrap]);

  const handleDraftChange = useCallback((messageId: string, value: string) => {
    setDrafts((previous) => ({ ...previous, [messageId]: value }));
    setFormErrors((previous) => ({ ...previous, [messageId]: null }));
  }, []);

  const handleToggleEditing = useCallback(
    (messageId: string, next: boolean) => {
      setEditingFlags((previous) => ({ ...previous, [messageId]: next }));
      if (next) {
        const existingFeedback = bootstrap?.feedbackByMessageId[messageId]?.[0];
        if (existingFeedback) {
          setDrafts((previous) => ({
            ...previous,
            [messageId]: existingFeedback.content,
          }));
        }
        setFormErrors((previous) => ({ ...previous, [messageId]: null }));
      }
    },
    [bootstrap]
  );

  const handleSubmitFeedback = useCallback(
    async (messageId: string) => {
      const existingFeedback =
        bootstrap?.feedbackByMessageId[messageId]?.[0] ?? null;
      const rawDraft = drafts[messageId] ?? existingFeedback?.content ?? "";
      const trimmed = rawDraft.trim();
      if (!trimmed) {
        setFormErrors((previous) => ({
          ...previous,
          [messageId]: "フィードバック内容を入力してください。",
        }));
        return;
      }

      setSubmitting((previous) => ({ ...previous, [messageId]: true }));
      try {
        const response = await callMentorChatApi<{
          data: { feedback: Feedback; authorName?: string };
        }>({
          method: "POST",
          body: JSON.stringify({
            messageId,
            content: trimmed,
            feedbackId: existingFeedback?.fbId,
          }),
        });

        setBootstrap((previous) => {
          if (!previous) {
            return previous;
          }
          const nextFeedbacks = {
            ...previous.feedbackByMessageId,
            [messageId]: [response.data.feedback],
          };
          const nextAuthorNames = {
            ...previous.authorNames,
            [response.data.feedback.authorId]:
              response.data.authorName ??
              previous.authorNames[response.data.feedback.authorId] ??
              response.data.feedback.authorId,
          };
          return {
            ...previous,
            feedbackByMessageId: nextFeedbacks,
            authorNames: nextAuthorNames,
          };
        });
        setDrafts((previous) => ({ ...previous, [messageId]: trimmed }));
        setFormErrors((previous) => ({ ...previous, [messageId]: null }));
        setEditingFlags((previous) => ({ ...previous, [messageId]: false }));
      } catch (error) {
        setFormErrors((previous) => ({
          ...previous,
          [messageId]:
            error instanceof Error
              ? error.message
              : "予期しないエラーが発生しました。",
        }));
      } finally {
        setSubmitting((previous) => {
          const next = { ...previous };
          delete next[messageId];
          return next;
        });
      }
    },
    [bootstrap?.feedbackByMessageId, convId, drafts, session?.accessToken]
  );

  if (isSessionLoading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        ログイン情報を確認中...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        ログインしてください。{" "}
        <a className="text-primary underline" href="/entitle/auth">
          Auth
        </a>
      </div>
    );
  }

  if (isLoading || !bootstrap) {
    return (
      <div className="p-6" aria-busy="true" aria-live="polite">
        <div className="mx-auto max-w-5xl space-y-4">
          {loadError ? (
            <div className="text-sm text-destructive" role="alert">
              会話の読み込みに失敗しました: {loadError.message}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-7 w-72" />
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-[320px] w-full" />
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <MentorStudentChatView
      conversationTitle={viewData?.conversationTitle ?? ""}
      studentName={bootstrap.student.displayName}
      mentorName={bootstrap.mentor.displayName}
      messages={viewData?.messages ?? []}
      feedbackDrafts={drafts}
      feedbackSubmitting={submitting}
      feedbackErrors={formErrors}
      editingFlags={editingFlags}
      onFeedbackDraftChange={handleDraftChange}
      onToggleEditing={handleToggleEditing}
      onSubmitFeedback={handleSubmitFeedback}
    />
  );
};
export default MentorStudentChatPage;
