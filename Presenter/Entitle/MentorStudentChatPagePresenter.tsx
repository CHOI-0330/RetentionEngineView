"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import MentorStudentChatView from "../../src/views/MentorStudentChatView";
import type { Conversation, Feedback, Message, User } from "../../src/type/core";
import type { UseCaseFailure } from "../../src/application/entitle/models";

interface MentorChatBootstrap {
  conversation: Conversation;
  student: User;
  mentor: User;
  messages: Message[];
  feedbackByMessageId: Record<string, Feedback[]>;
  authorNames: Record<string, string>;
}

interface MentorStudentChatPagePresenterProps {
  convId: string;
}

const normalizeError = (reason: unknown): UseCaseFailure => ({
  kind: "ValidationError",
  message: reason instanceof Error ? reason.message : String(reason),
});

const MentorStudentChatPagePresenter = ({ convId }: MentorStudentChatPagePresenterProps) => {
  const router = useRouter();
  const [bootstrap, setBootstrap] = useState<MentorChatBootstrap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<UseCaseFailure | null>(null);

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
    />
  );
};

export default MentorStudentChatPagePresenter;
