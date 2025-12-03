import { useCallback, useMemo, useRef, useState } from "react";
import type { MbtiType } from "../../domain/mbti.types";

export type MbtiEffect =
  | {
      id: string;
      kind: "FETCH_MBTI";
      payload: { userId: string; accessToken?: string };
    }
  | {
      id: string;
      kind: "UPDATE_MBTI";
      payload: { userId: string; mbti: MbtiType; accessToken?: string };
    };

export interface MbtiState {
  currentMbti: MbtiType | null;
  selectedMbti: MbtiType | null;
  isLoading: boolean;
  error: string | null;
  pendingEffects: MbtiEffect[];
}

export interface MbtiActions {
  setSelectedMbti: (mbti: MbtiType | null) => void;
  fetchMbti: (userId: string, accessToken?: string) => void;
  updateMbti: (userId: string, mbti: MbtiType, accessToken?: string) => void;
  acknowledgeEffect: (effectId: string) => void;
  clearError: () => void;
  setCurrentMbti: (mbti: MbtiType | null) => void;
  setError: (error: string | null) => void;
}

export interface MbtiController {
  state: MbtiState;
  actions: MbtiActions;
}

const INITIAL_STATE: MbtiState = {
  currentMbti: null,
  selectedMbti: null,
  isLoading: false,
  error: null,
  pendingEffects: [],
};

export const useMbtiController = (): MbtiController => {
  const effectIdRef = useRef(0);
  const [state, setState] = useState<MbtiState>(INITIAL_STATE);

  const setSelectedMbti = useCallback((mbti: MbtiType | null) => {
    setState((previous) => ({
      ...previous,
      selectedMbti: mbti,
    }));
  }, []);

  const fetchMbti = useCallback((userId: string, accessToken?: string) => {
    setState((previous) => {
      if (previous.isLoading) {
        return previous;
      }
      const effect: MbtiEffect = {
        id: `mbti-effect-${effectIdRef.current++}`,
        kind: "FETCH_MBTI",
        payload: { userId, accessToken },
      };
      return {
        ...previous,
        isLoading: true,
        error: null,
        pendingEffects: [...previous.pendingEffects, effect],
      };
    });
  }, []);

  const updateMbti = useCallback(
    (userId: string, mbti: MbtiType, accessToken?: string) => {
      setState((previous) => {
        if (previous.isLoading) {
          return previous;
        }
        const effect: MbtiEffect = {
          id: `mbti-effect-${effectIdRef.current++}`,
          kind: "UPDATE_MBTI",
          payload: { userId, mbti, accessToken },
        };
        return {
          ...previous,
          isLoading: true,
          error: null,
          pendingEffects: [...previous.pendingEffects, effect],
        };
      });
    },
    []
  );

  const acknowledgeEffect = useCallback((effectId: string) => {
    setState((previous) => ({
      ...previous,
      pendingEffects: previous.pendingEffects.filter(
        (effect) => effect.id !== effectId
      ),
      isLoading: false,
    }));
  }, []);

  const clearError = useCallback(() => {
    setState((previous) => ({
      ...previous,
      error: null,
    }));
  }, []);

  const setCurrentMbti = useCallback((mbti: MbtiType | null) => {
    setState((previous) => ({
      ...previous,
      currentMbti: mbti,
      selectedMbti: mbti,
    }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((previous) => ({
      ...previous,
      error,
    }));
  }, []);

  const actions: MbtiActions = useMemo(
    () => ({
      setSelectedMbti,
      fetchMbti,
      updateMbti,
      acknowledgeEffect,
      clearError,
      setCurrentMbti,
      setError,
    }),
    [
      acknowledgeEffect,
      clearError,
      fetchMbti,
      setCurrentMbti,
      setError,
      setSelectedMbti,
      updateMbti,
    ]
  );

  return { state, actions };
};
