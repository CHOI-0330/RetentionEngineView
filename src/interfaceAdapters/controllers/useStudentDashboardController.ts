/**
 * StudentDashboard Controller
 *
 * Dashboard의 상태 관리 및 Effect 큐 처리
 */

import { useCallback, useMemo, useRef, useState } from "react";

import type { UseCaseFailure } from "../../application/entitle/models";
import type { ConversationListItem } from "../gateways/api/StudentDashboardGateway";

export type StudentDashboardControllerEffect =
  | {
      id: string;
      kind: "REQUEST_LIST_CONVERSATIONS";
      payload: Record<string, never>;
    }
  | {
      id: string;
      kind: "REQUEST_CREATE_CONVERSATION";
      payload: { title: string };
    }
  | {
      id: string;
      kind: "REQUEST_DELETE_CONVERSATION";
      payload: { convId: string };
    };

export interface StudentDashboardControllerState {
  conversations: ConversationListItem[];
  newTitle: string;
  isLoading: boolean;
  isCreating: boolean;
  isDeleting: Record<string, boolean>;
  pendingEffects: StudentDashboardControllerEffect[];
  error: UseCaseFailure | null;
}

export interface StudentDashboardControllerActions {
  setNewTitle: (value: string) => void;
  requestListConversations: () => void;
  applyConversations: (conversations: ConversationListItem[]) => void;
  finalizeListConversations: () => void;
  requestCreateConversation: (title: string) => void;
  finalizeCreateConversation: () => void;
  requestDeleteConversation: (convId: string) => void;
  finalizeDeleteConversation: (convId: string) => void;
  acknowledgeEffect: (effectId: string) => void;
  reportExternalFailure: (error: UseCaseFailure) => void;
  clearError: () => void;
}

export interface StudentDashboardController {
  state: StudentDashboardControllerState;
  actions: StudentDashboardControllerActions;
}

const createInitialState = (): StudentDashboardControllerState => ({
  conversations: [],
  newTitle: "",
  isLoading: false,
  isCreating: false,
  isDeleting: {},
  pendingEffects: [],
  error: null,
});

export const useStudentDashboardController = (): StudentDashboardController => {
  const [state, setState] = useState<StudentDashboardControllerState>(createInitialState);
  const effectIdRef = useRef(0);

  const setNewTitle = useCallback((value: string) => {
    setState((previous) => ({
      ...previous,
      newTitle: value,
    }));
  }, []);

  const requestListConversations = useCallback(() => {
    setState((previous) => {
      if (previous.isLoading) {
        return previous;
      }
      return {
        ...previous,
        isLoading: true,
        pendingEffects: [
          ...previous.pendingEffects,
          {
            id: `student-dashboard-effect-${effectIdRef.current++}`,
            kind: "REQUEST_LIST_CONVERSATIONS" as const,
            payload: {},
          },
        ],
      };
    });
  }, []);

  const applyConversations = useCallback((conversations: ConversationListItem[]) => {
    setState((previous) => ({
      ...previous,
      conversations,
    }));
  }, []);

  const finalizeListConversations = useCallback(() => {
    setState((previous) => ({
      ...previous,
      isLoading: false,
    }));
  }, []);

  const requestCreateConversation = useCallback((title: string) => {
    setState((previous) => {
      if (previous.isCreating) {
        return previous;
      }
      return {
        ...previous,
        isCreating: true,
        pendingEffects: [
          ...previous.pendingEffects,
          {
            id: `student-dashboard-effect-${effectIdRef.current++}`,
            kind: "REQUEST_CREATE_CONVERSATION" as const,
            payload: { title },
          },
        ],
      };
    });
  }, []);

  const finalizeCreateConversation = useCallback(() => {
    setState((previous) => ({
      ...previous,
      isCreating: false,
      newTitle: "",
    }));
  }, []);

  const requestDeleteConversation = useCallback((convId: string) => {
    setState((previous) => {
      if (previous.isDeleting[convId]) {
        return previous;
      }
      return {
        ...previous,
        isDeleting: { ...previous.isDeleting, [convId]: true },
        pendingEffects: [
          ...previous.pendingEffects,
          {
            id: `student-dashboard-effect-${effectIdRef.current++}`,
            kind: "REQUEST_DELETE_CONVERSATION" as const,
            payload: { convId },
          },
        ],
      };
    });
  }, []);

  const finalizeDeleteConversation = useCallback((convId: string) => {
    setState((previous) => {
      const nextDeleting = { ...previous.isDeleting };
      delete nextDeleting[convId];
      return {
        ...previous,
        isDeleting: nextDeleting,
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

  const actions = useMemo<StudentDashboardControllerActions>(
    () => ({
      setNewTitle,
      requestListConversations,
      applyConversations,
      finalizeListConversations,
      requestCreateConversation,
      finalizeCreateConversation,
      requestDeleteConversation,
      finalizeDeleteConversation,
      acknowledgeEffect,
      reportExternalFailure,
      clearError,
    }),
    [
      setNewTitle,
      requestListConversations,
      applyConversations,
      finalizeListConversations,
      requestCreateConversation,
      finalizeCreateConversation,
      requestDeleteConversation,
      finalizeDeleteConversation,
      acknowledgeEffect,
      reportExternalFailure,
      clearError,
    ]
  );

  return { state, actions };
};
