"use client";

import { useEffect, useMemo, useRef } from "react";

import MentorDashboardView from "../../src/views/MentorDashboardView";
import { useMentorDashboardController } from "../../src/interfaceAdapters/controllers/useMentorDashboardController";
import { useMentorDashboardPresenter } from "../../src/interfaceAdapters/presenters/useMentorDashboardPresenter";
import type { MentorDashboardControllerEffect } from "../../src/interfaceAdapters/controllers/useMentorDashboardController";
import type { UseCaseFailure } from "../../src/application/entitle/models";
import { createDevEntitleAdapters } from "./devAdapters";

const normalizeError = (reason: unknown): UseCaseFailure => ({
  kind: "ValidationError",
  message: reason instanceof Error ? reason.message : String(reason),
});

const MentorDashboardPagePresenter = () => {
  const adapters = useMemo(() => createDevEntitleAdapters(), []);
  const controller = useMentorDashboardController({ mentorId: adapters.mentor.userId });
  const presenter = useMentorDashboardPresenter(controller);

  const processingRef = useRef(false);

  useEffect(() => {
    if (processingRef.current) {
      return;
    }
    const effect = presenter.pendingEffects[0];
    if (!effect) {
      return;
    }

    processingRef.current = true;

    const processEffect = async (nextEffect: MentorDashboardControllerEffect) => {
      try {
        switch (nextEffect.kind) {
          case "REQUEST_REFRESH_SUMMARIES": {
            const summaries = await adapters.dashboardPort.listStudentSummaries({
              mentorId: nextEffect.payload.mentorId,
            });
            controller.actions.applySummaries(summaries);
            controller.actions.finalizeRefresh();
            break;
          }
          case "REQUEST_SUBMIT_FEEDBACK_QUALITY": {
            await adapters.dashboardPort.submitFeedbackQuality(nextEffect.payload);
            controller.actions.finalizeSubmitFeedbackQuality(nextEffect.payload.studentId);
            break;
          }
          default:
            break;
        }
      } catch (error) {
        controller.actions.reportExternalFailure(normalizeError(error));
      } finally {
        controller.actions.acknowledgeEffect(nextEffect.id);
        processingRef.current = false;
      }
    };

    void processEffect(effect);
  }, [adapters, controller.actions, presenter.pendingEffects]);

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

