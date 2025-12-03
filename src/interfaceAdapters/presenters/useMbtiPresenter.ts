import { useMemo } from "react";
import type { MbtiController } from "../controllers/useMbtiController";
import type { MbtiType } from "../../domain/mbti.types";

export interface MbtiPresenterViewModel {
  currentMbti: MbtiType | null;
  selectedMbti: MbtiType | null;
}

export interface MbtiPresenterStatus {
  isLoading: boolean;
  error: string | null;
}

export interface MbtiPresenterInteractions {
  setSelectedMbti: (mbti: MbtiType | null) => void;
  saveMbti: () => void;
  clearError: () => void;
}

export interface MbtiPresenterOutput {
  viewModel: MbtiPresenterViewModel;
  status: MbtiPresenterStatus;
  interactions: MbtiPresenterInteractions;
}

export const useMbtiPresenter = (
  controller: MbtiController,
  userId: string,
  accessToken?: string
): MbtiPresenterOutput => {
  const { state, actions } = controller;

  const viewModel = useMemo<MbtiPresenterViewModel>(
    () => ({
      currentMbti: state.currentMbti,
      selectedMbti: state.selectedMbti,
    }),
    [state.currentMbti, state.selectedMbti]
  );

  const status = useMemo<MbtiPresenterStatus>(
    () => ({
      isLoading: state.isLoading,
      error: state.error,
    }),
    [state.error, state.isLoading]
  );

  const saveMbti = useMemo(
    () => () => {
      if (state.selectedMbti) {
        actions.updateMbti(userId, state.selectedMbti, accessToken);
      }
    },
    [accessToken, actions, state.selectedMbti, userId]
  );

  const interactions: MbtiPresenterInteractions = useMemo(
    () => ({
      setSelectedMbti: actions.setSelectedMbti,
      saveMbti,
      clearError: actions.clearError,
    }),
    [actions.clearError, actions.setSelectedMbti, saveMbti]
  );

  return { viewModel, status, interactions };
};
