"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import StudentChatView from "../../src/views/StudentChatView";
import { useStudentChatController } from "../../src/interfaceAdapters/controllers/useStudentChatController";
import { useStudentChatPresenter } from "../../src/interfaceAdapters/presenters/useStudentChatPresenter";
import type { StudentChatControllerEffect } from "../../src/interfaceAdapters/controllers/useStudentChatController";
import type { UseCaseFailure } from "../../src/application/entitle/models";
import type { Conversation, Feedback, MentorAssignment, Message, User } from "../../src/type/core";
import { createDevEntitleAdapters } from "./devAdapters";

const normalizeError = (reason: unknown): UseCaseFailure => ({
  kind: "ValidationError",
  message: reason instanceof Error ? reason.message : String(reason),
});

type StudentChatAction =
  | "createUserMessage"
  | "beginAssistantMessage"
  | "appendAssistantDelta"
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
  devAdapters: ReturnType<typeof createDevEntitleAdapters>;
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
  devAdapters,
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
  const activeAssistantIdRef = useRef<string | null>(null);

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
      switch (effect.kind) {
        case "REQUEST_PERSIST_USER_MESSAGE": {
          const message = (await callStudentChatAction("createUserMessage", effect.payload)) as Message;
          controller.actions.notifyUserMessagePersisted(message);
          break;
        }
        case "REQUEST_BEGIN_ASSISTANT_MESSAGE": {
          const message = (await callStudentChatAction("beginAssistantMessage", effect.payload)) as Message;
          activeAssistantIdRef.current = message.msgId;
          controller.actions.notifyAssistantMessageCreated(message);
          break;
        }
        case "REQUEST_STREAM_ASSISTANT_RESPONSE": {
          const targetMsgId = controller.state.activeAssistantMessageId ?? activeAssistantIdRef.current;
          if (!targetMsgId) {
            throw new Error("Assistant message id is not set.");
          }
          let accumulated = "";
          try {
            for await (const delta of devAdapters.llmPort.streamGenerate(effect.payload)) {
              accumulated += delta.text;
              controller.actions.notifyAssistantDelta(delta);
              await callStudentChatAction("appendAssistantDelta", {
                msgId: targetMsgId,
                delta: delta.text,
                seqNo: delta.seqNo,
              });
            }
            controller.actions.notifyAssistantStreamCompleted(accumulated);
          } catch (streamError) {
            controller.actions.reportExternalFailure(normalizeError(streamError));
            controller.actions.notifyAssistantStreamCancelled();
            await callStudentChatAction("cancelAssistantMessage", { msgId: targetMsgId });
          }
          break;
        }
        case "REQUEST_FINALIZE_ASSISTANT_MESSAGE": {
          const message = (await callStudentChatAction("finalizeAssistantMessage", effect.payload)) as Message;
          controller.actions.notifyAssistantStreamCompleted(message.content);
          activeAssistantIdRef.current = null;
          break;
        }
        case "REQUEST_CANCEL_ASSISTANT_MESSAGE": {
          await callStudentChatAction("cancelAssistantMessage", effect.payload);
          controller.actions.notifyAssistantStreamCancelled();
          activeAssistantIdRef.current = null;
          break;
        }
        case "REQUEST_LIST_MESSAGES": {
          const result = (await callStudentChatAction(
            "listConversationMessages",
            effect.payload
          )) as { items: Message[]; nextCursor?: string };
          controller.actions.notifyMessagesLoaded(result);
          break;
        }
        case "REQUEST_LIST_FEEDBACKS": {
          const result = (await callStudentChatAction("listFeedbacks", effect.payload)) as {
            items: Feedback[];
            nextCursor?: string;
            authorNames: Record<string, string>;
          };
          controller.actions.applyFeedbackForMessage(effect.payload.msgId, result.items, result.authorNames);
          break;
        }
        case "REQUEST_CREATE_FEEDBACK": {
          const result = (await callStudentChatAction("createFeedback", effect.payload)) as {
            feedback: Feedback;
            authorName?: string;
          };
          const existing = controller.state.feedbackByMessageId[result.feedback.targetMsgId] ?? [];
          controller.actions.applyFeedbackForMessage(result.feedback.targetMsgId, [...existing, result.feedback], {
            [result.feedback.authorId]: result.authorName ?? result.feedback.authorId,
          });
          break;
        }
        default:
          break;
      }
    },
    [callStudentChatAction, controller.actions, controller.state.activeAssistantMessageId, controller.state.feedbackByMessageId, devAdapters.llmPort]
  );

  const processEffectDev = useCallback(
    async (effect: StudentChatControllerEffect) => {
      switch (effect.kind) {
        case "REQUEST_PERSIST_USER_MESSAGE": {
          const saved = await devAdapters.messagePort.createUserMessage(effect.payload);
          controller.actions.notifyUserMessagePersisted(saved);
          break;
        }
        case "REQUEST_BEGIN_ASSISTANT_MESSAGE": {
          const assistant = await devAdapters.messagePort.beginAssistantMessage(effect.payload.convId);
          activeAssistantIdRef.current = assistant.msgId;
          controller.actions.notifyAssistantMessageCreated(assistant);
          break;
        }
        case "REQUEST_STREAM_ASSISTANT_RESPONSE": {
          const targetMsgId = controller.state.activeAssistantMessageId ?? activeAssistantIdRef.current;
          if (!targetMsgId) {
            throw new Error("Assistant message id is not available.");
          }
          let accumulated = "";
          try {
            for await (const delta of devAdapters.llmPort.streamGenerate(effect.payload)) {
              accumulated += delta.text;
              controller.actions.notifyAssistantDelta(delta);
              await devAdapters.messagePort.appendAssistantDelta({
                msgId: targetMsgId,
                delta: delta.text,
                seqNo: delta.seqNo,
              });
            }
            controller.actions.notifyAssistantStreamCompleted(accumulated);
          } catch (streamError) {
            controller.actions.reportExternalFailure(normalizeError(streamError));
            controller.actions.notifyAssistantStreamCancelled();
            await devAdapters.messagePort.cancelAssistantMessage(targetMsgId);
          }
          break;
        }
        case "REQUEST_FINALIZE_ASSISTANT_MESSAGE": {
          const finalized = await devAdapters.messagePort.finalizeAssistantMessage(effect.payload);
          controller.actions.notifyAssistantStreamCompleted(finalized.content);
          activeAssistantIdRef.current = null;
          break;
        }
        case "REQUEST_CANCEL_ASSISTANT_MESSAGE": {
          await devAdapters.messagePort.cancelAssistantMessage(effect.payload.msgId);
          controller.actions.notifyAssistantStreamCancelled();
          activeAssistantIdRef.current = null;
          break;
        }
        case "REQUEST_LIST_MESSAGES": {
          const response = await devAdapters.messagePort.listConversationMessages(effect.payload);
          controller.actions.notifyMessagesLoaded({
            items: response.items,
            nextCursor: response.nextCursor,
          });
          break;
        }
        case "REQUEST_LIST_FEEDBACKS": {
          const response = await devAdapters.feedbackPort.listFeedbacks(effect.payload);
          const authorEntries = await Promise.all(
            response.items.map(async (item) => {
              const displayName = await devAdapters.feedbackLookupPort.getUserDisplayName(item.authorId);
              return [item.authorId, displayName ?? item.authorId] as const;
            })
          );
          controller.actions.applyFeedbackForMessage(effect.payload.msgId, response.items, Object.fromEntries(authorEntries));
          break;
        }
        case "REQUEST_CREATE_FEEDBACK": {
          const created = await devAdapters.feedbackPort.createFeedback(effect.payload);
          const existing = controller.state.feedbackByMessageId[created.targetMsgId] ?? [];
          controller.actions.applyFeedbackForMessage(created.targetMsgId, [...existing, created]);
          break;
        }
        default:
          break;
      }
    },
    [controller.actions, controller.state.activeAssistantMessageId, controller.state.feedbackByMessageId, devAdapters.feedbackLookupPort, devAdapters.feedbackPort, devAdapters.llmPort, devAdapters.messagePort]
  );

  useEffect(() => {
    if (processingRef.current) {
      return;
    }
    const effect = presenter.pendingEffects[0];
    if (!effect) {
      return;
    }

    processingRef.current = true;

    const runner = supabaseEnabled ? processEffectSupabase : processEffectDev;

    void runner(effect)
      .catch((error) => {
        controller.actions.reportExternalFailure(normalizeError(error));
        if (error instanceof Error && /Unauthorized|Forbidden/i.test(error.message)) {
          router.push("/?redirected=1");
        }
      })
      .finally(() => {
        controller.actions.acknowledgeEffect(effect.id);
        processingRef.current = false;
      });
  }, [controller.actions, presenter.pendingEffects, processEffectDev, processEffectSupabase, router, supabaseEnabled]);

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
      window.alert("선택할 수 있는 멘토가 없습니다. 멘토에게 문의해 주세요.");
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
      window.alert("멘토를 선택해 주세요.");
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

const StudentChatPagePresenter = () => {
  const devAdapters = useMemo(() => createDevEntitleAdapters(), []);
  const supabaseEnabled = useMemo(
    () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    []
  );
  const router = useRouter();

  const [bootstrap, setBootstrap] = useState<StudentChatBootstrap | null>(() =>
    supabaseEnabled
      ? null
      : {
          conversation: devAdapters.conversation,
          currentUser: devAdapters.newHire,
          initialMessages: devAdapters.initialMessages,
          initialFeedbacks: devAdapters.initialFeedbacks,
          authorNames: {},
          mentorAssignments: [],
          availableConversations: [
            {
              convId: devAdapters.conversation.convId,
              title: devAdapters.conversation.title,
              lastActiveAt: devAdapters.conversation.lastActiveAt,
            },
          ],
          availableMentors: [
            {
              mentorId: devAdapters.mentor.userId,
              displayName: devAdapters.mentor.displayName,
              email: devAdapters.mentor.email,
            },
          ],
        }
  );
  const [conversationOptions, setConversationOptions] = useState<ConversationOption[]>(() =>
    supabaseEnabled
      ? []
      : [
          {
            convId: devAdapters.conversation.convId,
            title: devAdapters.conversation.title,
            lastActiveAt: devAdapters.conversation.lastActiveAt,
          },
        ]
  );
  const [mentorOptions, setMentorOptions] = useState<MentorOption[]>(() =>
    supabaseEnabled
      ? []
      : [
          {
            mentorId: devAdapters.mentor.userId,
            displayName: devAdapters.mentor.displayName,
            email: devAdapters.mentor.email,
          },
        ]
  );
  const [initialTitle, setInitialTitle] = useState("");
  const [initialMentorId, setInitialMentorId] = useState<string | null>(
    supabaseEnabled ? null : devAdapters.mentor.userId
  );
  const [isInitialCreating, setIsInitialCreating] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() =>
    supabaseEnabled ? null : devAdapters.conversation.convId
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
        // convId를 넘기면 해당 대화를, 생략하면 최신 대화를 서버가 알아서 골라줍니다.
        const url = targetConvId ? `/api/entitle/student-chat?convId=${encodeURIComponent(targetConvId)}` : "/api/entitle/student-chat";
        const response = await fetch(url, { cache: "no-store" });
        if (response.status === 401 || response.status === 403) {
          router.push("/?redirected=1");
          setBootstrap(null);
          setLoadError({ kind: "Forbidden", message: "인증이 필요합니다." });
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
      const normalizedTitle = title.trim() || "새 대화";
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

      const nowIso = new Date().toISOString();
      const newConversation: Conversation = {
        convId: `conv-${Date.now()}`,
        ownerId: devAdapters.newHire.userId,
        title: normalizedTitle,
        state: "ACTIVE",
        createdAt: nowIso,
        lastActiveAt: nowIso,
      };

      devAdapters.replaceConversation?.(newConversation);

      const option: ConversationOption = {
        convId: newConversation.convId,
        title: newConversation.title,
        lastActiveAt: newConversation.lastActiveAt,
      };

      setConversationOptions([option]);
      setBootstrap({
        conversation: newConversation,
        currentUser: devAdapters.newHire,
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
                  mentorId: devAdapters.mentor.userId,
                  displayName: devAdapters.mentor.displayName,
                  email: devAdapters.mentor.email,
                },
              ],
      });
      setActiveConversationId(newConversation.convId);
      setLoadError(null);
    },
    [devAdapters, loadConversation, mentorOptions, supabaseEnabled]
  );

  const handleInitialCreateSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (mentorOptions.length > 0 && !initialMentorId) {
        window.alert("멘토를 선택해 주세요.");
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
    return <div className="p-6 text-sm text-muted-foreground">Loading conversation…</div>;
  }

  if (loadError) {
    return (
      <div className="p-4 text-sm text-destructive">
        Failed to load conversation: {loadError.message}
      </div>
    );
  }

  if (!bootstrap?.conversation) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        <p>열람 가능한 대화가 없습니다. 새 대화를 생성해 시작해 보세요.</p>
        {mentorOptions.length ? (
          <form className="flex w-full max-w-sm flex-col gap-3" onSubmit={handleInitialCreateSubmit}>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={initialTitle}
              onChange={(event) => setInitialTitle(event.target.value)}
              placeholder="대화 제목"
            />
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={initialMentorId ?? ""}
              onChange={(event) => setInitialMentorId(event.target.value || null)}
            >
              <option value="" disabled>
                멘토를 선택하세요
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
              {isInitialCreating ? "생성 중..." : "새 대화 만들기"}
            </button>
          </form>
        ) : (
          <p className="text-xs text-muted-foreground">선택할 수 있는 멘토가 없습니다. 관리자에게 문의해 주세요.</p>
        )}
      </div>
    );
  }

  const selectedConversationId = activeConversationId ?? bootstrap.conversation.convId;

  return (
    <StudentChatRuntime
      key={bootstrap.conversation.convId}
      bootstrap={bootstrap as StudentChatBootstrap & { conversation: Conversation }}
      supabaseEnabled={supabaseEnabled}
      devAdapters={devAdapters}
      router={router}
      conversationOptions={conversationOptions}
      mentorOptions={mentorOptions}
      selectedConversationId={selectedConversationId}
      onSelectConversation={handleConversationChange}
      onCreateConversation={createConversation}
    />
  );
};

export default StudentChatPagePresenter;
