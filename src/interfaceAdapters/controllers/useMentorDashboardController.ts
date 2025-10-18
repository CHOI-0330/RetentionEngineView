import { useCallback, useMemo, useRef, useState } from "react";

import type { UseCaseFailure } from "../../application/entitle/models";
import type { StudentSummary } from "../../application/entitle/ports";

export type MentorDashboardControllerEffect =
  | {
      id: string;
      kind: "REQUEST_REFRESH_SUMMARIES";
      payload: Record<string, never>;
    }
  | {
      id: string;
      kind: "REQUEST_SUBMIT_FEEDBACK_QUALITY";
      payload: { studentId: string; isPositive: boolean };
    };

export interface MentorDashboardControllerState {
  summaries: StudentSummary[];
  searchQuery: string;
  isRefreshing: boolean;
  qualitySubmitting: Record<string, boolean>;
  pendingEffects: MentorDashboardControllerEffect[];
  error: UseCaseFailure | null;
  selectedStudentId?: string | null;
}

export interface MentorDashboardControllerActions {
  setSearchQuery: (value: string) => void;
  requestRefresh: () => void;
  applySummaries: (summaries: StudentSummary[]) => void;
  finalizeRefresh: () => void;
  requestSubmitFeedbackQuality: (studentId: string, isPositive: boolean) => void;
  finalizeSubmitFeedbackQuality: (studentId: string) => void;
  acknowledgeEffect: (effectId: string) => void;
  reportExternalFailure: (error: UseCaseFailure) => void;
  clearError: () => void;
  selectStudent: (studentId: string | null) => void;
}

export interface MentorDashboardController {
  state: MentorDashboardControllerState;
  actions: MentorDashboardControllerActions;
}

const createInitialState = (): MentorDashboardControllerState => ({
  summaries: [],
  searchQuery: "",
  isRefreshing: false,
  qualitySubmitting: {},
  pendingEffects: [],
  error: null,
  selectedStudentId: null,
});

export const useMentorDashboardController = (): MentorDashboardController => {
  const [state, setState] = useState<MentorDashboardControllerState>(createInitialState);
  const effectIdRef = useRef(0);

  const setSearchQuery = useCallback((value: string) => {
    setState((previous) => ({
      ...previous,
      searchQuery: value,
    }));
  }, []);

  const requestRefresh = useCallback(() => {
    setState((previous) => {
      if (previous.isRefreshing) {
        return previous;
      }
      return {
        ...previous,
        isRefreshing: true,
        pendingEffects: [
          ...previous.pendingEffects,
          {
            id: `mentor-dashboard-effect-${effectIdRef.current++}`,
            kind: "REQUEST_REFRESH_SUMMARIES",
            payload: {},
          },
        ],
      };
    });
  }, []);

  const applySummaries = useCallback((summaries: StudentSummary[]) => {
    setState((previous) => ({
      ...previous,
      summaries,
    }));
  }, []);

  const finalizeRefresh = useCallback(() => {
    setState((previous) => ({
      ...previous,
      isRefreshing: false,
    }));
  }, []);

  const requestSubmitFeedbackQuality = useCallback(
    (studentId: string, isPositive: boolean) => {
      setState((previous) => ({
        ...previous,
        qualitySubmitting: { ...previous.qualitySubmitting, [studentId]: true },
        pendingEffects: [
          ...previous.pendingEffects,
          {
            id: `mentor-dashboard-effect-${effectIdRef.current++}`,
            kind: "REQUEST_SUBMIT_FEEDBACK_QUALITY",
            payload: { studentId, isPositive },
          },
        ],
      }));
    },
    []
  );

  const finalizeSubmitFeedbackQuality = useCallback((studentId: string) => {
    setState((previous) => {
      const nextFlags = { ...previous.qualitySubmitting };
      delete nextFlags[studentId];
      return {
        ...previous,
        qualitySubmitting: nextFlags,
      };
    });
  }, []);

  const acknowledgeEffect = useCallback((effectId: string) => {
    setState((previous) => ({
      ...previous,
      pendingEffects: previous.pendingEffects.filter((effect) => effect.id !== effectId),
    }));
  }, []);

  const reportExternalFailure = useCallback((error: UseCaseFailure) => {
    setState((previous) => ({
      ...previous,
      error,
    }));
  }, []);

  const clearError = useCallback(() => {
    setState((previous) => ({
      ...previous,
      error: null,
    }));
  }, []);

  const selectStudent = useCallback((studentId: string | null) => {
    setState((previous) => ({
      ...previous,
      selectedStudentId: studentId,
    }));
  }, []);

  const actions = useMemo<MentorDashboardControllerActions>(
    () => ({
      setSearchQuery,
      requestRefresh,
      applySummaries,
      finalizeRefresh,
      requestSubmitFeedbackQuality,
      finalizeSubmitFeedbackQuality,
      acknowledgeEffect,
      reportExternalFailure,
      clearError,
      selectStudent,
    }),
    [
      acknowledgeEffect,
      applySummaries,
      clearError,
      finalizeRefresh,
      finalizeSubmitFeedbackQuality,
      reportExternalFailure,
      requestRefresh,
      requestSubmitFeedbackQuality,
      selectStudent,
      setSearchQuery,
    ]
  );

  return { state, actions };
};
