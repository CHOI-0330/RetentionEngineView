"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";

import MentorDashboardView from "../../../views/MentorDashboardView";
import { useMentorDashboardController } from "../../controllers/useMentorDashboardController";
import { useMentorDashboardPresenter } from "../../presenters/useMentorDashboardPresenter";
import type { MentorDashboardControllerEffect } from "../../controllers/useMentorDashboardController";
import type { UseCaseFailure } from "../../../application/entitle/models";
import type { StudentSummary } from "../../../application/entitle/ports";
import { createDevEntitleAdapters } from "../../../../src/dev/devAdapters";

const normalizeError = (reason: unknown): UseCaseFailure => ({
  kind: "ValidationError",
  message: reason instanceof Error ? reason.message : String(reason),
});

type MentorDashboardAction = "listStudentSummaries" | "submitFeedbackQuality";

const MentorDashboardPage = () => {
  const supabaseEnabled =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const sandboxEnabled = process.env.NEXT_PUBLIC_ENTITLE_SANDBOX === "1";
  const devAdapters = useMemo(() => (sandboxEnabled ? createDevEntitleAdapters() : null), [sandboxEnabled]);

  const controller = useMentorDashboardController();
  const presenter = useMentorDashboardPresenter(controller);

  const processingRef = useRef(false);
  const router = useRouter();

  const callMentorDashboardAction = useCallback(
    async (action: MentorDashboardAction, payload: unknown): Promise<unknown> => {
      const response = await fetch("/api/entitle/mentor-dashboard", {
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
    async (effect: MentorDashboardControllerEffect) => {
      switch (effect.kind) {
        case "REQUEST_REFRESH_SUMMARIES": {
          const summaries = (await callMentorDashboardAction("listStudentSummaries", {})) as StudentSummary[];
          controller.actions.applySummaries(summaries);
          controller.actions.finalizeRefresh();
          break;
        }
        case "REQUEST_SUBMIT_FEEDBACK_QUALITY": {
          await callMentorDashboardAction("submitFeedbackQuality", effect.payload);
          controller.actions.finalizeSubmitFeedbackQuality(effect.payload.studentId);
          break;
        }
        default:
          break;
      }
    },
    [callMentorDashboardAction, controller.actions]
  );

  const processEffectDev = useCallback(
    async (effect: MentorDashboardControllerEffect) => {
      if (!devAdapters) {
        throw new Error("Dev sandbox is disabled.");
      }
      switch (effect.kind) {
        case "REQUEST_REFRESH_SUMMARIES": {
          const summaries = await devAdapters.dashboardPort.listStudentSummaries({
            mentorId: devAdapters.mentor.userId,
          });
          controller.actions.applySummaries(summaries);
          controller.actions.finalizeRefresh();
          break;
        }
        case "REQUEST_SUBMIT_FEEDBACK_QUALITY": {
          await devAdapters.dashboardPort.submitFeedbackQuality({
            mentorId: devAdapters.mentor.userId,
            studentId: effect.payload.studentId,
            isPositive: effect.payload.isPositive,
          });
          controller.actions.finalizeSubmitFeedbackQuality(effect.payload.studentId);
          break;
        }
        default:
          break;
      }
    },
    [controller.actions, devAdapters]
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

    const runner = supabaseEnabled ? processEffectSupabase : sandboxEnabled ? processEffectDev : null;

    if (!runner) {
      controller.actions.reportExternalFailure({
        kind: "ValidationError",
        message: "Supabase 未設定のためデータを取得できません。開発サンドボックスを使う場合は NEXT_PUBLIC_ENTITLE_SANDBOX=1 を設定してください。",
      });
      controller.actions.acknowledgeEffect(effect.id);
      processingRef.current = false;
      return;
    }

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
  }, [
    controller.actions,
    presenter.pendingEffects,
    processEffectDev,
    processEffectSupabase,
    router,
    sandboxEnabled,
    supabaseEnabled,
  ]);

  useEffect(() => {
    if (!controller.state.summaries.length && !controller.state.isRefreshing) {
      controller.actions.requestRefresh();
    }
  }, [controller.actions, controller.state.isRefreshing, controller.state.summaries.length]);

  if (!supabaseEnabled && !sandboxEnabled) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        Supabase 環境変数が設定されていません。開発サンドボックスを利用する場合は `NEXT_PUBLIC_ENTITLE_SANDBOX=1` を指定してください。
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
