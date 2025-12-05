/**
 * StudentDashboard Presenter
 *
 * Controller의 상태를 View에서 사용할 ViewModel로 변환
 */

import { useMemo } from "react";

import type { UseCaseFailure } from "../../application/entitle/models";
import type {
  StudentDashboardController,
  StudentDashboardControllerEffect,
} from "../controllers/useStudentDashboardController";

export interface ConversationViewModel {
  id: string;
  title: string;
  createdAt: Date;
  isDeleting: boolean;
}

export interface StudentDashboardPresenterViewModel {
  conversations: ConversationViewModel[];
  newTitle: string;
  onChangeNewTitle: (value: string) => void;
}

export interface StudentDashboardPresenterStatus {
  isLoading: boolean;
  isCreating: boolean;
  error: UseCaseFailure | null;
}

export interface StudentDashboardPresenterInteractions {
  requestListConversations: () => void;
  requestCreateConversation: (title: string) => void;
  requestDeleteConversation: (convId: string) => void;
  clearError: () => void;
}

export interface StudentDashboardPresenterMeta {
  conversationCount: number;
  hasConversations: boolean;
}

export interface StudentDashboardPresenterOutput {
  viewModel: StudentDashboardPresenterViewModel;
  pendingEffects: StudentDashboardControllerEffect[];
  status: StudentDashboardPresenterStatus;
  meta: StudentDashboardPresenterMeta;
  interactions: StudentDashboardPresenterInteractions;
}

export const useStudentDashboardPresenter = (
  controller: StudentDashboardController
): StudentDashboardPresenterOutput => {
  const { state, actions } = controller;

  const conversations = useMemo<ConversationViewModel[]>(() => {
    return state.conversations.map((conv) => ({
      id: conv.convId,
      title: conv.title,
      createdAt: new Date(conv.lastActiveAt),
      isDeleting: state.isDeleting[conv.convId] ?? false,
    }));
  }, [state.conversations, state.isDeleting]);

  return {
    viewModel: {
      conversations,
      newTitle: state.newTitle,
      onChangeNewTitle: actions.setNewTitle,
    },
    pendingEffects: state.pendingEffects,
    status: {
      isLoading: state.isLoading,
      isCreating: state.isCreating,
      error: state.error,
    },
    meta: {
      conversationCount: conversations.length,
      hasConversations: conversations.length > 0,
    },
    interactions: {
      requestListConversations: actions.requestListConversations,
      requestCreateConversation: actions.requestCreateConversation,
      requestDeleteConversation: actions.requestDeleteConversation,
      clearError: actions.clearError,
    },
  };
};
