"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

import StudentChatView from "../../../views/StudentChatView";
import { useStudentChatController } from "../../controllers/useStudentChatController";
import { useStudentChatPresenter } from "../../presenters/useStudentChatPresenter";
import type { StudentChatControllerEffect } from "../../controllers/useStudentChatController";
import type { UseCaseFailure } from "../../../application/entitle/models";
import type {
  Conversation,
  Feedback,
  MentorAssignment,
  Message,
  User,
} from "../../../domain/core";
import { Skeleton } from "../../../components/ui/skeleton";
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

type StudentChatApiAction =
  | "createUserMessage"
  | "finalizeAssistantMessage"
  | "listConversationMessages"
  | "listFeedbacks"
  | "createFeedback"
  | "createConversation"
  | "deleteConversation";

interface StudentChatRuntimeProps {
  bootstrap: StudentChatBootstrap & { conversation: Conversation };
  accessToken?: string | null;
  router: ReturnType<typeof useRouter>;
  conversationOptions: ConversationOption[];
  mentorOptions: MentorOption[];
  selectedConversationId: string;
  onSelectConversation: (convId: string) => void;
  onCreateConversation: (input: {
    title: string;
    mentorId?: string | null;
  }) => Promise<void>;
  onDeleteConversation: (convId: string) => Promise<void>;
  callStudentChatApi: <T>(
    action: StudentChatApiAction,
    payload?: unknown
  ) => Promise<T>;
}

const StudentChatRuntime = ({
  bootstrap,
  accessToken,
  router,
  conversationOptions,
  mentorOptions,
  selectedConversationId,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
  callStudentChatApi,
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

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const processingRef = useRef(false);
  const effectQueueRef = useRef<StudentChatControllerEffect[]>([]);
  const enqueuedEffectIdsRef = useRef<Set<string>>(new Set());
  const activeAssistantIdRef = useRef<string | null>(null);

  const processEffectBackend = useCallback(
    async (effect: StudentChatControllerEffect) => {
      const resolveConvId = () =>
        (effect.payload as any).convId ?? selectedConversationId ?? null;

      switch (effect.kind) {
        case "REQUEST_PERSIST_USER_MESSAGE": {
          const convId = resolveConvId();
          if (!convId) throw new Error("convId is required");
          const result = await callStudentChatApi<{ data: Message }>(
            "createUserMessage",
            {
              convId,
              content: effect.payload.content,
            }
          );
          controller.actions.notifyUserMessagePersisted(result.data);
          controller.actions.enqueueAssistantAfterUserMessage(result.data);
          break;
        }
        case "REQUEST_BEGIN_ASSISTANT_MESSAGE": {
          const convId = resolveConvId();
          if (!convId) throw new Error("convId is required");
          const tempId =
            typeof crypto !== "undefined" &&
            typeof crypto.randomUUID === "function"
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
          console.log("[LLM debug] effect payload", effect.payload);
          const targetMsgId =
            controller.state.activeAssistantMessageId ??
            activeAssistantIdRef.current;
          if (!targetMsgId) {
            throw new Error("Assistant message id is not set.");
          }
          try {
            const convId = resolveConvId();
            console.log("[LLM debug] convId", convId);
            if (!convId) {
              throw new Error("convId is required");
            }
            const payload = effect.payload as {
              prompt: { messages: { role: string; content: string }[] };
              modelId?: string;
              runtimeId?: string;
              signal?: AbortSignal;
            };
            const questionMessage = [...(payload.prompt?.messages ?? [])]
              .reverse()
              .find((message) => message.role === "user");
            const question = questionMessage?.content?.trim() ?? "";
            console.log("[LLM debug] question", question);
            if (!question) {
              throw new Error("Question must not be empty.");
            }

            const response = await fetch("/api/llm/generate", {
              method: "POST",
              cache: "no-store",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                ...(accessToken
                  ? { Authorization: `Bearer ${accessToken}` }
                  : {}),
              },
              body: JSON.stringify({
                question,
                conversationId: convId,
                modelId: payload.modelId,
                runtimeId: payload.runtimeId,
              }),
              signal: payload.signal,
            });
            const raw = await response.text();
            let json: any = null;
            if (raw) {
              try {
                json = JSON.parse(raw);
              } catch {
                json = null;
              }
            }
            if (!response.ok) {
              const message =
                json?.error ?? raw ?? "LLM backend request failed.";
              throw new Error(message);
            }
            const finalText = json?.answer;
            if (!finalText || typeof finalText !== "string") {
              throw new Error("LLM backend response did not include answer.");
            }
            controller.actions.notifyAssistantResponseReady(finalText);
          } catch (streamError) {
            controller.actions.reportExternalFailure(
              normalizeError(streamError)
            );
            controller.actions.notifyAssistantResponseCancelled();
          }
          break;
        }
        case "REQUEST_FINALIZE_ASSISTANT_MESSAGE": {
          const convId = resolveConvId();
          if (!convId) throw new Error("convId is required");
          const result = await callStudentChatApi<{ data: Message }>(
            "finalizeAssistantMessage",
            {
              convId,
              content:
                (effect.payload as any).content ??
                (effect.payload as any).finalText ??
                "",
            }
          );
          controller.actions.syncAssistantMessage({
            ...result.data,
            status: result.data.status ?? "DONE",
          });
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
          const result = await callStudentChatApi<{
            data: { items: Message[]; nextCursor?: string };
          }>("listConversationMessages", {
            convId,
          });
          controller.actions.notifyMessagesLoaded(result.data);
          break;
        }
        case "REQUEST_LIST_FEEDBACKS": {
          const result = await callStudentChatApi<{
            data: { items: Feedback[]; authorNames?: Record<string, string> };
          }>("listFeedbacks", {
            msgId: effect.payload.msgId,
          });
          controller.actions.applyFeedbackForMessage(
            effect.payload.msgId,
            result.data.items,
            result.data.authorNames ?? {}
          );
          break;
        }
        case "REQUEST_CREATE_FEEDBACK": {
          const result = await callStudentChatApi<{ data: Feedback }>(
            "createFeedback",
            {
              targetMsgId: effect.payload.targetMsgId,
              content: effect.payload.content,
            }
          );
          controller.actions.applyFeedbackForMessage(
            result.data.targetMsgId,
            [result.data],
            {
              [result.data.authorId]: result.data.authorId,
            }
          );
          break;
        }
        default: {
          const _e: any = effect;
          console.warn(
            "[StudentChat] processEffectBackend: unhandled effect.kind",
            _e.kind,
            _e.payload
          );
          break;
        }
      }
    },
    [
      accessToken,
      callStudentChatApi,
      controller.actions,
      controller.state.activeAssistantMessageId,
      selectedConversationId,
    ]
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
        if (
          error instanceof Error &&
          /Unauthorized|Forbidden/i.test(error.message)
        ) {
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

  return (
    <StudentChatView
      conversationTitle={bootstrap.conversation.title}
      conversationOptions={conversationOptions}
      selectedConversationId={selectedConversationId}
      onConversationChange={onSelectConversation}
      createDialog={{
        isOpen: isCreateDialogOpen,
        title: createTitle,
        isSubmitting: isCreating,
        onOpen: () => {
          setCreateTitle("");
          setIsCreateDialogOpen(true);
        },
        onClose: () => setIsCreateDialogOpen(false),
        onChangeTitle: setCreateTitle,
        onSubmit: async () => {
          setIsCreating(true);
          try {
            await onCreateConversation({ title: createTitle });
            setIsCreateDialogOpen(false);
            setCreateTitle("");
          } finally {
            setIsCreating(false);
          }
        },
      }}
      onDeleteConversation={
        selectedConversationId
          ? () => onDeleteConversation(selectedConversationId)
          : undefined
      }
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
  const router = useRouter();
  const searchParams = useSearchParams();
  console.log("StudentChatPage: using backend LLM gateway");

  const [bootstrap, setBootstrap] = useState<StudentChatBootstrap | null>(null);
  const [conversationOptions, setConversationOptions] = useState<
    ConversationOption[]
  >([]);
  const [mentorOptions, setMentorOptions] = useState<MentorOption[]>([]);
  const [initialTitle, setInitialTitle] = useState("");
  const [isInitialCreating, setIsInitialCreating] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<UseCaseFailure | null>(null);

  const callStudentChatApi = useCallback(
    async <T,>(action: StudentChatApiAction, payload?: unknown): Promise<T> => {
      const response = await fetch("/api/entitle/student-chat", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(session?.accessToken
            ? { Authorization: `Bearer ${session.accessToken}` }
            : {}),
        },
        body: JSON.stringify({ action, payload }),
      });
      const raw = await response.text();
      let json: any = null;
      if (raw) {
        try {
          json = JSON.parse(raw);
        } catch {
          json = null;
        }
      }
      if (!response.ok) {
        const message =
          json?.error ?? json?.message ?? raw ?? "Unexpected error";
        throw new Error(message);
      }
      return json as T;
    },
    [session?.accessToken]
  );

  const fetchBootstrap = useCallback(
    async (convId?: string) => {
      const params = new URLSearchParams();
      if (convId) {
        params.set("convId", convId);
      }
      const response = await fetch(
        `/api/entitle/student-chat${
          params.toString() ? `?${params.toString()}` : ""
        }`,
        {
          cache: "no-store",
          credentials: "include",
          headers: {
            ...(session?.accessToken
              ? { Authorization: `Bearer ${session.accessToken}` }
              : {}),
          },
        }
      );
      const raw = await response.text();
      let json: any = null;
      if (raw) {
        try {
          json = JSON.parse(raw);
        } catch {
          json = null;
        }
      }
      if (!response.ok) {
        const message = json?.error ?? raw ?? "Unexpected error";
        throw new Error(message);
      }
      return json as { data?: StudentChatBootstrap };
    },
    [session?.accessToken]
  );

  const loadConversation = useCallback(
    async (targetConvId?: string) => {
      if (!session) {
        setLoadError({
          kind: "ValidationError",
          message: "ログインしてください。",
        });
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        let bootstrapResponse = await fetchBootstrap(targetConvId);
        let data = bootstrapResponse.data;
        if (!data) {
          throw new Error("会話データが取得できませんでした。");
        }

        if (!data.conversation) {
          const created = await callStudentChatApi<{ data: Conversation }>(
            "createConversation",
            {
              title: "新しい会話",
            }
          );
          bootstrapResponse = await fetchBootstrap(created.data.convId);
          data = bootstrapResponse.data;
        }

        if (!data?.conversation) {
          throw new Error("会話データが取得できませんでした。");
        }

        setBootstrap(data);
        setConversationOptions(data.availableConversations);
        setMentorOptions(data.availableMentors);
        setActiveConversationId(data.conversation.convId);
        setLoadError(null);
      } catch (error) {
        setLoadError(normalizeError(error));
      } finally {
        setIsLoading(false);
      }
    },
    [callStudentChatApi, fetchBootstrap, session]
  );

  useEffect(() => {
    if (session?.userId) {
      const requestedConvId = searchParams?.get("convId") ?? undefined;
      void loadConversation(requestedConvId);
    }
  }, [loadConversation, searchParams, session?.userId]);

  const createConversation = useCallback(
    async ({ title }: { title: string; mentorId?: string | null }) => {
      const normalizedTitle = title.trim() || "新しい会話";
      try {
        const created = await callStudentChatApi<{ data: Conversation }>(
          "createConversation",
          {
            title: normalizedTitle,
          }
        );
        setLoadError(null);
        await loadConversation(created.data.convId);
      } catch (error) {
        setLoadError(normalizeError(error));
      }
    },
    [callStudentChatApi, loadConversation]
  );

  const deleteConversation = useCallback(
    async (convId: string) => {
      try {
        await callStudentChatApi<unknown>("deleteConversation", {
          convId,
        });
        setLoadError(null);
        await loadConversation();
      } catch (error) {
        setLoadError(normalizeError(error));
      }
    },
    [callStudentChatApi, loadConversation]
  );

  const handleInitialCreateSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsInitialCreating(true);
      try {
        await createConversation({ title: initialTitle });
        setInitialTitle("");
      } finally {
        setIsInitialCreating(false);
      }
    },
    [createConversation, initialTitle]
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
        ログインしてください。{" "}
        <a className="text-primary underline" href="/entitle/auth">
          Auth
        </a>
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
      <div
        className="p-4 text-sm text-destructive"
        role="alert"
        aria-live="polite"
      >
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

  const selectedConversationId =
    activeConversationId ?? bootstrap.conversation.convId;
  conversationIdRef.current = selectedConversationId ?? null;

  return (
    <StudentChatRuntime
      key={bootstrap.conversation.convId}
      bootstrap={
        bootstrap as StudentChatBootstrap & { conversation: Conversation }
      }
      accessToken={session.accessToken}
      router={router}
      conversationOptions={conversationOptions}
      mentorOptions={mentorOptions}
      selectedConversationId={selectedConversationId}
      onSelectConversation={handleConversationChange}
      onCreateConversation={createConversation}
       onDeleteConversation={deleteConversation}
      callStudentChatApi={callStudentChatApi}
    />
  );
};

export default StudentChatPage;
