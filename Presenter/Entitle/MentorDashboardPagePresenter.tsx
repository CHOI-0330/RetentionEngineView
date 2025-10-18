"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";

import MentorDashboardView from "../../src/views/MentorDashboardView";
import { useMentorDashboardController } from "../../src/interfaceAdapters/controllers/useMentorDashboardController";
import { useMentorDashboardPresenter } from "../../src/interfaceAdapters/presenters/useMentorDashboardPresenter";
import type { MentorDashboardControllerEffect } from "../../src/interfaceAdapters/controllers/useMentorDashboardController";
import type { UseCaseFailure } from "../../src/application/entitle/models";
import type { StudentSummary } from "../../src/application/entitle/ports";
import { createDevEntitleAdapters } from "./devAdapters";

const normalizeError = (reason: unknown): UseCaseFailure => ({
  kind: "ValidationError",
  message: reason instanceof Error ? reason.message : String(reason),
});

type MentorDashboardAction = "listStudentSummaries" | "submitFeedbackQuality";

const MentorDashboardPagePresenter = () => {
  const devAdapters = useMemo(() => createDevEntitleAdapters(), []);

  const supabaseMentorId = process.env.NEXT_PUBLIC_SUPABASE_MENTOR_ID;
  const supabaseEnabled =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    Boolean(supabaseMentorId);

  const mentorId = supabaseEnabled ? supabaseMentorId! : devAdapters.mentor.userId;

  const controller = useMentorDashboardController({ mentorId });
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
          const summaries = (await callMentorDashboardAction(
            "listStudentSummaries",
            effect.payload
          )) as StudentSummary[];
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
      switch (effect.kind) {
        case "REQUEST_REFRESH_SUMMARIES": {
          const summaries = await devAdapters.dashboardPort.listStudentSummaries(effect.payload);
          controller.actions.applySummaries(summaries);
          controller.actions.finalizeRefresh();
          break;
        }
        case "REQUEST_SUBMIT_FEEDBACK_QUALITY": {
          await devAdapters.dashboardPort.submitFeedbackQuality(effect.payload);
          controller.actions.finalizeSubmitFeedbackQuality(effect.payload.studentId);
          break;
        }
        default:
          break;
      }
    },
    [controller.actions, devAdapters.dashboardPort]
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
    if (!controller.state.summaries.length && !controller.state.isRefreshing) {
      controller.actions.requestRefresh();
    }
  }, [controller.actions, controller.state.isRefreshing, controller.state.summaries.length]);

  return (
    <MentorDashboardView
      viewModel={presenter.viewModel}
      status={presenter.status}
      meta={presenter.meta}
      interactions={presenter.interactions}
    />
  );
};

export default MentorDashboardPagePresenter;
