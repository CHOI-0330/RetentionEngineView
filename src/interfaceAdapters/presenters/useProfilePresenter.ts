/**
 * Profile Presenter V2 (React Query)
 *
 * React Query를 사용한 프로필 프레젠터
 * - 자동 캐싱 및 백그라운드 리페칭
 * - Optimistic Updates
 * - 코드량 50% 감소
 */

import { useState, useMemo, useCallback, useEffect } from "react";

import type { MbtiType } from "../../domain/mbti.types";
import { MBTI_LABELS, MBTI_DESCRIPTIONS } from "../../domain/mbti.types";
import type { UseCaseFailure } from "../../application/entitle/models";
import type { ProfileViewModel, MbtiInfoViewModel } from "../services/ProfileService";
import { useMbtiQuery, useUpdateMbti } from "../hooks/queries";

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
// Helper Functions
// ============================================

function toMbtiInfoViewModel(mbti: MbtiType | null): MbtiInfoViewModel | null {
  if (!mbti) return null;
  return {
    type: mbti,
    label: MBTI_LABELS[mbti],
    description: MBTI_DESCRIPTIONS[mbti],
  };
}

function toViewModel(
  currentMbti: MbtiType | null,
  selectedMbti: MbtiType | null
): ProfileViewModel {
  const currentMbtiInfo = toMbtiInfoViewModel(currentMbti);
  const selectedMbtiInfo = toMbtiInfoViewModel(selectedMbti);
  const hasChanges = currentMbti !== selectedMbti;
  const canSave = selectedMbti !== null && hasChanges;

  return {
    currentMbti: currentMbtiInfo,
    selectedMbti: selectedMbtiInfo,
    hasChanges,
    canSave,
  };
}

// ============================================
// Presenter Hook
// ============================================

export function useProfilePresenter(
  props: UseProfilePresenterProps
): ProfilePresenterOutput {
  const { accessToken, userId } = props;

  // ローカル状態（選択中のMBTI）
  const [selectedMbti, setSelectedMbtiState] = useState<MbtiType | null>(null);
  const [localError, setLocalError] = useState<UseCaseFailure | null>(null);

  // React Query: MBTI取得
  const {
    data: currentMbti,
    isLoading,
    error: queryError,
    refetch,
  } = useMbtiQuery({
    userId,
    accessToken,
    enabled: !!userId && !!accessToken,
  });

  // currentMbti 변경 시 selectedMbti 동기화 (useEffect로 이동)
  useEffect(() => {
    if (currentMbti !== undefined) {
      setSelectedMbtiState(currentMbti);
    }
  }, [currentMbti]);

  // React Query: MBTI更新
  const updateMutation = useUpdateMbti({
    userId,
    accessToken,
    onSuccess: (mbti) => {
      setSelectedMbtiState(mbti);
      setLocalError(null);
    },
    onError: (error) => {
      // P1: 에러 시 selectedMbti도 롤백
      setSelectedMbtiState(currentMbti ?? null);
      setLocalError({
        kind: "ExternalServiceError",
        message: error.message,
      });
    },
  });

  // ============================================
  // エラー処理
  // ============================================

  const error = useMemo((): UseCaseFailure | null => {
    if (localError) return localError;
    if (queryError) {
      return {
        kind: "ExternalServiceError",
        message: queryError instanceof Error ? queryError.message : "データの取得に失敗しました",
      };
    }
    return null;
  }, [localError, queryError]);

  // ============================================
  // アクション
  // ============================================

  const setSelectedMbti = useCallback((mbti: MbtiType | null) => {
    setSelectedMbtiState(mbti);
    setLocalError(null);
  }, []);

  const saveMbti = useCallback(async () => {
    // P0: 저장 중이면 중복 요청 방지
    if (updateMutation.isPending) return;

    if (!userId) {
      setLocalError({
        kind: "ValidationError",
        message: "ログインしてください。",
      });
      return;
    }

    if (!selectedMbti) {
      setLocalError({
        kind: "ValidationError",
        message: "MBTIを選択してください。",
      });
      return;
    }

    await updateMutation.mutateAsync(selectedMbti);
  }, [userId, selectedMbti, updateMutation]);

  const refresh = useCallback(async () => {
    setLocalError(null);
    await refetch();
  }, [refetch]);

  const clearError = useCallback(() => {
    setLocalError(null);
  }, []);

  const cancel = useCallback(() => {
    setSelectedMbtiState(currentMbti ?? null);
    setLocalError(null);
  }, [currentMbti]);

  // ============================================
  // ViewModel生成
  // ============================================

  const viewModel = useMemo(
    () => toViewModel(currentMbti ?? null, selectedMbti),
    [currentMbti, selectedMbti]
  );

  // ============================================
  // 返却
  // ============================================

  return {
    viewModel,
    isLoading,
    isSaving: updateMutation.isPending,
    error,
    actions: {
      setSelectedMbti,
      saveMbti,
      refresh,
      clearError,
      cancel,
    },
  };
}
