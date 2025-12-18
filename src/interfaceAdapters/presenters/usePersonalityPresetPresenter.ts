/**
 * Personality Preset Presenter
 *
 * React Hook（React依存層）
 * AI性格プリセット選択機能のViewModelとアクションを提供
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";

import type { PersonalityPreset } from "../../domain/core";
import {
  PersonalityPresetService,
  type PersonalityPresetViewModel,
} from "../services/PersonalityPresetService";

// ============================================
// 状態型定義
// ============================================

interface PresenterState {
  presets: PersonalityPreset[];
  currentPresetId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

// ============================================
// Props型定義
// ============================================

interface UsePersonalityPresetPresenterProps {
  accessToken?: string;
}

// ============================================
// Output型定義
// ============================================

export interface PersonalityPresetPresenterOutput {
  // ViewModel
  viewModel: PersonalityPresetViewModel;
  // 状態
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  // アクション
  actions: {
    selectPreset: (presetId: string) => Promise<void>;
    resetToDefault: () => Promise<void>;
    refresh: () => Promise<void>;
    clearError: () => void;
  };
}

// ============================================
// 初期状態
// ============================================

const initialState: PresenterState = {
  presets: [],
  currentPresetId: null,
  isLoading: true,
  isSaving: false,
  error: null,
};

// ============================================
// Presenter Hook
// ============================================

export function usePersonalityPresetPresenter(
  props: UsePersonalityPresetPresenterProps = {}
): PersonalityPresetPresenterOutput {
  const { accessToken } = props;

  // Service生成
  const service = useMemo(
    () => new PersonalityPresetService({ accessToken }),
    [accessToken]
  );

  // 状態
  const [state, setState] = useState<PresenterState>(initialState);
  const hasLoadedInitial = useRef(false);

  // ============================================
  // データロード
  // ============================================

  const loadData = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // プリセット一覧と現在の設定を並列取得
      const [presets, currentPresetId] = await Promise.all([
        service.fetchPresets(),
        service.fetchUserPreset(),
      ]);

      setState((prev) => ({
        ...prev,
        presets,
        currentPresetId,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "プリセット情報の読み込みに失敗しました",
      }));
    }
  }, [service]);

  // 初回ロード
  useEffect(() => {
    if (hasLoadedInitial.current) return;

    hasLoadedInitial.current = true;
    void loadData();
  }, [loadData]);

  // ============================================
  // アクション
  // ============================================

  const selectPreset = useCallback(
    async (presetId: string) => {
      setState((prev) => ({ ...prev, isSaving: true, error: null }));

      try {
        await service.updateUserPreset(presetId);

        setState((prev) => ({
          ...prev,
          currentPresetId: presetId,
          isSaving: false,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isSaving: false,
          error:
            error instanceof Error
              ? error.message
              : "プリセットの変更に失敗しました",
        }));
      }
    },
    [service]
  );

  const resetToDefault = useCallback(async () => {
    setState((prev) => ({ ...prev, isSaving: true, error: null }));

    try {
      await service.updateUserPreset(null);

      setState((prev) => ({
        ...prev,
        currentPresetId: null,
        isSaving: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isSaving: false,
        error:
          error instanceof Error
            ? error.message
            : "プリセットのリセットに失敗しました",
      }));
    }
  }, [service]);

  const refresh = useCallback(async () => {
    hasLoadedInitial.current = false;
    await loadData();
  }, [loadData]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // ============================================
  // ViewModel生成
  // ============================================

  const viewModel = useMemo(() => {
    return service.toViewModel(state.presets, state.currentPresetId);
  }, [service, state.presets, state.currentPresetId]);

  // ============================================
  // 返却
  // ============================================

  return {
    viewModel,
    isLoading: state.isLoading,
    isSaving: state.isSaving,
    error: state.error,
    actions: {
      selectPreset,
      resetToDefault,
      refresh,
      clearError,
    },
  };
}
