"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import StudentChatView from "../../../views/StudentChatView";
import { useStudentChatController } from "../../controllers/useStudentChatController";
import { useStudentChatPresenter } from "../../presenters/useStudentChatPresenter";
import type { StudentChatControllerEffect } from "../../controllers/useStudentChatController";
import type { UseCaseFailure } from "../../../application/entitle/models";
import type { Conversation, Feedback, MentorAssignment, Message, User } from "../../../domain/core";
import type { LLMPort } from "../../../application/entitle/ports";
import { Skeleton } from "../../../components/ui/skeleton";
import { GeminiLLMPort } from "../../gateways/llm/geminiClientPort";
import { apiFetch } from "../../../lib/apiClient";
import { useSession } from "../../../components/SessionProvider";

const normalizeError = (reason: unknown): UseCaseFailure => ({
  kind: "ValidationError",
  message: reason instanceof Error ? reason.message : String(reason),
});

interface ConversationOption {
  convId: string;
  title: string;
  lastActiveAt: string;
}

interface MentorOption {
  mentorId: string;
  displayName: string;
  email?: string;
}

interface StudentChatBootstrap {
  conversation: Conversation | null;
  currentUser: User;
  initialMessages: Message[];
  initialFeedbacks: Record<string, Feedback[]>;
  authorNames: Record<string, string>;
  mentorAssignments: MentorAssignment[];
  availableConversations: ConversationOption[];
  availableMentors: MentorOption[];
}

interface StudentChatRuntimeProps {
  bootstrap: StudentChatBootstrap & { conversation: Conversation };
  llmPort: LLMPort;
  router: ReturnType<typeof useRouter>;
  conversationOptions: ConversationOption[];
  mentorOptions: MentorOption[];
  selectedConversationId: string;
  onSelectConversation: (convId: string) => void;
  onCreateConversation: (input: { title: string; mentorId?: string | null }) => Promise<void>;
}

type MessageDto = {
  msg_id: string;
  conv_id: string;
  role: Message["role"];
  content: string;
  status?: Message["status"] | null;
  created_at: string;
};

const mapMessageDto = (dto: MessageDto): Message => ({
  msgId: dto.msg_id,
  convId: dto.conv_id,
  role: dto.role,
  content: dto.content,
  status: dto.status ?? undefined,
  createdAt: dto.created_at,
});

const StudentChatRuntime = ({
  bootstrap,
  llmPort,
  router,
  conversationOptions,
  mentorOptions,
  selectedConversationId,
  onSelectConversation,
  onCreateConversation,
}: StudentChatRuntimeProps) => {
  const controller = useStudentChatController({
    conversation: bootstrap.conversation,
    currentUser: bootstrap.currentUser,
    initialMessages: bootstrap.initialMessages,
    initialFeedbacks: bootstrap.initialFeedbacks,
    initialAuthorNames: bootstrap.authorNames,
    mentorAssignments: bootstrap.mentorAssignments,
  });

  const presenter = useStudentChatPresenter(controller);

  const processingRef = useRef(false);
  const effectQueueRef = useRef<StudentChatControllerEffect[]>([]);
  const enqueuedEffectIdsRef = useRef<Set<string>>(new Set());
  const activeAssistantIdRef = useRef<string | null>(null);

  const processEffectBackend = useCallback(
    async (effect: StudentChatControllerEffect) => {
      const resolveConvId = () =>
        (effect.payload as any).convId ??
        selectedConversationId ??
        null;

      switch (effect.kind) {
        case "REQUEST_PERSIST_USER_MESSAGE": {
          const convId = resolveConvId();
          if (!convId) throw new Error("convId is required");
          const result = await apiFetch<{ data: MessageDto }>("/messages", {
            method: "POST",
            body: JSON.stringify({
              convId,
              role: "NEW_HIRE",
              content: effect.payload.content,
            }),
          });
          controller.actions.notifyUserMessagePersisted(mapMessageDto(result.data));
          break;
        }
        case "REQUEST_BEGIN_ASSISTANT_MESSAGE": {
          const convId = resolveConvId();
          if (!convId) throw new Error("convId is required");
          const tempId =
            typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
              ? crypto.randomUUID()
              : `assistant-${Date.now()}`;
          const tempMessage: Message = {
            msgId: tempId,
            convId,
            role: "ASSISTANT",
            content: "",
            status: "DRAFT",
            createdAt: new Date().toISOString(),
          };
          activeAssistantIdRef.current = tempMessage.msgId;
          controller.actions.notifyAssistantMessageCreated(tempMessage);
          break;
        }
        case "REQUEST_GENERATE_ASSISTANT_RESPONSE": {
          const targetMsgId = controller.state.activeAssistantMessageId ?? activeAssistantIdRef.current;
          if (!targetMsgId) {
            throw new Error("Assistant message id is not set.");
          }
          try {
            const finalText = await llmPort.generate(effect.payload);
            controller.actions.notifyAssistantResponseReady(finalText);
          } catch (streamError) {
            controller.actions.reportExternalFailure(normalizeError(streamError));
            controller.actions.notifyAssistantResponseCancelled();
          }
          break;
        }
        case "REQUEST_FINALIZE_ASSISTANT_MESSAGE": {
          const convId = resolveConvId();
          if (!convId) throw new Error("convId is required");
          const result = await apiFetch<{ data: MessageDto }>("/messages", {
            method: "POST",
            body: JSON.stringify({
              convId,
              role: "ASSISTANT",
              content:
                (effect.payload as any).content ??
                (effect.payload as any).finalText ??
                "",
            }),
          });
          controller.actions.syncAssistantMessage(mapMessageDto(result.data));
          activeAssistantIdRef.current = null;
          break;
        }
        case "REQUEST_CANCEL_ASSISTANT_MESSAGE": {
          activeAssistantIdRef.current = null;
          break;
        }
        case "REQUEST_LIST_MESSAGES": {
          const convId = resolveConvId();
          if (!convId) throw new Error("convId is required");
          const result = await apiFetch<{ data: MessageDto[] }>(`/messages?convId=${encodeURIComponent(convId)}`);
          controller.actions.notifyMessagesLoaded({
            items: (result.data ?? []).map(mapMessageDto),
            nextCursor: undefined,
          });
          break;
        }
        case "REQUEST_LIST_FEEDBACKS": {
          const result = await apiFetch<{ data: Feedback[] }>(`/feedback?messageId=${encodeURIComponent(effect.payload.msgId)}`);
          controller.actions.applyFeedbackForMessage(effect.payload.msgId, result.data, {});
          break;
        }
        case "REQUEST_CREATE_FEEDBACK": {
          const result = await apiFetch<{ data: Feedback }>(`/feedback`, {
            method: "POST",
            body: JSON.stringify({
              messageId: effect.payload.targetMsgId,
              authorId: effect.payload.authorId,
              content: effect.payload.content,
            }),
          });
          controller.actions.applyFeedbackForMessage(result.data.targetMsgId, [result.data], {
            [result.data.authorId]: result.data.authorId,
          });
          break;
        }
        default: {
          const _e: any = effect;
          console.warn("[StudentChat] processEffectBackend: unhandled effect.kind", _e.kind, _e.payload);
          break;
        }
      }
    },
    [controller.actions, controller.state.activeAssistantMessageId, llmPort, selectedConversationId]
  );

  const processQueuedEffects = useCallback(() => {
    if (processingRef.current) {
      return;
    }
    const nextEffect = effectQueueRef.current.shift();
    if (!nextEffect) {
      return;
    }

    processingRef.current = true;

    void processEffectBackend(nextEffect)
      .catch((error) => {
        controller.actions.reportExternalFailure(normalizeError(error));
        if (error instanceof Error && /Unauthorized|Forbidden/i.test(error.message)) {
          router.push("/?redirected=1");
        }
      })
      .finally(() => {
        controller.actions.acknowledgeEffect(nextEffect.id);
        enqueuedEffectIdsRef.current.delete(nextEffect.id);
        processingRef.current = false;
        processQueuedEffects();
      });
  }, [controller.actions, processEffectBackend, router]);

  useEffect(() => {
    presenter.pendingEffects.forEach((effect) => {
      if (!enqueuedEffectIdsRef.current.has(effect.id)) {
        enqueuedEffectIdsRef.current.add(effect.id);
        effectQueueRef.current.push(effect);
      }
    });
    processQueuedEffects();
  }, [presenter.pendingEffects, processQueuedEffects]);

  useEffect(() => {
    if (!presenter.pendingEffects.length) {
      controller.actions.requestOlderMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [selectedMentorId, setSelectedMentorId] = useState<string | null>(
    mentorOptions[0]?.mentorId ?? null
  );
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    setSelectedMentorId((previous) => {
      if (previous && mentorOptions.some((option) => option.mentorId === previous)) {
        return previous;
      }
      return mentorOptions[0]?.mentorId ?? null;
    });
  }, [mentorOptions]);

  const handleOpenCreateDialog = useCallback(() => {
    if (!mentorOptions.length) {
      window.alert("選択できるメンターがいません。メンターにお問い合わせください。");
      return;
    }
    setCreateTitle("");
    setSelectedMentorId(mentorOptions[0]?.mentorId ?? null);
    setIsCreateDialogOpen(true);
  }, [mentorOptions]);

  const handleCloseCreateDialog = useCallback(() => {
    setIsCreateDialogOpen(false);
  }, []);

  const handleSubmitCreateDialog = useCallback(async () => {
    if (mentorOptions.length > 0 && !selectedMentorId) {
      window.alert("メンターを選択してください。");
      return;
    }
    setIsCreating(true);
    try {
      await onCreateConversation({ title: createTitle, mentorId: selectedMentorId ?? undefined });
      setIsCreateDialogOpen(false);
      setCreateTitle("");
    } finally {
      setIsCreating(false);
    }
  }, [createTitle, mentorOptions.length, onCreateConversation, selectedMentorId]);

  return (
    <StudentChatView
      conversationTitle={bootstrap.conversation.title}
      conversationOptions={conversationOptions}
      createDialog={{
        isOpen: isCreateDialogOpen,
        title: createTitle,
        mentorOptions,
        selectedMentorId,
        isSubmitting: isCreating,
        onOpen: handleOpenCreateDialog,
        onClose: handleCloseCreateDialog,
        onChangeTitle: setCreateTitle,
        onChangeMentor: (value) => setSelectedMentorId(value ?? null),
        onSubmit: handleSubmitCreateDialog,
      }}
      selectedConversationId={selectedConversationId}
      onConversationChange={onSelectConversation}
      viewModel={presenter.viewModel}
      status={presenter.status}
      meta={presenter.meta}
      interactions={presenter.interactions}
    />
  );
};

const StudentChatPage = () => {
  const conversationIdRef = useRef<string | null>(null);
  const { session, isLoading: isSessionLoading } = useSession();
  const llmPort = useMemo<LLMPort>(
    () =>
      new GeminiLLMPort({
        getConversationId: () => conversationIdRef.current,
        getAccessToken: () => session?.accessToken ?? null,
      }),
    [session?.accessToken]
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  console.log("StudentChatPage: using backend LLM gateway");

  const [bootstrap, setBootstrap] = useState<StudentChatBootstrap | null>(null);
  const [conversationOptions, setConversationOptions] = useState<ConversationOption[]>([]);
  const [mentorOptions, setMentorOptions] = useState<MentorOption[]>([]);
  const [initialTitle, setInitialTitle] = useState("");
  const [initialMentorId, setInitialMentorId] = useState<string | null>(null);
  const [isInitialCreating, setIsInitialCreating] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<UseCaseFailure | null>(null);

  const loadConversation = useCallback(
    async (targetConvId?: string) => {
      if (!session) {
        setLoadError({ kind: "ValidationError", message: "ログインしてください。" });
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        // 1) 대화 목록 조회
        const convList = await apiFetch<{ conv_id: string; title: string; created_at: string }[]>(
          `/conversations/newHire?userId=${encodeURIComponent(session.userId)}`,
          undefined,
          session.accessToken,
        );
        let conversations = convList ?? [];

        // 없으면 새 대화 생성
        if (!conversations.length) {
          const created = await apiFetch<{ conv_id: string; title: string; created_at: string }>(
            "/conversations/newHire",
            {
              method: "POST",
              body: JSON.stringify({
                userId: session.userId,
                title: "新しい会話",
                role: session.role,
                displayName: session.displayName ?? session.userId,
                email: "",
              }),
            },
            session.accessToken,
          );
          conversations = [created];
        }

        const targetConv = targetConvId
          ? conversations.find((c) => c.conv_id === targetConvId) ?? conversations[0]
          : conversations[0];

        // 2) 메시지 조회
        const msgRes = await apiFetch<{ data: MessageDto[] }>(
          `/messages?convId=${encodeURIComponent(targetConv.conv_id)}`,
          undefined,
          session.accessToken,
        );

        const conversation: Conversation = {
          convId: targetConv.conv_id,
          ownerId: session.userId,
          title: targetConv.title,
          state: "ACTIVE",
          createdAt: targetConv.created_at,
          lastActiveAt: targetConv.created_at,
        };

        const messages: Message[] = (msgRes.data ?? []).map(mapMessageDto);
        const assistantMessages = messages.filter((message) => message.role === "ASSISTANT");
        const initialFeedbacks: Record<string, Feedback[]> = {};
        const initialAuthorNames: Record<string, string> = {};

        if (assistantMessages.length && session?.accessToken) {
          await Promise.all(
            assistantMessages.map(async (message) => {
              try {
                const response = await fetch("/api/entitle/student-chat", {
                  method: "POST",
                  credentials: "include",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.accessToken}`,
                  },
                  body: JSON.stringify({
                    action: "listFeedbacks",
                    payload: { msgId: message.msgId },
                  }),
                });
                if (!response.ok) {
                  throw new Error(await response.text());
                }
                const json = (await response.json()) as {
                  data?: {
                    items: Feedback[];
                    authorNames?: Record<string, string>;
                  };
                };
                if (json.data?.items?.length) {
                  initialFeedbacks[message.msgId] = json.data.items;
                }
                if (json.data?.authorNames) {
                  Object.assign(initialAuthorNames, json.data.authorNames);
                }
              } catch (feedbackError) {
                console.warn("[StudentChat] Failed to fetch mentor feedback", {
                  error: feedbackError,
                  messageId: message.msgId,
                });
              }
            })
          );
        }

        const currentUser: User = {
          userId: session.userId,
          role: session.role,
          displayName: session.displayName ?? session.userId,
          email: "",
          createdAt: "",
        };

        setBootstrap({
          conversation,
          currentUser,
          initialMessages: messages,
          initialFeedbacks,
          authorNames: initialAuthorNames,
          mentorAssignments: [],
          availableConversations: conversations.map((c) => ({
            convId: c.conv_id,
            title: c.title,
            lastActiveAt: c.created_at,
          })),
          availableMentors: [],
        });
        setConversationOptions(
          conversations.map((c) => ({
            convId: c.conv_id,
            title: c.title,
            lastActiveAt: c.created_at,
          }))
        );
        setMentorOptions([]);
        setInitialMentorId(null);
        setActiveConversationId(targetConv.conv_id);
        setLoadError(null);
      } catch (error) {
        setLoadError(normalizeError(error));
      } finally {
        setIsLoading(false);
      }
    },
    [session]
  );

  useEffect(() => {
    if (session?.userId) {
      const requestedConvId = searchParams?.get("convId") ?? undefined;
      void loadConversation(requestedConvId);
    }
  }, [loadConversation, searchParams, session?.userId]);

  useEffect(() => {
    if (bootstrap?.conversation) {
      return;
    }
    setInitialMentorId((previous) => {
      if (previous && mentorOptions.some((option) => option.mentorId === previous)) {
        return previous;
      }
      return mentorOptions[0]?.mentorId ?? null;
    });
  }, [bootstrap?.conversation, mentorOptions]);

  const createConversation = useCallback(
    async ({ title, mentorId }: { title: string; mentorId?: string | null }) => {
      const normalizedTitle = title.trim() || "新しい会話";
      const normalizedMentorId = mentorId ?? undefined;

      try {
        const created = await apiFetch<{ conv_id: string; title: string; created_at: string }>("/conversations/newHire", {
          method: "POST",
          body: JSON.stringify({
            userId: session?.userId,
            title: normalizedTitle,
            mentorId: normalizedMentorId,
          }),
        }, session?.accessToken);
        setLoadError(null);
        await loadConversation(created.conv_id);
      } catch (error) {
        setLoadError(normalizeError(error));
      }
    },
    [loadConversation, session?.userId, session?.accessToken]
  );

  const handleInitialCreateSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (mentorOptions.length > 0 && !initialMentorId) {
        window.alert("メンターを選択してください。");
        return;
      }
      setIsInitialCreating(true);
      try {
        await createConversation({ title: initialTitle, mentorId: initialMentorId ?? undefined });
        setInitialTitle("");
      } finally {
        setIsInitialCreating(false);
      }
    },
    [createConversation, initialMentorId, initialTitle, mentorOptions.length]
  );

  const handleConversationChange = useCallback(
    (convId: string) => {
      setActiveConversationId(convId);
      void loadConversation(convId);
    },
    [loadConversation]
  );

  if (isSessionLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-6 w-32" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        ログインしてください。 <a className="text-primary underline" href="/entitle/auth">Auth</a>
      </div>
    );
  }

  if (session.role !== "NEW_HIRE") {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        新入社員のみ利用できます。現在のロール: {session.role}
      </div>
    );
  }

  if (isLoading || !bootstrap) {
    return (
      <div className="p-6" aria-busy="true" aria-live="polite">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-7 w-64" />
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[320px] w-full" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-4 text-sm text-destructive" role="alert" aria-live="polite">
        会話の読み込みに失敗しました: {loadError.message}
      </div>
    );
  }

  if (!bootstrap?.conversation) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        <p>ユーザーを選択して会話を読み込みます。</p>
      </div>
    );
  }

  const selectedConversationId = activeConversationId ?? bootstrap.conversation.convId;
  conversationIdRef.current = selectedConversationId ?? null;

  return (
    <StudentChatRuntime
      key={bootstrap.conversation.convId}
      bootstrap={bootstrap as StudentChatBootstrap & { conversation: Conversation }}
      llmPort={llmPort}
      router={router}
      conversationOptions={conversationOptions}
      mentorOptions={mentorOptions}
      selectedConversationId={selectedConversationId}
      onSelectConversation={handleConversationChange}
      onCreateConversation={createConversation}
    />
  );
};

export default StudentChatPage;
