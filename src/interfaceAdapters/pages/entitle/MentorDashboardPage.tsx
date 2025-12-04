"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import MentorDashboardView from "../../../views/MentorDashboardView";
import { useMentorDashboardController } from "../../controllers/useMentorDashboardController";
import { useMentorDashboardPresenter } from "../../presenters/useMentorDashboardPresenter";
import type { MentorDashboardControllerEffect } from "../../controllers/useMentorDashboardController";
import { Button } from "../../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";

// 공통 훅 & 유틸리티 사용
import { useEffectQueue, useSessionGuard, useMentorDashboardGateway } from "../../hooks";
import { normalizeError, isAuthError } from "../../utils/errors";
import type { NewhireOption } from "../../gateways/api/MentorDashboardGateway";

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
  const [selectedNewhireId, setSelectedNewhireId] = useState<string>("");
  const [newhireOptions, setNewhireOptions] = useState<NewhireOption[]>([]);
  const [isLoadingNewhires, setIsLoadingNewhires] = useState(false);
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

  // 신입사원 목록 로드
  const loadNewhires = useCallback(async () => {
    if (!session) return;
    setIsLoadingNewhires(true);
    try {
      const newhires = await gateway.listAvailableNewhires();
      setNewhireOptions(newhires);
    } catch (error) {
      console.error("Failed to load newhires:", error);
    } finally {
      setIsLoadingNewhires(false);
    }
  }, [gateway, session]);

  // 초기 데이터 로드
  useEffect(() => {
    if (hasRequestedInitial.current) return;
    if (sessionState !== "authenticated") return;

    hasRequestedInitial.current = true;
    controller.actions.requestRefresh();
    loadNewhires();
  }, [controller.actions, sessionState, loadNewhires]);

  // 멘토 할당 생성 - Gateway 사용
  const handleCreateAssignment = async () => {
    if (!session) {
      setAssignmentError("ログインしてください。");
      return;
    }
    if (!selectedNewhireId) {
      setAssignmentError("新入社員を選択してください。");
      return;
    }
    setIsAssigning(true);
    setAssignmentError(null);
    try {
      await gateway.createAssignment(selectedNewhireId);
      setSelectedNewhireId("");
      controller.actions.requestRefresh();
      // 신입사원 목록 다시 로드 (할당 상태 업데이트)
      await loadNewhires();
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

  // 미할당/할당됨 신입사원 필터링
  const availableNewhires = newhireOptions.filter((n) => !n.isAssigned);
  const assignedNewhires = newhireOptions.filter((n) => n.isAssigned);

  return (
    <div className="space-y-4">
      {/* 담당 중인 신입사원 목록 */}
      {assignedNewhires.length > 0 && (
        <div className="rounded-lg border p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold">担当中の新入社員</p>
            <p className="text-xs text-muted-foreground">
              現在あなたが担当している新入社員の一覧です。
            </p>
          </div>
          <div className="grid gap-2">
            {assignedNewhires.map((newhire) => (
              <div
                key={newhire.userId}
                className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{newhire.displayName}</span>
                  {newhire.email && (
                    <span className="text-xs text-muted-foreground">
                      {newhire.email}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  担当中
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 멘토 할당 생성 */}
      <div className="rounded-lg border p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold">メンターアサイン作成</p>
          <p className="text-xs text-muted-foreground">
            新入社員を選択して自身にアサインできます。
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            新入社員を選択
          </label>
          <Select
            value={selectedNewhireId}
            onValueChange={setSelectedNewhireId}
            disabled={isLoadingNewhires || isAssigning}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  isLoadingNewhires
                    ? "読み込み中..."
                    : availableNewhires.length === 0
                      ? "割り当て可能な新入社員がいません"
                      : "新入社員を選択してください"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {availableNewhires.map((newhire) => (
                <SelectItem key={newhire.userId} value={newhire.userId}>
                  <div className="flex flex-col">
                    <span>{newhire.displayName}</span>
                    {newhire.email && (
                      <span className="text-xs text-muted-foreground">
                        {newhire.email}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {assignmentError ? (
          <p className="text-sm text-destructive">{assignmentError}</p>
        ) : null}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleCreateAssignment}
            disabled={isAssigning || !selectedNewhireId}
            className="w-full sm:w-auto"
          >
            {isAssigning ? "作成中..." : "アサインを追加"}
          </Button>
          <Button
            variant="outline"
            onClick={loadNewhires}
            disabled={isLoadingNewhires}
            className="w-full sm:w-auto"
          >
            {isLoadingNewhires ? "更新中..." : "一覧を更新"}
          </Button>
        </div>
        {newhireOptions.length > 0 && (
          <p className="text-xs text-muted-foreground">
            全{newhireOptions.length}名中、{availableNewhires.length}名が割り当て可能
          </p>
        )}
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
