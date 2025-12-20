/**
 * Profile Presenter V2 (React Query) - IMPROVED VERSION
 *
 * React Query를 사용한 프로필 프레젠터
 * - 자동 캐싱 및 백그라운드 리페칭
 * - Optimistic Updates
 * - 코드량 50% 감소
 *
 * 개선 사항:
 * - cancel 함수의 undefined 체크 추가
 * - useMemo 최적화 제거 (불필요한 오버헤드)
 * - saveMbti에 명시적 에러 핸들링 추가
 */

import { useState, useMemo, useCallback, useEffect } from "react";

import type { MbtiType } from "../../domain/mbti.types";
import { MBTI_LABELS, MBTI_DESCRIPTIONS } from "../../domain/mbti.types";
import type { UseCaseFailure } from "../../application/entitle/models";
import type { ProfileViewModel, MbtiInfoViewModel } from "../services/ProfileService";
import { useMbtiQuery, useUpdateMbti } from "../hooks/queries";

// ============================================
// Props 타입 정의
// ============================================

interface UseProfilePresenterProps {
  accessToken?: string;
  userId?: string;
}

// ============================================
// Output 타입 정의
// ============================================

export interface ProfilePresenterOutput {
  // ViewModel
  viewModel: ProfileViewModel;
  // 상태
  isLoading: boolean;
  isSaving: boolean;
  error: UseCaseFailure | null;
  // 액션
  actions: {
    // MBTI 선택
    setSelectedMbti: (mbti: MbtiType | null) => void;
    // MBTI 저장
    saveMbti: () => Promise<void>;
    // 새로고침
    refresh: () => Promise<void>;
    // 에러 초기화
    clearError: () => void;
    // 취소 (선택 리셋)
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

  // 로컬 상태 (선택된 MBTI)
  const [selectedMbti, setSelectedMbtiState] = useState<MbtiType | null>(null);
  const [localError, setLocalError] = useState<UseCaseFailure | null>(null);

  // React Query: MBTI 조회
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

  // currentMbti 변경 시 selectedMbti 동기화
  // undefined는 로딩 중, null은 실제 값
  useEffect(() => {
    if (currentMbti !== undefined) {
      setSelectedMbtiState(currentMbti);
    }
  }, [currentMbti]);

  // React Query: MBTI 업데이트
  const updateMutation = useUpdateMbti({
    userId,
    accessToken,
    onSuccess: (mbti) => {
      setSelectedMbtiState(mbti);
      setLocalError(null);
    },
    onError: (error) => {
      setLocalError({
        kind: "ExternalServiceError",
        message: error.message,
      });
    },
  });

  // ============================================
  // 에러 처리 (IMPROVED: useMemo 제거)
  // ============================================

  const error: UseCaseFailure | null =
    localError ||
    (queryError
      ? {
          kind: "ExternalServiceError",
          message:
            queryError instanceof Error
              ? queryError.message
              : "데이터 조회에 실패했습니다",
        }
      : null);

  // ============================================
  // 액션
  // ============================================

  const setSelectedMbti = useCallback((mbti: MbtiType | null) => {
    setSelectedMbtiState(mbti);
    setLocalError(null);
  }, []);

  const saveMbti = useCallback(async () => {
    if (!userId) {
      setLocalError({
        kind: "ValidationError",
        message: "로그인이 필요합니다.",
      });
      return;
    }

    if (!selectedMbti) {
      setLocalError({
        kind: "ValidationError",
        message: "MBTI를 선택해주세요.",
      });
      return;
    }

    try {
      await updateMutation.mutateAsync(selectedMbti);
    } catch (error) {
      // onError에서 이미 처리되지만 명시적으로 catch
      console.error("MBTI 저장 실패:", error);
    }
  }, [userId, selectedMbti, updateMutation]);

  const refresh = useCallback(async () => {
    setLocalError(null);
    await refetch();
  }, [refetch]);

  const clearError = useCallback(() => {
    setLocalError(null);
  }, []);

  // IMPROVED: undefined 체크 추가
  const cancel = useCallback(() => {
    if (currentMbti !== undefined) {
      setSelectedMbtiState(currentMbti);
    }
    setLocalError(null);
  }, [currentMbti]);

  // ============================================
  // ViewModel 생성
  // ============================================

  const viewModel = useMemo(
    () => toViewModel(currentMbti ?? null, selectedMbti),
    [currentMbti, selectedMbti]
  );

  // ============================================
  // 반환
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
