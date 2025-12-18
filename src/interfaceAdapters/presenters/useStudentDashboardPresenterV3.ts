/**
 * StudentDashboard Presenter V3
 *
 * React Query를 사용한 새 아키텍처
 * - 캐싱 및 백그라운드 리페칭 자동화
 * - Optimistic Updates로 즉각적인 UI 반응
 * - 코드량 50% 감소
 */

import { useState, useMemo, useCallback } from "react";

import type { User } from "../../domain/core";
import type { UseCaseFailure } from "../../application/entitle/models";
import { createStudentDashboardService } from "../../application/entitle/factories/StudentDashboardFactory";
import type {
  StudentDashboardViewModel,
} from "../services/StudentDashboardService";
import {
  useConversationsQuery,
  useCreateConversation,
  useDeleteConversation,
} from "../hooks/queries";

// ============================================
// Props型定義
// ============================================

interface UseStudentDashboardPresenterV3Props {
  accessToken?: string;
  userId?: string;
  role?: User["role"];
}

// ============================================
// Output型定義 (V2와 호환)
// ============================================

export interface StudentDashboardPresenterV3Output {
  viewModel: StudentDashboardViewModel;
  isLoading: boolean;
  isCreating: boolean;
  error: UseCaseFailure | null;
  searchQuery: string;
  newTitle: string;
  isDeleting: Record<string, boolean>;
  actions: {
    setSearchQuery: (value: string) => void;
    setNewTitle: (value: string) => void;
    refresh: () => Promise<void>;
    createConversation: (title: string) => Promise<void>;
    deleteConversation: (convId: string) => Promise<void>;
    clearError: () => void;
  };
}

// ============================================
// Presenter Hook (React Query 버전)
// ============================================

export function useStudentDashboardPresenterV3(
  props: UseStudentDashboardPresenterV3Props
): StudentDashboardPresenterV3Output {
  const { accessToken, userId, role } = props;

  // 학生ID検証
  const isValidStudent = useMemo(() => {
    return !!userId && role === "NEW_HIRE";
  }, [userId, role]);

  // Service (ViewModel 생성용)
  const service = useMemo(
    () => createStudentDashboardService({ accessToken }),
    [accessToken]
  );

  // ============================================
  // React Query Hooks
  // ============================================

  const conversationsQuery = useConversationsQuery({
    accessToken,
    enabled: isValidStudent,
  });

  const createMutation = useCreateConversation({
    accessToken,
  });

  const deleteMutation = useDeleteConversation({
    accessToken,
  });

  // ============================================
  // 로컬 UI 상태
  // ============================================

  const [searchQuery, setSearchQuery] = useState("");
  const [newTitle, setNewTitle] = useState("");

  // ============================================
  // 에러 처리 (React Query 에러 → UseCaseFailure 변환)
  // ============================================

  const error = useMemo((): UseCaseFailure | null => {
    const queryError = conversationsQuery.error;
    const createError = createMutation.error;
    const deleteError = deleteMutation.error;

    const errorMessage = queryError?.message || createError?.message || deleteError?.message;

    if (!errorMessage) return null;

    return {
      kind: "ExternalServiceError",
      message: errorMessage,
    };
  }, [conversationsQuery.error, createMutation.error, deleteMutation.error]);

  // ============================================
  // ViewModel 생성
  // ============================================

  const viewModel = useMemo(() => {
    const conversations = conversationsQuery.data ?? [];
    return service.toViewModel(conversations, searchQuery);
  }, [service, conversationsQuery.data, searchQuery]);

  // ============================================
  // isDeleting 상태 (삭제 중인 항목 추적)
  // ============================================

  const isDeleting = useMemo((): Record<string, boolean> => {
    if (!deleteMutation.isPending || !deleteMutation.variables) {
      return {};
    }
    return { [deleteMutation.variables]: true };
  }, [deleteMutation.isPending, deleteMutation.variables]);

  // ============================================
  // Actions
  // ============================================

  const refresh = useCallback(async () => {
    await conversationsQuery.refetch();
  }, [conversationsQuery]);

  const createConversation = useCallback(
    async (title: string) => {
      await createMutation.mutateAsync(title);
      setNewTitle(""); // 성공 시 입력 초기화
    },
    [createMutation]
  );

  const deleteConversation = useCallback(
    async (convId: string) => {
      await deleteMutation.mutateAsync(convId);
    },
    [deleteMutation]
  );

  const clearError = useCallback(() => {
    // React Query는 자동으로 에러를 관리하므로
    // 쿼리를 다시 실행하면 에러가 초기화됨
    conversationsQuery.refetch();
  }, [conversationsQuery]);

  // ============================================
  // Actions 메모이제이션
  // ============================================

  const actions = useMemo(
    () => ({
      setSearchQuery,
      setNewTitle,
      refresh,
      createConversation,
      deleteConversation,
      clearError,
    }),
    [refresh, createConversation, deleteConversation, clearError]
  );

  // ============================================
  // 返却 (V2와 동일한 인터페이스)
  // ============================================

  return {
    viewModel,
    isLoading: conversationsQuery.isLoading,
    isCreating: createMutation.isPending,
    error,
    searchQuery,
    newTitle,
    isDeleting,
    actions,
  };
}
