/**
 * StudentDashboard Presenter V2
 *
 * 新アーキテクチャ：React Hook（React依存層）
 * - Factory経由でServiceを生成
 * - React状態管理
 * - ViewModelをViewに提供
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";

import type { User } from "../../domain/core";
import type { UseCaseFailure } from "../../application/entitle/models";
import type { ConversationListItem } from "../../application/entitle/ports/StudentDashboardPort";
import { createStudentDashboardService } from "../../application/entitle/factories/StudentDashboardFactory";
import type {
  StudentDashboardViewModel,
  ConversationViewModel,
} from "../services/StudentDashboardService";

// ============================================
// 状態型定義
// ============================================

interface PresenterState {
  conversations: ConversationListItem[];
  searchQuery: string;
  newTitle: string;
  isLoading: boolean;
  isCreating: boolean;
  error: UseCaseFailure | null;
  // 削除状態
  isDeleting: Record<string, boolean>;
}

// ============================================
// Props型定義
// ============================================

interface UseStudentDashboardPresenterProps {
  accessToken?: string;
  userId?: string;
  role?: User["role"];
}

// ============================================
// Output型定義
// ============================================

export interface StudentDashboardPresenterOutput {
  // ViewModel
  viewModel: StudentDashboardViewModel;
  // 状態
  isLoading: boolean;
  isCreating: boolean;
  error: UseCaseFailure | null;
  searchQuery: string;
  newTitle: string;
  isDeleting: Record<string, boolean>;
  // アクション
  actions: {
    // 検索
    setSearchQuery: (value: string) => void;
    // タイトル入力
    setNewTitle: (value: string) => void;
    // リフレッシュ
    refresh: () => Promise<void>;
    // 会話作成
    createConversation: (title: string) => Promise<void>;
    // 会話削除
    deleteConversation: (convId: string) => Promise<void>;
    // エラー
    clearError: () => void;
  };
}

// ============================================
// 初期状態
// ============================================

const initialState: PresenterState = {
  conversations: [],
  searchQuery: "",
  newTitle: "",
  isLoading: true,
  isCreating: false,
  error: null,
  isDeleting: {},
};

// ============================================
// Presenter Hook
// ============================================

export function useStudentDashboardPresenter(
  props: UseStudentDashboardPresenterProps
): StudentDashboardPresenterOutput {
  const { accessToken, userId, role } = props;

  // Service生成（Factory使用）
  const service = useMemo(
    () => createStudentDashboardService({ accessToken }),
    [accessToken]
  );

  // 状態
  const [state, setState] = useState<PresenterState>(initialState);
  const hasLoadedInitial = useRef(false);

  // 学生ID検証
  const studentId = useMemo(() => {
    if (!userId || role !== "NEW_HIRE") return null;
    return userId;
  }, [userId, role]);

  // ============================================
  // データロード
  // ============================================

  const loadConversations = useCallback(async () => {
    if (!studentId) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: { kind: "ValidationError", message: "学生ログインが必要です。" },
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const result = await service.fetchConversations();

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
      conversations: result.value,
      isLoading: false,
      error: null,
    }));
  }, [studentId, service]);

  // 初回ロード
  useEffect(() => {
    if (hasLoadedInitial.current) return;
    if (!studentId) return;

    hasLoadedInitial.current = true;
    void loadConversations();
  }, [studentId, loadConversations]);

  // ============================================
  // アクション
  // ============================================

  const setSearchQuery = useCallback((value: string) => {
    setState((prev) => ({ ...prev, searchQuery: value }));
  }, []);

  const setNewTitle = useCallback((value: string) => {
    setState((prev) => ({ ...prev, newTitle: value }));
  }, []);

  const refresh = useCallback(async () => {
    await loadConversations();
  }, [loadConversations]);

  const createConversation = useCallback(
    async (title: string) => {
      if (!studentId) {
        setState((prev) => ({
          ...prev,
          error: { kind: "ValidationError", message: "ログインしてください。" },
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        isCreating: true,
        error: null,
      }));

      const result = await service.createConversation(title);

      if (result.kind === "failure") {
        setState((prev) => ({
          ...prev,
          isCreating: false,
          error: result.error,
        }));
        return;
      }

      // 成功時：タイトルリセット、データ再取得
      setState((prev) => ({
        ...prev,
        newTitle: "",
        isCreating: false,
      }));

      // リフレッシュ
      await loadConversations();
    },
    [studentId, service, loadConversations]
  );

  const deleteConversation = useCallback(
    async (convId: string) => {
      if (!studentId) return;

      setState((prev) => ({
        ...prev,
        isDeleting: { ...prev.isDeleting, [convId]: true },
      }));

      const result = await service.deleteConversation(convId);

      if (result.kind === "failure") {
        setState((prev) => {
          const nextDeleting = { ...prev.isDeleting };
          delete nextDeleting[convId];
          return {
            ...prev,
            isDeleting: nextDeleting,
            error: result.error,
          };
        });
        return;
      }

      // 成功時：削除フラグクリア、データ再取得
      setState((prev) => {
        const nextDeleting = { ...prev.isDeleting };
        delete nextDeleting[convId];
        return {
          ...prev,
          isDeleting: nextDeleting,
        };
      });

      // リフレッシュ
      await loadConversations();
    },
    [studentId, service, loadConversations]
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // ============================================
  // ViewModel生成
  // ============================================

  const viewModel = useMemo(() => {
    return service.toViewModel(state.conversations, state.searchQuery);
  }, [service, state.conversations, state.searchQuery]);

  // ============================================
  // 返却
  // ============================================

  return {
    viewModel,
    isLoading: state.isLoading,
    isCreating: state.isCreating,
    error: state.error,
    searchQuery: state.searchQuery,
    newTitle: state.newTitle,
    isDeleting: state.isDeleting,
    actions: {
      setSearchQuery,
      setNewTitle,
      refresh,
      createConversation,
      deleteConversation,
      clearError,
    },
  };
}
