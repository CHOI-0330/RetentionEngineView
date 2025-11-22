"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import MentorDashboardView from "../../../views/MentorDashboardView";
import { useMentorDashboardController } from "../../controllers/useMentorDashboardController";
import { useMentorDashboardPresenter } from "../../presenters/useMentorDashboardPresenter";
import type { MentorDashboardControllerEffect } from "../../controllers/useMentorDashboardController";
import type { UseCaseFailure } from "../../../application/entitle/models";
import type { StudentSummary } from "../../../application/entitle/ports";
import { useSession } from "../../../components/SessionProvider";
import { apiFetch } from "../../../lib/apiClient";

const normalizeError = (reason: unknown): UseCaseFailure => ({
  kind: "ValidationError",
  message: reason instanceof Error ? reason.message : String(reason),
});

type MentorDashboardAction = "listStudentSummaries" | "submitFeedbackQuality";

const MentorDashboardPage = () => {
  const controller = useMentorDashboardController();
  const presenter = useMentorDashboardPresenter(controller);

  const processingRef = useRef(false);
  const router = useRouter();
  const { session, isLoading: isSessionLoading } = useSession();

  const processEffectBackend = useCallback(
    async (effect: MentorDashboardControllerEffect) => {
      if (!session) throw new Error("Login required");
      switch (effect.kind) {
        case "REQUEST_REFRESH_SUMMARIES": {
          const result = await apiFetch<{ conv_id: string; title: string; created_at: string; owner_name?: string }[]>(
            `/conversations/mentor?mentorId=${encodeURIComponent(session.userId)}`,
            undefined,
            session.accessToken
          );
          const summaries: StudentSummary[] = (result ?? []).map((c) => ({
            newhire: {
              userId: "", // 불명 → 서버 개선 시 owner_id 반환에 맞춰 수정
              role: "NEW_HIRE",
              displayName: c.owner_name ?? "新入社員",
              email: "",
              createdAt: c.created_at,
            },
            conversation: {
              convId: c.conv_id,
              ownerId: "",
              title: c.title,
              state: "ACTIVE",
              createdAt: c.created_at,
              lastActiveAt: c.created_at,
            },
            recentMessage: undefined,
            needsReview: false,
            totalChats: 1,
            lastActivityAt: c.created_at,
          }));
          controller.actions.applySummaries(summaries);
          controller.actions.finalizeRefresh();
          break;
        }
        case "REQUEST_SUBMIT_FEEDBACK_QUALITY": {
          // 아직 백엔드 엔드포인트 없음: no-op
          controller.actions.finalizeSubmitFeedbackQuality(effect.payload.studentId);
          break;
        }
        default:
          break;
      }
    },
    [controller.actions, session]
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

    void processEffectBackend(effect)
      .catch((error) => {
        controller.actions.reportExternalFailure(normalizeError(error));
        if (error instanceof Error && /Unauthorized|Forbidden/i.test(error.message)) {
          router.push("/entitle/auth");
        }
      })
      .finally(() => {
        controller.actions.acknowledgeEffect(effect.id);
        processingRef.current = false;
      });
  }, [controller.actions, presenter.pendingEffects, processEffectBackend, router]);

  useEffect(() => {
    if (!controller.state.summaries.length && !controller.state.isRefreshing) {
      controller.actions.requestRefresh();
    }
  }, [controller.actions, controller.state.isRefreshing, controller.state.summaries.length]);

  if (isSessionLoading) {
    return <div className="p-4 text-sm text-muted-foreground">ログイン情報を確認中...</div>;
  }

  if (!session) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        ログインしてください。 <a className="text-primary underline" href="/entitle/auth">Auth</a>
      </div>
    );
  }

  if (session.role !== "MENTOR") {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        メンター権限が必要です。現在のロール: {session.role}
      </div>
    );
  }

  return (
    <MentorDashboardView
      viewModel={presenter.viewModel}
      status={presenter.status}
      meta={presenter.meta}
      interactions={presenter.interactions}
    />
  );
};

export default MentorDashboardPage;
