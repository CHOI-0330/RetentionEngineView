"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

import StudentChatView from "../../../views/StudentChatView";
import { useStudentChatController } from "../../controllers/useStudentChatController";
import { useStudentChatPresenter } from "../../presenters/useStudentChatPresenter";
import type { StudentChatControllerEffect } from "../../controllers/useStudentChatController";
import type { UseCaseFailure } from "../../../application/entitle/models";
import type { Conversation, Feedback, Message } from "../../../domain/core";
import { Skeleton } from "../../../components/ui/skeleton";

// 공통 훅 & 유틸리티 사용
import {
  useEffectQueue,
  useSessionGuard,
  useStudentChatGateway,
  type StudentChatBootstrap,
  type ConversationOption,
  type MentorOption,
} from "../../hooks";
import { normalizeError, isAuthError } from "../../utils/errors";

// Gateway 임포트
import { StudentChatGateway, LLMGateway } from "../../gateways/api/StudentChatGateway";

interface StudentChatRuntimeProps {
  bootstrap: StudentChatBootstrap & { conversation: Conversation };
  router: ReturnType<typeof useRouter>;
  conversationOptions: ConversationOption[];
  mentorOptions: MentorOption[];
  selectedConversationId: string;
  onSelectConversation: (convId: string) => void;
  onCreateConversation: (input: { title: string }) => Promise<void>;
  onDeleteConversation: (convId: string) => Promise<void>;
  gateway: StudentChatGateway;
  llmGateway: LLMGateway;
}

const StudentChatRuntime = ({
  bootstrap,
  router,
  conversationOptions,
  selectedConversationId,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
  gateway,
  llmGateway,
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

  const activeAssistantIdRef = useRef<string | null>(null);

  // Effect 처리 함수 - Gateway를 통해 API 호출
  const processEffect = useCallback(
    async (effect: StudentChatControllerEffect) => {
      const resolveConvId = () =>
        (effect.payload as { convId?: string }).convId ?? selectedConversationId ?? null;

      switch (effect.kind) {
        case "REQUEST_PERSIST_USER_MESSAGE": {
          const convId = resolveConvId();
          if (!convId) throw new Error("convId is required");
          const result = await gateway.createUserMessage({
            convId,
            authorId: bootstrap.currentUser.userId,
            content: effect.payload.content,
          });
          controller.actions.notifyUserMessagePersisted(result);
          controller.actions.enqueueAssistantAfterUserMessage(result);
          break;
        }
        case "REQUEST_BEGIN_ASSISTANT_MESSAGE": {
          const convId = resolveConvId();
          if (!convId) throw new Error("convId is required");
          const tempMessage = await gateway.beginAssistantMessage(convId);
          activeAssistantIdRef.current = tempMessage.msgId;
          controller.actions.notifyAssistantMessageCreated(tempMessage);
          break;
        }
        case "REQUEST_GENERATE_ASSISTANT_RESPONSE": {
          const targetMsgId =
            controller.state.activeAssistantMessageId ??
            activeAssistantIdRef.current;
          if (!targetMsgId) {
            throw new Error("Assistant message id is not set.");
          }
          try {
            const convId = resolveConvId();
            if (!convId) {
              throw new Error("convId is required");
            }
            const payload = effect.payload as {
              prompt: { messages: { role: string; content: string }[] };
              modelId?: string;
              runtimeId?: string;
            };
            const questionMessage = [...(payload.prompt?.messages ?? [])]
              .reverse()
              .find((message) => message.role === "user");
            const question = questionMessage?.content?.trim() ?? "";
            if (!question) {
              throw new Error("Question must not be empty.");
            }

            const result = await llmGateway.generateResponse({
              question,
              conversationId: convId,
              modelId: payload.modelId,
              runtimeId: payload.runtimeId,
            });

            if (!result.answer || typeof result.answer !== "string") {
              throw new Error("LLM backend response did not include answer.");
            }
            controller.actions.notifyAssistantResponseReady(result.answer);
          } catch (streamError) {
            controller.actions.reportExternalFailure(normalizeError(streamError));
            controller.actions.notifyAssistantResponseCancelled();
          }
          break;
        }
        case "REQUEST_FINALIZE_ASSISTANT_MESSAGE": {
          const convId = resolveConvId();
          if (!convId) throw new Error("convId is required");
          const payload = effect.payload as { content?: string; finalText?: string };
          const result = await gateway.finalizeAssistantMessageWithConvId({
            convId,
            content: payload.content ?? payload.finalText ?? "",
          });
          controller.actions.syncAssistantMessage({
            ...result,
            status: result.status ?? "DONE",
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
          const result = await gateway.listConversationMessages({ convId });
          controller.actions.notifyMessagesLoaded(result);
          break;
        }
        case "REQUEST_LIST_FEEDBACKS": {
          const result = await gateway.listFeedbacks({
            msgId: effect.payload.msgId,
          });
          controller.actions.applyFeedbackForMessage(
            effect.payload.msgId,
            result.items,
            result.authorNames ?? {}
          );
          break;
        }
        case "REQUEST_CREATE_FEEDBACK": {
          const result = await gateway.createFeedback({
            targetMsgId: effect.payload.targetMsgId,
            authorId: bootstrap.currentUser.userId,
            authorRole: bootstrap.currentUser.role as "NEW_HIRE" | "MENTOR",
            content: effect.payload.content,
          });
          controller.actions.applyFeedbackForMessage(
            result.targetMsgId,
            [result],
            { [result.authorId]: result.authorId }
          );
          break;
        }
        default: {
          console.warn(
            "[StudentChat] processEffect: unhandled effect.kind",
            (effect as { kind: string }).kind
          );
          break;
        }
      }
    },
    [
      gateway,
      llmGateway,
      controller.actions,
      controller.state.activeAssistantMessageId,
      selectedConversationId,
      bootstrap.currentUser.userId,
      bootstrap.currentUser.role,
    ]
  );

  // Effect 큐 처리 (공통 훅 사용)
  useEffectQueue({
    pendingEffects: presenter.pendingEffects,
    processEffect,
    onEffectComplete: (effect) => {
      controller.actions.acknowledgeEffect(effect.id);
    },
    onError: (error) => {
      controller.actions.reportExternalFailure(normalizeError(error));
      if (isAuthError(error)) {
        router.push("/?redirected=1");
      }
    },
  });

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
  const router = useRouter();
  const searchParams = useSearchParams();

  // 세션 가드 (NEW_HIRE 역할 필요)
  const { state: sessionState, session } = useSessionGuard({
    requiredRole: "NEW_HIRE",
  });

  // Gateway 인스턴스 생성
  const { gateway, llmGateway } = useStudentChatGateway({
    accessToken: session?.accessToken,
  });

  const [bootstrap, setBootstrap] = useState<StudentChatBootstrap | null>(null);
  const [conversationOptions, setConversationOptions] = useState<ConversationOption[]>([]);
  const [mentorOptions, setMentorOptions] = useState<MentorOption[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<UseCaseFailure | null>(null);

  // Gateway를 사용한 데이터 로드
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
        let data = await gateway.fetchBootstrap(targetConvId);

        if (!data.conversation) {
          const created = await gateway.createConversation({ title: "新しい会話" });
          data = await gateway.fetchBootstrap(created.convId);
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
    [gateway, session]
  );

  useEffect(() => {
    if (session?.userId) {
      const requestedConvId = searchParams?.get("convId") ?? undefined;
      void loadConversation(requestedConvId);
    }
  }, [loadConversation, searchParams, session?.userId]);

  const createConversation = useCallback(
    async ({ title }: { title: string }) => {
      const normalizedTitle = title.trim() || "新しい会話";
      try {
        const created = await gateway.createConversation({ title: normalizedTitle });
        setLoadError(null);
        await loadConversation(created.convId);
      } catch (error) {
        setLoadError(normalizeError(error));
      }
    },
    [gateway, loadConversation]
  );

  const deleteConversation = useCallback(
    async (convId: string) => {
      try {
        await gateway.deleteConversation(convId);
        setLoadError(null);
        await loadConversation();
      } catch (error) {
        setLoadError(normalizeError(error));
      }
    },
    [gateway, loadConversation]
  );

  const handleConversationChange = useCallback(
    (convId: string) => {
      setActiveConversationId(convId);
      void loadConversation(convId);
    },
    [loadConversation]
  );

  // 세션 가드 UI
  if (sessionState === "loading") {
    return (
      <div className="p-6">
        <Skeleton className="h-6 w-32" />
      </div>
    );
  }

  if (sessionState === "unauthenticated") {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        ログインしてください。{" "}
        <a className="text-primary underline" href="/entitle/auth">
          Auth
        </a>
      </div>
    );
  }

  if (sessionState === "unauthorized") {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        新入社員のみ利用できます。現在のロール: {session?.role}
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
      bootstrap={bootstrap as StudentChatBootstrap & { conversation: Conversation }}
      router={router}
      conversationOptions={conversationOptions}
      mentorOptions={mentorOptions}
      selectedConversationId={selectedConversationId}
      onSelectConversation={handleConversationChange}
      onCreateConversation={createConversation}
      onDeleteConversation={deleteConversation}
      gateway={gateway}
      llmGateway={llmGateway}
    />
  );
};

export default StudentChatPage;
