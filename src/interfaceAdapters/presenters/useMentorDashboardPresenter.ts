import { useCallback, useMemo } from "react";

import type { UseCaseFailure } from "../../application/entitle/models";
import type { StudentSummary } from "../../application/entitle/ports";
import type {
  MentorDashboardController,
  MentorDashboardControllerEffect,
} from "../controllers/useMentorDashboardController";
import type { MentorDashboardStudentItem } from "../../views/MentorDashboardView";

const deriveStatus = (summary: StudentSummary): MentorDashboardStudentItem["status"] => {
  const last = new Date(summary.lastActivityAt).getTime();
  const diffMinutes = (Date.now() - last) / 60000;
  if (!Number.isFinite(diffMinutes) || diffMinutes < 0) {
    return "active";
  }
  if (diffMinutes < 5) {
    return "active";
  }
  if (diffMinutes < 60) {
    return "idle";
  }
  return "offline";
};

export interface MentorDashboardPresenterViewModel {
  students: MentorDashboardStudentItem[];
  searchQuery: string;
  onChangeSearch: (value: string) => void;
}

export interface MentorDashboardPresenterStatus {
  isLoading: boolean;
  error: UseCaseFailure | null;
}

export interface MentorDashboardPresenterInteractions {
  requestRefresh: () => void;
  acknowledgeEffect: (effectId: string) => void;
  clearError: () => void;
  selectStudent: (studentId: string | null) => void;
}

export interface MentorDashboardPresenterMeta {
  qualitySubmitting: Record<string, boolean>;
  selectedStudentId: string | null | undefined;
}

export interface MentorDashboardPresenterOutput {
  viewModel: MentorDashboardPresenterViewModel;
  pendingEffects: MentorDashboardControllerEffect[];
  status: MentorDashboardPresenterStatus;
  meta: MentorDashboardPresenterMeta;
  interactions: MentorDashboardPresenterInteractions;
}

export const useMentorDashboardPresenter = (
  controller: MentorDashboardController
): MentorDashboardPresenterOutput => {
  const { state, actions } = controller;

  const filteredSummaries = useMemo(() => {
    const query = state.searchQuery.trim().toLowerCase();
    if (!query) {
      return state.summaries;
    }
    return state.summaries.filter((summary) => {
      const studentName = summary.newhire.displayName.toLowerCase();
      const subject = summary.conversation.title.toLowerCase();
      return studentName.includes(query) || subject.includes(query);
    });
  }, [state.searchQuery, state.summaries]);

  const students = useMemo<MentorDashboardStudentItem[]>(() => {
    return filteredSummaries.map((summary) => {
      const { newhire, conversation, recentMessage, needsReview, totalChats, lastActivityAt } = summary;
      const studentMessage = recentMessage?.role === "NEW_HIRE" ? recentMessage.content : "";
      const assistantMessage = recentMessage?.role === "ASSISTANT" ? recentMessage.content : "";
      return {
        id: newhire.userId,
        name: newhire.displayName,
        avatar: undefined,
        lastActivity: new Date(lastActivityAt),
        status: deriveStatus(summary),
        conversationId: conversation.convId,
        recentChat: {
          summary: studentMessage,
          aiResponse: assistantMessage,
          subject: conversation.title,
          timestamp: new Date(lastActivityAt),
          needsReview,
        },
        totalChats,
      };
    });
  }, [filteredSummaries]);

  const handleChangeSearch = useCallback(
    (value: string) => {
      actions.setSearchQuery(value);
    },
    [actions]
  );

  const handleFeedback = useCallback(
    (_studentId: string, _isGood: boolean) => {
      // feedback quality not implemented
    },
    []
  );

  const viewModel = useMemo<MentorDashboardPresenterViewModel>(
    () => ({
      students,
      searchQuery: state.searchQuery,
      onChangeSearch: handleChangeSearch,
    }),
    [handleChangeSearch, state.searchQuery, students]
  );

  const status: MentorDashboardPresenterStatus = useMemo(
    () => ({
      isLoading: state.isRefreshing,
      error: state.error,
    }),
    [state.error, state.isRefreshing]
  );

  const meta = useMemo<MentorDashboardPresenterMeta>(
    () => ({
      qualitySubmitting: state.qualitySubmitting,
      selectedStudentId: state.selectedStudentId,
    }),
    [state.qualitySubmitting, state.selectedStudentId]
  );

  const interactions: MentorDashboardPresenterInteractions = useMemo(
    () => ({
      requestRefresh: actions.requestRefresh,
      acknowledgeEffect: actions.acknowledgeEffect,
      clearError: actions.clearError,
      selectStudent: actions.selectStudent,
    }),
    [actions.acknowledgeEffect, actions.clearError, actions.requestRefresh, actions.selectStudent]
  );

  return {
    viewModel,
    pendingEffects: state.pendingEffects,
    status,
    meta,
    interactions,
  };
};
