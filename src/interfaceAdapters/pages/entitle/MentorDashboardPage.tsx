"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import MentorDashboardView from "../../../views/MentorDashboardView";
import { useMentorDashboardController } from "../../controllers/useMentorDashboardController";
import { useMentorDashboardPresenter } from "../../presenters/useMentorDashboardPresenter";
import type { MentorDashboardControllerEffect } from "../../controllers/useMentorDashboardController";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";

// 공통 훅 & 유틸리티 사용
import { useEffectQueue, useSessionGuard, useMentorDashboardGateway } from "../../hooks";
import { normalizeError, isAuthError } from "../../utils/errors";

const MentorDashboardPage = () => {
  const controller = useMentorDashboardController();
  const presenter = useMentorDashboardPresenter(controller);
  const router = useRouter();

  // 세션 가드 (MENTOR 역할 필요)
  const { state: sessionState, session } = useSessionGuard({
    requiredRole: "MENTOR",
  });

  // Gateway 인스턴스 생성
  const { gateway } = useMentorDashboardGateway({
    accessToken: session?.accessToken,
  });

  const hasRequestedInitial = useRef(false);
  const [assignmentNewhireId, setAssignmentNewhireId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  // Effect 처리 함수 - Gateway를 통해 API 호출
  const processEffect = useCallback(
    async (effect: MentorDashboardControllerEffect) => {
      if (!session) throw new Error("Login required");

      switch (effect.kind) {
        case "REQUEST_REFRESH_SUMMARIES": {
          const summaries = await gateway.listStudentSummaries({
            mentorId: session.userId,
          });
          controller.actions.applySummaries(summaries);
          break;
        }
        case "REQUEST_SUBMIT_FEEDBACK_QUALITY": {
          await gateway.submitFeedbackQuality({
            mentorId: session.userId,
            studentId: effect.payload.studentId,
            isPositive: true,
          });
          controller.actions.finalizeSubmitFeedbackQuality(
            effect.payload.studentId
          );
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
      if (effect.kind === "REQUEST_REFRESH_SUMMARIES") {
        controller.actions.finalizeRefresh();
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
    controller.actions.requestRefresh();
  }, [controller.actions, sessionState]);

  // 멘토 할당 생성 - Gateway 사용
  const handleCreateAssignment = async () => {
    if (!session) {
      setAssignmentError("ログインしてください。");
      return;
    }
    const trimmed = assignmentNewhireId.trim();
    if (!trimmed) {
      setAssignmentError("新入社員IDを入力してください。");
      return;
    }
    setIsAssigning(true);
    setAssignmentError(null);
    try {
      await gateway.createAssignment(trimmed);
      setAssignmentNewhireId("");
      controller.actions.requestRefresh();
    } catch (error) {
      setAssignmentError(
        error instanceof Error
          ? error.message
          : "メンターアサインの作成に失敗しました。"
      );
    } finally {
      setIsAssigning(false);
    }
  };

  // 세션 가드 UI
  if (sessionState === "loading") {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        ログイン情報を確認中...
      </div>
    );
  }

  if (sessionState === "unauthenticated") {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        ログインしてください。{" "}
        <a className="text-primary underline" href="/">
          ログイン
        </a>
      </div>
    );
  }

  if (sessionState === "unauthorized") {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        メンター権限が必要です。現在のロール: {session?.role}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold">メンターアサイン作成</p>
          <p className="text-xs text-muted-foreground">
            新入社員IDを入力して自身にアサインできます。
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            新入社員IDを入力
          </label>
          <Input
            value={assignmentNewhireId}
            onChange={(event) => setAssignmentNewhireId(event.target.value)}
            placeholder="newhire-user-id"
          />
        </div>
        {assignmentError ? (
          <p className="text-sm text-destructive">{assignmentError}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          ユーザー一覧は表示しません。IDを直接入力してください。
        </p>
        <Button
          onClick={handleCreateAssignment}
          disabled={isAssigning}
          className="w-full sm:w-auto"
        >
          {isAssigning ? "作成中..." : "アサインを追加"}
        </Button>
      </div>

      <MentorDashboardView
        viewModel={presenter.viewModel}
        status={presenter.status}
        meta={presenter.meta}
        interactions={presenter.interactions}
      />
    </div>
  );
};

export default MentorDashboardPage;
