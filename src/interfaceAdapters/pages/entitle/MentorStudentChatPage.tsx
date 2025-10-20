"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import MentorStudentChatView from "../../../views/MentorStudentChatView";
import type { Conversation, Feedback, Message, User } from "../../../domain/core";
import type { UseCaseFailure } from "../../../application/entitle/models";

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
  const [bootstrap, setBootstrap] = useState<MentorChatBootstrap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<UseCaseFailure | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string | null>>({});
  const [editingFlags, setEditingFlags] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    const fetchConversation = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/entitle/mentor-chat/${encodeURIComponent(convId)}`, {
          cache: "no-store",
        });
        if (response.status === 401 || response.status === 403) {
          if (!cancelled) {
            router.push("/?redirected=1");
          }
          return;
        }
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const json = (await response.json()) as { data: MentorChatBootstrap };
        if (!cancelled) {
          setBootstrap(json.data);
          setEditingFlags(() => {
            const flags: Record<string, boolean> = {};
            json.data.messages.forEach((message) => {
              const hasFeedback = json.data.feedbackByMessageId[message.msgId]?.length ?? 0;
              flags[message.msgId] = hasFeedback === 0;
            });
            return flags;
          });
          setLoadError(null);
        }
      } catch (error) {
        if (!cancelled) {
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
  }, [convId, router]);

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
            authorName: bootstrap.authorNames[feedback.authorId] ?? feedback.authorId,
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
          setDrafts((previous) => ({ ...previous, [messageId]: existingFeedback.content }));
        }
        setFormErrors((previous) => ({ ...previous, [messageId]: null }));
      }
    },
    [bootstrap]
  );

  const handleSubmitFeedback = useCallback(
    async (messageId: string) => {
      const existingFeedback = bootstrap?.feedbackByMessageId[messageId]?.[0] ?? null;
      const rawDraft = drafts[messageId] ?? existingFeedback?.content ?? "";
      const trimmed = rawDraft.trim();
      if (!trimmed) {
        setFormErrors((previous) => ({ ...previous, [messageId]: "フィードバック内容を入力してください。" }));
        return;
      }

      setSubmitting((previous) => ({ ...previous, [messageId]: true }));
      try {
        const response = await fetch(`/api/entitle/mentor-chat/${encodeURIComponent(convId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId, content: trimmed, feedbackId: existingFeedback?.fbId }),
        });

        if (!response.ok) {
          const raw = await response.text();
          let message = "送信に失敗しました。";
          try {
            const parsed = JSON.parse(raw);
            if (parsed?.error && typeof parsed.error === "string") {
              message = parsed.error;
            }
          } catch (parseError) {
            if (raw) {
              message = raw;
            }
          }
          setFormErrors((previous) => ({
            ...previous,
            [messageId]: message,
          }));
          return;
        }

        const json = (await response.json()) as {
          data: { feedback: Feedback; authorName?: string };
        };

        setBootstrap((previous) => {
          if (!previous) {
            return previous;
          }
          const nextFeedbacks = {
            ...previous.feedbackByMessageId,
            [messageId]: [json.data.feedback],
          };
          const nextAuthorNames = {
            ...previous.authorNames,
            [json.data.feedback.authorId]: json.data.authorName ?? previous.authorNames[json.data.feedback.authorId] ?? json.data.feedback.authorId,
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
          [messageId]: error instanceof Error ? error.message : "予期しないエラーが発生しました。",
        }));
      } finally {
        setSubmitting((previous) => {
          const next = { ...previous };
          delete next[messageId];
          return next;
        });
      }
    },
    [bootstrap?.feedbackByMessageId, convId, drafts]
  );

  if (isLoading || !bootstrap) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        {loadError ? `Failed to load conversation: ${loadError.message}` : "Loading conversation…"}
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
