"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import StudentChatView from "../../../views/StudentChatView";
import { useStudentChatController } from "../../controllers/useStudentChatController";
import { useStudentChatPresenter } from "../../presenters/useStudentChatPresenter";
import type { StudentChatControllerEffect } from "../../controllers/useStudentChatController";
import type { UseCaseFailure } from "../../../application/entitle/models";
import type { Conversation, Feedback, MentorAssignment, Message, User } from "../../../domain/core";
import type { LLMPort } from "../../../application/entitle/ports";
import type { DevEntitleAdapters } from "../../../../src/dev/devAdapters";
import { createDevEntitleAdapters } from "../../../../src/dev/devAdapters";
import { Skeleton } from "../../../components/ui/skeleton";
import { GeminiLLMPort } from "../../gateways/llm/geminiClientPort";
import { InMemoryLLMPort } from "../../../mocks/llm/inMemoryLLMPort";

const normalizeError = (reason: unknown): UseCaseFailure => ({
  kind: "ValidationError",
  message: reason instanceof Error ? reason.message : String(reason),
});

type StudentChatAction =
  | "createUserMessage"
  | "beginAssistantMessage"
  | "finalizeAssistantMessage"
  | "cancelAssistantMessage"
  | "listConversationMessages"
  | "listFeedbacks"
  | "createFeedback"
  | "createConversation";

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
  supabaseEnabled: boolean;
  sandboxAdapters: DevEntitleAdapters | null;
  llmPort: LLMPort;
  router: ReturnType<typeof useRouter>;
  conversationOptions: ConversationOption[];
  mentorOptions: MentorOption[];
  selectedConversationId: string;
  onSelectConversation: (convId: string) => void;
  onCreateConversation: (input: { title: string; mentorId?: string | null }) => Promise<void>;
}

const StudentChatRuntime = ({
  bootstrap,
  supabaseEnabled,
  sandboxAdapters,
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

  useEffect(() => {
    const debugState = { presenter, controller };
    if (typeof window !== "undefined") {
      (window as unknown as { __studentChat?: typeof debugState }).__studentChat = debugState;
    }
  }, [controller, presenter]);

  useEffect(() => {
    console.log("[StudentChat] pendingEffects", presenter.pendingEffects);
  }, [presenter.pendingEffects]);

  const callStudentChatAction = useCallback(
    async (action: StudentChatAction, payload: unknown): Promise<unknown> => {
      const response = await fetch("/api/entitle/student-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
        cache: "no-store",
      });
      if (response.status === 401 || response.status === 403) {
        throw new Error("Unauthorized");
      }
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const json = (await response.json()) as { data: unknown };
      return json.data;
    },
    []
  );

  const processEffectSupabase = useCallback(
    async (effect: StudentChatControllerEffect) => {
      console.log("[StudentChat] processEffectSupabase start", { kind: effect.kind, payload: effect.payload });
      switch (effect.kind) {
        case "REQUEST_PERSIST_USER_MESSAGE": {
          console.log("[StudentChat] effect: REQUEST_PERSIST_USER_MESSAGE", effect.payload);
          const message = (await callStudentChatAction("createUserMessage", effect.payload)) as Message;
          controller.actions.notifyUserMessagePersisted(message);
          break;
        }
        case "REQUEST_BEGIN_ASSISTANT_MESSAGE": {
          console.log("[StudentChat] effect: REQUEST_BEGIN_ASSISTANT_MESSAGE", effect.payload);
          const message = (await callStudentChatAction("beginAssistantMessage", effect.payload)) as Message;
          activeAssistantIdRef.current = message.msgId;
          controller.actions.notifyAssistantMessageCreated(message);
          break;
        }
        case "REQUEST_GENERATE_ASSISTANT_RESPONSE": {
          console.log("[StudentChat] effect: REQUEST_GENERATE_ASSISTANT_RESPONSE", effect.payload);
          console.log("[StudentChat] Generating assistant response with Gemini LLM Port...");
          const targetMsgId = controller.state.activeAssistantMessageId ?? activeAssistantIdRef.current;
          if (!targetMsgId) {
            throw new Error("Assistant message id is not set.");
          }
          try {
            const finalText = await llmPort.generate(effect.payload);
            controller.actions.notifyAssistantResponseReady(finalText);
            console.log("[StudentChat] Assistant response generation completed.");
          } catch (streamError) {
            controller.actions.reportExternalFailure(normalizeError(streamError));
            controller.actions.notifyAssistantResponseCancelled();
            await callStudentChatAction("cancelAssistantMessage", { msgId: targetMsgId });
          }
          break;
        }
        case "REQUEST_FINALIZE_ASSISTANT_MESSAGE": {
          console.log("[StudentChat] effect: REQUEST_FINALIZE_ASSISTANT_MESSAGE", effect.payload);
          const message = (await callStudentChatAction("finalizeAssistantMessage", effect.payload)) as Message;
          controller.actions.syncAssistantMessage(message);
          activeAssistantIdRef.current = null;
          break;
        }
        case "REQUEST_CANCEL_ASSISTANT_MESSAGE": {
          console.log("[StudentChat] effect: REQUEST_CANCEL_ASSISTANT_MESSAGE", effect.payload);
          const message = (await callStudentChatAction("cancelAssistantMessage", effect.payload)) as Message;
          controller.actions.syncAssistantMessage(message);
          activeAssistantIdRef.current = null;
          break;
        }
        case "REQUEST_LIST_MESSAGES": {
          console.log("[StudentChat] effect: REQUEST_LIST_MESSAGES", effect.payload);
          const result = (await callStudentChatAction(
            "listConversationMessages",
            effect.payload
          )) as { items: Message[]; nextCursor?: string };
          controller.actions.notifyMessagesLoaded(result);
          break;
        }
        case "REQUEST_LIST_FEEDBACKS": {
          console.log("[StudentChat] effect: REQUEST_LIST_FEEDBACKS", effect.payload);
          const result = (await callStudentChatAction("listFeedbacks", effect.payload)) as {
            items: Feedback[];
            nextCursor?: string;
            authorNames: Record<string, string>;
          };
          controller.actions.applyFeedbackForMessage(effect.payload.msgId, result.items, result.authorNames);
          break;
        }
        case "REQUEST_CREATE_FEEDBACK": {
          console.log("[StudentChat] effect: REQUEST_CREATE_FEEDBACK", effect.payload);
          const result = (await callStudentChatAction("createFeedback", effect.payload)) as {
            feedback: Feedback;
            authorName?: string;
          };
          controller.actions.applyFeedbackForMessage(result.feedback.targetMsgId, [result.feedback], {
            [result.feedback.authorId]: result.authorName ?? result.feedback.authorId,
          });
          break;
        }
        default: {
          const _e: any = effect;
          console.warn("[StudentChat] processEffectSupabase: unhandled effect.kind", _e.kind, _e.payload);
          break;
        }
      }
    },
    [callStudentChatAction, controller.actions, controller.state.activeAssistantMessageId, controller.state.feedbackByMessageId, llmPort]
  );

  const processEffectDev = useCallback(
    async (effect: StudentChatControllerEffect) => {
      console.log("[StudentChat][Dev] processEffectDev start", { kind: (effect as any).kind, payload: (effect as any).payload });
      if (!sandboxAdapters) {
        throw new Error("Dev sandbox is disabled.");
      }
      switch (effect.kind) {
        case "REQUEST_PERSIST_USER_MESSAGE": {
          console.log("[StudentChat][Dev] REQUEST_PERSIST_USER_MESSAGE", effect.payload);
          const saved = await sandboxAdapters.messagePort.createUserMessage(effect.payload);
          controller.actions.notifyUserMessagePersisted(saved);
          break;
        }
        case "REQUEST_BEGIN_ASSISTANT_MESSAGE": {
          console.log("[StudentChat][Dev] REQUEST_BEGIN_ASSISTANT_MESSAGE", effect.payload);
          const assistant = await sandboxAdapters.messagePort.beginAssistantMessage(effect.payload.convId);
          activeAssistantIdRef.current = assistant.msgId;
          controller.actions.notifyAssistantMessageCreated(assistant);
          break;
        }
        case "REQUEST_GENERATE_ASSISTANT_RESPONSE": {
          console.log("[StudentChat][Dev] REQUEST_GENERATE_ASSISTANT_RESPONSE", effect.payload);
          const targetMsgId = controller.state.activeAssistantMessageId ?? activeAssistantIdRef.current;
          if (!targetMsgId) {
            throw new Error("Assistant message id is not available.");
          }
          try {
            console.log("[StudentChat][Dev] calling sandboxAdapters.llmPort.generate", { payload: effect.payload });
            const finalText = await sandboxAdapters.llmPort.generate(effect.payload);
            console.log("[StudentChat][Dev] sandboxAdapters.llmPort.generate resolved", { textPreview: String(finalText).slice(0, 200) });
            controller.actions.notifyAssistantResponseReady(finalText);
          } catch (streamError) {
            console.error("[StudentChat][Dev] sandboxAdapters.llmPort.generate error", streamError);
            controller.actions.reportExternalFailure(normalizeError(streamError));
            controller.actions.notifyAssistantResponseCancelled();
            await sandboxAdapters.messagePort.cancelAssistantMessage(targetMsgId);
          }
          break;
        }
        case "REQUEST_FINALIZE_ASSISTANT_MESSAGE": {
          const finalized = await sandboxAdapters.messagePort.finalizeAssistantMessage(effect.payload);
          controller.actions.syncAssistantMessage(finalized);
          activeAssistantIdRef.current = null;
          break;
        }
        case "REQUEST_CANCEL_ASSISTANT_MESSAGE": {
          const cancelled = await sandboxAdapters.messagePort.cancelAssistantMessage(effect.payload.msgId);
          controller.actions.syncAssistantMessage(cancelled);
          activeAssistantIdRef.current = null;
          break;
        }
        case "REQUEST_LIST_MESSAGES": {
          const response = await sandboxAdapters.messagePort.listConversationMessages(effect.payload);
          controller.actions.notifyMessagesLoaded({
            items: response.items,
            nextCursor: response.nextCursor,
          });
          break;
        }
        case "REQUEST_LIST_FEEDBACKS": {
          const response = await sandboxAdapters.feedbackPort.listFeedbacks(effect.payload);
          const authorEntries = await Promise.all(
            response.items.map(async (item) => {
              const displayName = await sandboxAdapters.feedbackLookupPort.getUserDisplayName(item.authorId);
              return [item.authorId, displayName ?? item.authorId] as const;
            })
          );
          controller.actions.applyFeedbackForMessage(effect.payload.msgId, response.items, Object.fromEntries(authorEntries));
          break;
        }
        case "REQUEST_CREATE_FEEDBACK": {
          const created = await sandboxAdapters.feedbackPort.createFeedback(effect.payload);
          controller.actions.applyFeedbackForMessage(created.targetMsgId, [created]);
          break;
        }
        default:
          console.warn("[StudentChat][Dev] unhandled effect", effect);
          break;
      }
    },
    [
      controller.actions,
      controller.state.activeAssistantMessageId,
      controller.state.feedbackByMessageId,
      sandboxAdapters,
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
    const runner = supabaseEnabled ? processEffectSupabase : sandboxAdapters ? processEffectDev : null;

    if (!runner) {
      controller.actions.reportExternalFailure({
        kind: "ValidationError",
        message: "Supabase 未設定のためチャットを開始できません。開発サンドボックスを利用する場合は NEXT_PUBLIC_ENTITLE_SANDBOX=1 を設定してください。",
      });
      controller.actions.acknowledgeEffect(nextEffect.id);
      enqueuedEffectIdsRef.current.delete(nextEffect.id);
      processingRef.current = false;
      processQueuedEffects();
      return;
    }

    void runner(nextEffect)
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
  }, [controller.actions, processEffectDev, processEffectSupabase, router, sandboxAdapters, supabaseEnabled]);

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
  const supabaseEnabled = useMemo(
    () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    []
  );
  const sandboxEnabled = useMemo(() => process.env.NEXT_PUBLIC_ENTITLE_SANDBOX === "1", []);
  const sandboxAdapters = useMemo(() => (sandboxEnabled ? createDevEntitleAdapters() : null), [sandboxEnabled]);
  const enableGemini = useMemo(() => process.env.NEXT_PUBLIC_ENABLE_GEMINI === "1", []);
  const conversationIdRef = useRef<string | null>(null);
  const llmPort = useMemo<LLMPort>(
    () =>
      enableGemini
        ? new GeminiLLMPort({
            getConversationId: () => conversationIdRef.current,
          })
        : new InMemoryLLMPort(),
    [enableGemini]
  );
  const router = useRouter();
  console.log("StudentChatPage: supabaseEnabled =", supabaseEnabled, ", sandboxEnabled =", sandboxEnabled, ", enableGemini =", enableGemini);
  const [bootstrap, setBootstrap] = useState<StudentChatBootstrap | null>(() => {
    if (supabaseEnabled || !sandboxAdapters) {
      return null;
    }
    return {
      conversation: sandboxAdapters.conversation,
      currentUser: sandboxAdapters.newHire,
      initialMessages: sandboxAdapters.initialMessages,
      initialFeedbacks: sandboxAdapters.initialFeedbacks,
      authorNames: {},
      mentorAssignments: [],
      availableConversations: [
        {
          convId: sandboxAdapters.conversation.convId,
          title: sandboxAdapters.conversation.title,
          lastActiveAt: sandboxAdapters.conversation.lastActiveAt,
        },
      ],
      availableMentors: [
        {
          mentorId: sandboxAdapters.mentor.userId,
          displayName: sandboxAdapters.mentor.displayName,
          email: sandboxAdapters.mentor.email,
        },
      ],
    };
  });
  const [conversationOptions, setConversationOptions] = useState<ConversationOption[]>(() =>
    supabaseEnabled || !sandboxAdapters
      ? []
      : [
          {
            convId: sandboxAdapters.conversation.convId,
            title: sandboxAdapters.conversation.title,
            lastActiveAt: sandboxAdapters.conversation.lastActiveAt,
          },
        ]
  );
  const [mentorOptions, setMentorOptions] = useState<MentorOption[]>(() =>
    supabaseEnabled || !sandboxAdapters
      ? []
      : [
          {
            mentorId: sandboxAdapters.mentor.userId,
            displayName: sandboxAdapters.mentor.displayName,
            email: sandboxAdapters.mentor.email,
          },
        ]
  );
  const [initialTitle, setInitialTitle] = useState("");
  const [initialMentorId, setInitialMentorId] = useState<string | null>(
    supabaseEnabled ? null : sandboxAdapters?.mentor.userId ?? null
  );
  const [isInitialCreating, setIsInitialCreating] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() =>
    supabaseEnabled ? null : sandboxAdapters?.conversation.convId ?? null
  );
  const [isLoading, setIsLoading] = useState<boolean>(supabaseEnabled);
  const [loadError, setLoadError] = useState<UseCaseFailure | null>(null);

  const loadConversation = useCallback(
    async (targetConvId?: string) => {
      if (!supabaseEnabled) {
        return;
      }
      setIsLoading(true);
      try {
        // convId を指定するとその会話を、指定しない場合は最新の会話をサーバー側が選択します。
        const url = targetConvId ? `/api/entitle/student-chat?convId=${encodeURIComponent(targetConvId)}` : "/api/entitle/student-chat";
        const response = await fetch(url, { cache: "no-store" });
        if (response.status === 401 || response.status === 403) {
          router.push("/?redirected=1");
          setBootstrap(null);
          setLoadError({ kind: "Forbidden", message: "認証が必要です。" });
          return;
        }
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const json = (await response.json()) as { data: StudentChatBootstrap };
        setBootstrap(json.data);
        setConversationOptions(json.data.availableConversations ?? []);
        setMentorOptions(json.data.availableMentors ?? []);
        setInitialMentorId((previous) => {
          const mentors = json.data.availableMentors ?? [];
          if (previous && mentors.some((mentor) => mentor.mentorId === previous)) {
            return previous;
          }
          return mentors[0]?.mentorId ?? null;
        });
        setActiveConversationId(json.data.conversation?.convId ?? null);
        setLoadError(null);
      } catch (error) {
        setLoadError(normalizeError(error));
      } finally {
        setIsLoading(false);
      }
    },
    [router, supabaseEnabled]
  );

  useEffect(() => {
    if (!supabaseEnabled) {
      return;
    }
    void loadConversation();
  }, [loadConversation, supabaseEnabled]);

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

      if (supabaseEnabled) {
        try {
          const response = await fetch("/api/entitle/student-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "createConversation",
              payload: { title: normalizedTitle, mentorId: normalizedMentorId },
            }),
            cache: "no-store",
          });
          if (!response.ok) {
            throw new Error(await response.text());
          }
          const json = (await response.json()) as { data: Conversation };
          setLoadError(null);
          await loadConversation(json.data.convId);
        } catch (error) {
          setLoadError(normalizeError(error));
        }
        return;
      }

      if (!sandboxAdapters) {
        setLoadError({
          kind: "ValidationError",
          message: "サンドボックスが無効です。Supabase を設定するか NEXT_PUBLIC_ENTITLE_SANDBOX=1 を有効化してください。",
        });
        return;
      }

      const nowIso = new Date().toISOString();
      const newConversation: Conversation = {
        convId: `conv-${Date.now()}`,
        ownerId: sandboxAdapters.newHire.userId,
        title: normalizedTitle,
        state: "ACTIVE",
        createdAt: nowIso,
        lastActiveAt: nowIso,
      };

      sandboxAdapters.replaceConversation?.(newConversation);

      const option: ConversationOption = {
        convId: newConversation.convId,
        title: newConversation.title,
        lastActiveAt: newConversation.lastActiveAt,
      };

      setConversationOptions([option]);
      setBootstrap({
        conversation: newConversation,
        currentUser: sandboxAdapters.newHire,
        initialMessages: [],
        initialFeedbacks: {},
        authorNames: {},
        mentorAssignments: [],
        availableConversations: [option],
        availableMentors:
          mentorOptions.length > 0
            ? mentorOptions
            : [
                {
                  mentorId: sandboxAdapters.mentor.userId,
                  displayName: sandboxAdapters.mentor.displayName,
                  email: sandboxAdapters.mentor.email,
                },
              ],
      });
      setActiveConversationId(newConversation.convId);
      setLoadError(null);
    },
    [loadConversation, mentorOptions, sandboxAdapters, supabaseEnabled]
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
      if (supabaseEnabled) {
        setActiveConversationId(convId);
        void loadConversation(convId);
        return;
      }
      setActiveConversationId(convId);
    },
    [loadConversation, supabaseEnabled]
  );

  if (supabaseEnabled && (isLoading || !bootstrap)) {
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

  if (!supabaseEnabled && !sandboxAdapters) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        Supabase 環境変数が設定されていません。開発サンドボックスを利用する場合は `NEXT_PUBLIC_ENTITLE_SANDBOX=1` を指定してください。
      </div>
    );
  }

  if (!bootstrap?.conversation) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        <p>閲覧できる会話がありません。新しい会話を作成して始めましょう。</p>
        {mentorOptions.length ? (
          <form className="flex w-full max-w-sm flex-col gap-3" onSubmit={handleInitialCreateSubmit}>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={initialTitle}
              onChange={(event) => setInitialTitle(event.target.value)}
              placeholder="会話タイトル"
            />
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={initialMentorId ?? ""}
              onChange={(event) => setInitialMentorId(event.target.value || null)}
            >
              <option value="" disabled>
                メンターを選択してください
              </option>
              {mentorOptions.map((option) => (
                <option key={option.mentorId} value={option.mentorId}>
                  {option.displayName}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm"
              disabled={isInitialCreating || (mentorOptions.length > 0 && !initialMentorId)}
            >
              {isInitialCreating ? "作成中..." : "新しい会話を作成"}
            </button>
          </form>
        ) : (
          <p className="text-xs text-muted-foreground">選択できるメンターがいません。管理者にお問い合わせください。</p>
        )}
      </div>
    );
  }

  const selectedConversationId = activeConversationId ?? bootstrap.conversation.convId;
  conversationIdRef.current = selectedConversationId ?? null;

  return (
    <StudentChatRuntime
      key={bootstrap.conversation.convId}
      bootstrap={bootstrap as StudentChatBootstrap & { conversation: Conversation }}
      supabaseEnabled={supabaseEnabled}
      sandboxAdapters={sandboxAdapters}
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
