/**
 * Profile Presenter V2
 *
 * 新アーキテクチャ：React Hook（React依存層）
 * - Factory経由でServiceを生成
 * - React状態管理
 * - ViewModelをViewに提供
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";

import type { MbtiType } from "../../domain/mbti.types";
import type { UseCaseFailure } from "../../application/entitle/models";
import { createProfileService } from "../../application/entitle/factories/ProfileFactory";
import type { ProfileViewModel } from "../services/ProfileService";

// ============================================
// 状態型定義
// ============================================

interface PresenterState {
  currentMbti: MbtiType | null;
  selectedMbti: MbtiType | null;
  isLoading: boolean;
  isSaving: boolean;
  error: UseCaseFailure | null;
}

// ============================================
// Props型定義
// ============================================

interface UseProfilePresenterProps {
  accessToken?: string;
  userId?: string;
}

// ============================================
// Output型定義
// ============================================

export interface ProfilePresenterOutput {
  // ViewModel
  viewModel: ProfileViewModel;
  // 状態
  isLoading: boolean;
  isSaving: boolean;
  error: UseCaseFailure | null;
  // アクション
  actions: {
    // MBTI選択
    setSelectedMbti: (mbti: MbtiType | null) => void;
    // MBTI保存
    saveMbti: () => Promise<void>;
    // リフレッシュ
    refresh: () => Promise<void>;
    // エラークリア
    clearError: () => void;
    // キャンセル（選択をリセット）
    cancel: () => void;
  };
}

// ============================================
// 初期状態
// ============================================

const initialState: PresenterState = {
  currentMbti: null,
  selectedMbti: null,
  isLoading: true,
  isSaving: false,
  error: null,
};

// ============================================
// Presenter Hook
// ============================================

export function useProfilePresenter(
  props: UseProfilePresenterProps
): ProfilePresenterOutput {
  const { accessToken, userId } = props;

  // Service生成（Factory使用）
  const service = useMemo(
    () => createProfileService({ accessToken }),
    [accessToken]
  );

  // 状態
  const [state, setState] = useState<PresenterState>(initialState);
  const hasLoadedInitial = useRef(false);

  // ============================================
  // データロード
  // ============================================

  const loadMbti = useCallback(async () => {
    if (!userId) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: { kind: "ValidationError", message: "ログインしてください。" },
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const result = await service.fetchMbti(userId);

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
      currentMbti: result.value,
      selectedMbti: result.value,
      isLoading: false,
      error: null,
    }));
  }, [userId, service]);

  // 初回ロード
  useEffect(() => {
    if (hasLoadedInitial.current) return;
    if (!userId) return;

    hasLoadedInitial.current = true;
    void loadMbti();
  }, [userId, loadMbti]);

  // ============================================
  // アクション
  // ============================================

  const setSelectedMbti = useCallback((mbti: MbtiType | null) => {
    setState((prev) => ({ ...prev, selectedMbti: mbti }));
  }, []);

  const saveMbti = useCallback(async () => {
    if (!userId || !state.selectedMbti) {
      setState((prev) => ({
        ...prev,
        error: {
          kind: "ValidationError",
          message: "MBTIを選択してください。",
        },
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isSaving: true,
      error: null,
    }));

    const result = await service.updateMbti(userId, state.selectedMbti);

    if (result.kind === "failure") {
      setState((prev) => ({
        ...prev,
        isSaving: false,
        error: result.error,
      }));
      return;
    }

    // 成功時：現在のMBTIを更新
    setState((prev) => ({
      ...prev,
      currentMbti: prev.selectedMbti,
      isSaving: false,
    }));
  }, [userId, state.selectedMbti, service]);

  const refresh = useCallback(async () => {
    await loadMbti();
  }, [loadMbti]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const cancel = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedMbti: prev.currentMbti,
    }));
  }, []);

  // ============================================
  // ViewModel生成
  // ============================================

  const viewModel = useMemo(() => {
    return service.toViewModel(state.currentMbti, state.selectedMbti);
  }, [service, state.currentMbti, state.selectedMbti]);

  // ============================================
  // 返却
  // ============================================

  return {
    viewModel,
    isLoading: state.isLoading,
    isSaving: state.isSaving,
    error: state.error,
    actions: {
      setSelectedMbti,
      saveMbti,
      refresh,
      clearError,
      cancel,
    },
  };
}
