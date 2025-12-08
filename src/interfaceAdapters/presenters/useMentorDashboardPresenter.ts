/**
 * MentorDashboard Presenter V2
 *
 * 新アーキテクチャ：React Hook（React依存層）
 * - Factory経由でServiceを生成
 * - React状態管理
 * - ViewModelをViewに提供
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";

import type { User } from "../../domain/core";
import type { UseCaseFailure } from "../../application/entitle/models";
import type { StudentSummary } from "../../application/entitle/ports";
import type { NewhireOption } from "../gateways/api/MentorDashboardGateway";
import {
  createMentorDashboardService,
} from "../../application/entitle/factories/MentorDashboardFactory";
import type {
  MentorDashboardViewModel,
  StudentViewModel,
  SortOption,
} from "../services/MentorDashboardService";

// ============================================
// 状態型定義
// ============================================

interface PresenterState {
  summaries: StudentSummary[];
  newhireOptions: NewhireOption[];
  searchQuery: string;
  sortOption: SortOption;
  isLoading: boolean;
  isLoadingNewhires: boolean;
  error: UseCaseFailure | null;
  // 選択状態
  selectedStudentId: string | null;
  selectedNewhireId: string;
  // アサイン状態
  isAssigning: boolean;
  assignmentError: string | null;
  // フィードバック品質提出状態
  qualitySubmitting: Record<string, boolean>;
}

// ============================================
// Props型定義
// ============================================

interface UseMentorDashboardPresenterV2Props {
  accessToken?: string;
  userId?: string;
  role?: User["role"];
}

// ============================================
// Output型定義
// ============================================

export interface MentorDashboardPresenterV2Output {
  // ViewModel
  viewModel: MentorDashboardViewModel;
  // 状態
  isLoading: boolean;
  isLoadingNewhires: boolean;
  error: UseCaseFailure | null;
  searchQuery: string;
  sortOption: SortOption;
  selectedStudentId: string | null;
  selectedNewhireId: string;
  isAssigning: boolean;
  assignmentError: string | null;
  qualitySubmitting: Record<string, boolean>;
  // アクション
  actions: {
    // 検索
    setSearchQuery: (value: string) => void;
    // ソート
    setSortOption: (option: SortOption) => void;
    // 学生選択
    selectStudent: (studentId: string | null) => void;
    // 新入社員選択
    selectNewhire: (newhireId: string) => void;
    // リフレッシュ
    refresh: () => Promise<void>;
    refreshNewhires: () => Promise<void>;
    // アサイン
    createAssignment: () => Promise<void>;
    // フィードバック品質
    submitFeedbackQuality: (studentId: string, isPositive: boolean) => Promise<void>;
    // エラー
    clearError: () => void;
    clearAssignmentError: () => void;
  };
}

// ============================================
// 初期状態
// ============================================

const initialState: PresenterState = {
  summaries: [],
  newhireOptions: [],
  searchQuery: "",
  sortOption: "lastActivity",
  isLoading: true,
  isLoadingNewhires: false,
  error: null,
  selectedStudentId: null,
  selectedNewhireId: "",
  isAssigning: false,
  assignmentError: null,
  qualitySubmitting: {},
};

// ============================================
// Presenter Hook
// ============================================

export function useMentorDashboardPresenter(
  props: UseMentorDashboardPresenterV2Props
): MentorDashboardPresenterV2Output {
  const { accessToken, userId, role } = props;

  // Service生成（Factory使用）
  const service = useMemo(
    () => createMentorDashboardService({ accessToken }),
    [accessToken]
  );

  // 状態
  const [state, setState] = useState<PresenterState>(initialState);
  const hasLoadedInitial = useRef(false);

  // メンターID取得
  const mentorId = useMemo(() => {
    if (!userId || role !== "MENTOR") return null;
    return userId;
  }, [userId, role]);

  // ============================================
  // データロード
  // ============================================

  const loadSummaries = useCallback(async () => {
    if (!mentorId) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: { kind: "ValidationError", message: "メンターログインが必要です。" },
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const result = await service.fetchStudentSummaries(mentorId);

    if (result.kind === "failure") {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: result.error,
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      summaries: result.value,
      isLoading: false,
      error: null,
    }));
  }, [mentorId, service]);

  const loadNewhires = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoadingNewhires: true }));

    const result = await service.fetchAvailableNewhires();

    if (result.kind === "failure") {
      setState((prev) => ({
        ...prev,
        isLoadingNewhires: false,
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      newhireOptions: result.value,
      isLoadingNewhires: false,
    }));
  }, [service]);

  // 初回ロード
  useEffect(() => {
    if (hasLoadedInitial.current) return;
    if (!mentorId) return;

    hasLoadedInitial.current = true;
    void loadSummaries();
    void loadNewhires();
  }, [mentorId, loadSummaries, loadNewhires]);

  // ============================================
  // アクション
  // ============================================

  const setSearchQuery = useCallback((value: string) => {
    setState((prev) => ({ ...prev, searchQuery: value }));
  }, []);

  const setSortOption = useCallback((option: SortOption) => {
    setState((prev) => ({ ...prev, sortOption: option }));
  }, []);

  const selectStudent = useCallback((studentId: string | null) => {
    setState((prev) => ({ ...prev, selectedStudentId: studentId }));
  }, []);

  const selectNewhire = useCallback((newhireId: string) => {
    setState((prev) => ({ ...prev, selectedNewhireId: newhireId }));
  }, []);

  const refresh = useCallback(async () => {
    await loadSummaries();
  }, [loadSummaries]);

  const refreshNewhires = useCallback(async () => {
    await loadNewhires();
  }, [loadNewhires]);

  const createAssignment = useCallback(async () => {
    const { selectedNewhireId } = state;

    if (!mentorId) {
      setState((prev) => ({
        ...prev,
        assignmentError: "ログインしてください。",
      }));
      return;
    }

    if (!selectedNewhireId) {
      setState((prev) => ({
        ...prev,
        assignmentError: "新入社員を選択してください。",
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isAssigning: true,
      assignmentError: null,
    }));

    const result = await service.createAssignment(selectedNewhireId);

    if (result.kind === "failure") {
      setState((prev) => ({
        ...prev,
        isAssigning: false,
        assignmentError: result.error.message,
      }));
      return;
    }

    // 成功時：選択リセット、データ再取得
    setState((prev) => ({
      ...prev,
      selectedNewhireId: "",
      isAssigning: false,
      assignmentError: null,
    }));

    // リフレッシュ
    await Promise.all([loadSummaries(), loadNewhires()]);
  }, [state.selectedNewhireId, mentorId, service, loadSummaries, loadNewhires]);

  const submitFeedbackQuality = useCallback(
    async (studentId: string, isPositive: boolean) => {
      if (!mentorId) return;

      setState((prev) => ({
        ...prev,
        qualitySubmitting: { ...prev.qualitySubmitting, [studentId]: true },
      }));

      const result = await service.submitFeedbackQuality(
        mentorId,
        studentId,
        isPositive
      );

      setState((prev) => {
        const nextFlags = { ...prev.qualitySubmitting };
        delete nextFlags[studentId];
        return {
          ...prev,
          qualitySubmitting: nextFlags,
          error: result.kind === "failure" ? result.error : prev.error,
        };
      });
    },
    [mentorId, service]
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const clearAssignmentError = useCallback(() => {
    setState((prev) => ({ ...prev, assignmentError: null }));
  }, []);

  // ============================================
  // ViewModel生成
  // ============================================

  const viewModel = useMemo(() => {
    return service.toViewModel(
      state.summaries,
      state.newhireOptions,
      state.searchQuery,
      state.sortOption
    );
  }, [service, state.summaries, state.newhireOptions, state.searchQuery, state.sortOption]);

  // ============================================
  // 返却
  // ============================================

  return {
    viewModel,
    isLoading: state.isLoading,
    isLoadingNewhires: state.isLoadingNewhires,
    error: state.error,
    searchQuery: state.searchQuery,
    sortOption: state.sortOption,
    selectedStudentId: state.selectedStudentId,
    selectedNewhireId: state.selectedNewhireId,
    isAssigning: state.isAssigning,
    assignmentError: state.assignmentError,
    qualitySubmitting: state.qualitySubmitting,
    actions: {
      setSearchQuery,
      setSortOption,
      selectStudent,
      selectNewhire,
      refresh,
      refreshNewhires,
      createAssignment,
      submitFeedbackQuality,
      clearError,
      clearAssignmentError,
    },
  };
}
