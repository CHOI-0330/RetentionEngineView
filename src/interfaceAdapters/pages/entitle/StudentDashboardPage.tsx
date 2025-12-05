/**
 * StudentDashboard Page
 *
 * Clean Architecture: 얇은 조합 레이어
 * - Controller, Presenter, Gateway, View를 조합
 * - 비즈니스 로직은 UseCase에 위임
 */

"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import StudentDashboardView from "../../../views/StudentDashboardView";
import { useStudentDashboardController } from "../../controllers/useStudentDashboardController";
import { useStudentDashboardPresenter } from "../../presenters/useStudentDashboardPresenter";
import type { StudentDashboardControllerEffect } from "../../controllers/useStudentDashboardController";
import { Skeleton } from "../../../components/ui/skeleton";

// 공통 훅 & 유틸리티
import { useEffectQueue, useSessionGuard, useStudentDashboardGateway } from "../../hooks";
import { normalizeError, isAuthError } from "../../utils/errors";

// UseCase
import {
  createConversationForDashboardUseCase,
  deleteConversationUseCase,
} from "../../../application/entitle/studentDashboardUseCases";

const StudentDashboardPage = () => {
  const controller = useStudentDashboardController();
  const presenter = useStudentDashboardPresenter(controller);
  const router = useRouter();

  // 세션 가드 (NEW_HIRE 역할 필요)
  const { state: sessionState, session } = useSessionGuard({
    requiredRole: "NEW_HIRE",
  });

  // Gateway 인스턴스 생성
  const { gateway } = useStudentDashboardGateway({
    accessToken: session?.accessToken,
  });

  const hasRequestedInitial = useRef(false);

  // Effect 처리 함수 - Gateway를 통해 API 호출
  const processEffect = useCallback(
    async (effect: StudentDashboardControllerEffect) => {
      if (!session) throw new Error("ログインしてください。");

      switch (effect.kind) {
        case "REQUEST_LIST_CONVERSATIONS": {
          const conversations = await gateway.listConversations();
          controller.actions.applyConversations(conversations);
          break;
        }
        case "REQUEST_CREATE_CONVERSATION": {
          // UseCase를 통한 검증
          const validationResult = createConversationForDashboardUseCase({
            requester: { userId: session.userId, role: session.role },
            title: effect.payload.title,
          });

          if (validationResult.kind === "failure") {
            controller.actions.reportExternalFailure(validationResult.error);
            controller.actions.finalizeCreateConversation();
            return;
          }

          await gateway.createConversation(validationResult.value.title);
          controller.actions.finalizeCreateConversation();
          // 목록 새로고침
          controller.actions.requestListConversations();
          break;
        }
        case "REQUEST_DELETE_CONVERSATION": {
          // UseCase를 통한 검증
          const validationResult = deleteConversationUseCase({
            requester: { userId: session.userId, role: session.role },
            convId: effect.payload.convId,
          });

          if (validationResult.kind === "failure") {
            controller.actions.reportExternalFailure(validationResult.error);
            controller.actions.finalizeDeleteConversation(effect.payload.convId);
            return;
          }

          await gateway.deleteConversation(validationResult.value.convId);
          controller.actions.finalizeDeleteConversation(effect.payload.convId);
          // 목록 새로고침
          controller.actions.requestListConversations();
          break;
        }
        default:
          break;
      }
    },
    [gateway, controller.actions, session]
  );

  // Effect 큐 처리 (공통 훅 사용)
  useEffectQueue({
    pendingEffects: presenter.pendingEffects,
    processEffect,
    onEffectComplete: (effect) => {
      controller.actions.acknowledgeEffect(effect.id);
    },
    onEffectKindComplete: (effect) => {
      if (effect.kind === "REQUEST_LIST_CONVERSATIONS") {
        controller.actions.finalizeListConversations();
      }
    },
    onError: (error) => {
      controller.actions.reportExternalFailure(normalizeError(error));
      if (isAuthError(error)) {
        router.push("/");
      }
    },
  });

  // 초기 데이터 로드
  useEffect(() => {
    if (hasRequestedInitial.current) return;
    if (sessionState !== "authenticated") return;

    hasRequestedInitial.current = true;
    controller.actions.requestListConversations();
  }, [controller.actions, sessionState]);

  // 대화 페이지로 이동
  const handleNavigateToConversation = useCallback(
    (convId: string) => {
      router.push(`/student?convId=${encodeURIComponent(convId)}`);
    },
    [router]
  );

  // 세션 가드 UI
  if (sessionState === "loading") {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (sessionState === "unauthenticated") {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg text-muted-foreground">
            ログイン情報が確認できません。
          </p>
          <a href="/" className="text-primary underline">
            ログインページへ
          </a>
        </div>
      </div>
    );
  }

  if (sessionState === "unauthorized") {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg text-muted-foreground">
            新入社員のみ利用できます。現在のロール: {session?.role}
          </p>
        </div>
      </div>
    );
  }

  // Heading 생성
  const heading = session?.displayName
    ? `Welcome back, ${session.displayName}`
    : "Welcome Back";

  return (
    <StudentDashboardView
      heading={heading}
      viewModel={presenter.viewModel}
      status={presenter.status}
      meta={presenter.meta}
      interactions={presenter.interactions}
      onNavigateToConversation={handleNavigateToConversation}
    />
  );
};

export default StudentDashboardPage;
