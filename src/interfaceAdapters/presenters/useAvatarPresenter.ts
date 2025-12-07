/**
 * Avatar Presenter V2
 *
 * 新アーキテクチャ：React Hook（React依存層）
 * - Factory経由でServiceを生成
 * - React状態管理
 * - ViewModelをViewに提供
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";

import type { AvatarGender, AvatarPersonality } from "../../domain/core";
import type { AvatarSettings } from "../gateways/api/AvatarGateway";
import { createAvatarSettingsService } from "../../application/entitle/factories/AvatarSettingsFactory";
import type { AvatarSettingsViewModel } from "../services/AvatarSettingsService";

// ============================================
// 状態型定義
// ============================================

interface PresenterState {
  settings: AvatarSettings | null;
  isLoading: boolean;
  isGenerating: boolean;
  isSaving: boolean;
  error: string | null;
}

// ============================================
// Props型定義
// ============================================

interface UseAvatarPresenterProps {
  accessToken?: string;
  /** ポーリング間隔（ミリ秒、デフォルト2000ms） */
  pollInterval?: number;
}

// ============================================
// Output型定義
// ============================================

export interface AvatarPresenterOutput {
  // ViewModel
  viewModel: AvatarSettingsViewModel;
  // 状態
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  // アクション
  actions: {
    // 設定変更
    updateGender: (gender: AvatarGender) => Promise<void>;
    updatePersonality: (personality: AvatarPersonality) => Promise<void>;
    updateSettings: (gender: AvatarGender, personality: AvatarPersonality) => Promise<void>;
    // 生成
    startGeneration: (gender: AvatarGender, personality: AvatarPersonality) => Promise<void>;
    resetForRegeneration: () => void;
    // リフレッシュ
    refresh: () => Promise<void>;
    // エラー
    clearError: () => void;
  };
}

// ============================================
// 初期状態
// ============================================

const initialState: PresenterState = {
  settings: null,
  isLoading: true,
  isGenerating: false,
  isSaving: false,
  error: null,
};

// ============================================
// Presenter Hook
// ============================================

const POLL_INTERVAL = 2000; // 2秒

export function useAvatarPresenter(
  props: UseAvatarPresenterProps = {}
): AvatarPresenterOutput {
  const { accessToken, pollInterval = POLL_INTERVAL } = props;

  // Service生成（Factory使用）
  const service = useMemo(
    () => createAvatarSettingsService({ accessToken }),
    [accessToken]
  );

  // 状態
  const [state, setState] = useState<PresenterState>(initialState);
  const hasLoadedInitial = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // データロード
  // ============================================

  const loadSettings = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const settings = await service.fetchSettings();

      setState((prev) => ({
        ...prev,
        settings,
        isLoading: false,
        isGenerating: settings.generationStatus === "generating",
        error: null,
      }));

      // 生成中の場合はポーリング開始
      if (settings.generationStatus === "generating") {
        startPolling();
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "設定の読み込みに失敗しました",
      }));
    }
  }, [service]);

  // 初回ロード
  useEffect(() => {
    if (hasLoadedInitial.current) return;

    hasLoadedInitial.current = true;
    void loadSettings();
  }, [loadSettings]);

  // ============================================
  // 生成状態のポーリング
  // ============================================

  const pollStatus = useCallback(async () => {
    try {
      const statusData = await service.fetchStatus();

      if (statusData.status === "completed") {
        // 完了時に設定を再ロード
        const settings = await service.fetchSettings();
        setState((prev) => ({
          ...prev,
          settings,
          isGenerating: false,
        }));
        stopPolling();
      } else if (statusData.status === "failed") {
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          error: "アバター生成に失敗しました。もう一度お試しください。",
        }));
        stopPolling();
      } else {
        // 進行中：設定の一部を更新
        setState((prev) => {
          if (!prev.settings) return prev;
          return {
            ...prev,
            settings: {
              ...prev.settings,
              generationStatus: statusData.status,
              generationProgress: statusData.progress,
            },
          };
        });
      }
    } catch (error) {
      console.error("Failed to poll status:", error);
    }
  }, [service]);

  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;
    pollIntervalRef.current = setInterval(pollStatus, pollInterval);
  }, [pollStatus, pollInterval]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // ============================================
  // アクション
  // ============================================

  const updateGender = useCallback(
    async (gender: AvatarGender) => {
      if (!state.settings?.personalityPreset) {
        setState((prev) => ({
          ...prev,
          error: "性格プリセットを先に選択してください",
        }));
        return;
      }

      setState((prev) => ({ ...prev, isSaving: true, error: null }));

      try {
        await service.updateSettings(gender, state.settings.personalityPreset!);

        setState((prev) => {
          if (!prev.settings) return prev;
          return {
            ...prev,
            settings: { ...prev.settings, gender },
            isSaving: false,
          };
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isSaving: false,
          error: error instanceof Error ? error.message : "設定の保存に失敗しました",
        }));
      }
    },
    [service, state.settings?.personalityPreset]
  );

  const updatePersonality = useCallback(
    async (personality: AvatarPersonality) => {
      if (!state.settings?.gender) {
        setState((prev) => ({
          ...prev,
          error: "性別を先に選択してください",
        }));
        return;
      }

      setState((prev) => ({ ...prev, isSaving: true, error: null }));

      try {
        await service.updateSettings(state.settings.gender!, personality);

        setState((prev) => {
          if (!prev.settings) return prev;
          return {
            ...prev,
            settings: { ...prev.settings, personalityPreset: personality },
            isSaving: false,
          };
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isSaving: false,
          error: error instanceof Error ? error.message : "設定の保存に失敗しました",
        }));
      }
    },
    [service, state.settings?.gender]
  );

  const updateSettings = useCallback(
    async (gender: AvatarGender, personality: AvatarPersonality) => {
      setState((prev) => ({ ...prev, isSaving: true, error: null }));

      try {
        await service.updateSettings(gender, personality);

        setState((prev) => {
          if (!prev.settings) return prev;
          return {
            ...prev,
            settings: { ...prev.settings, gender, personalityPreset: personality },
            isSaving: false,
          };
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isSaving: false,
          error: error instanceof Error ? error.message : "設定の保存に失敗しました",
        }));
      }
    },
    [service]
  );

  const startGeneration = useCallback(
    async (gender: AvatarGender, personality: AvatarPersonality) => {
      setState((prev) => ({ ...prev, isGenerating: true, error: null }));

      try {
        // まず設定を保存
        await service.updateSettings(gender, personality);

        // 生成開始
        await service.startGeneration();

        // 状態更新
        setState((prev) => {
          if (!prev.settings) return prev;
          return {
            ...prev,
            settings: {
              ...prev.settings,
              gender,
              personalityPreset: personality,
              generationStatus: "generating",
              generationProgress: 0,
            },
          };
        });

        // ポーリング開始
        startPolling();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          error: error instanceof Error ? error.message : "生成に失敗しました",
        }));
      }
    },
    [service, startPolling]
  );

  const resetForRegeneration = useCallback(() => {
    setState((prev) => {
      if (!prev.settings) return prev;
      return {
        ...prev,
        settings: {
          ...prev.settings,
          isGenerated: false,
          generationStatus: "pending",
          generationProgress: 0,
          avatarUrls: null,
        },
      };
    });
  }, []);

  const refresh = useCallback(async () => {
    await loadSettings();
  }, [loadSettings]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // ============================================
  // ViewModel生成
  // ============================================

  const viewModel = useMemo(() => {
    if (!state.settings) {
      // デフォルトViewModel
      return {
        gender: null,
        personalityPreset: null,
        isGenerated: false,
        generationStatus: "pending" as const,
        generationProgress: 0,
        avatarUrls: null,
        canGenerate: false,
        isGenerating: false,
        progressPercentage: 0,
      };
    }

    return service.toViewModel(state.settings);
  }, [service, state.settings]);

  // ============================================
  // 返却
  // ============================================

  return {
    viewModel,
    isLoading: state.isLoading,
    isSaving: state.isSaving,
    error: state.error,
    actions: {
      updateGender,
      updatePersonality,
      updateSettings,
      startGeneration,
      resetForRegeneration,
      refresh,
      clearError,
    },
  };
}
