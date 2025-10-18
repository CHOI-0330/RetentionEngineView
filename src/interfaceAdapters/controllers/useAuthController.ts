import { useCallback, useMemo, useRef, useState } from "react";

import type { UseCaseFailure } from "../../application/entitle/models";
import {
  loginUserUseCase,
  logoutUserUseCase,
  registerUserUseCase,
  type LoginUserInput,
  type RegisterUserInput,
} from "../../application/entitle/authUseCases";

export type AuthEffect =
  | {
      id: string;
      kind: "REQUEST_REGISTER";
      payload: RegisterUserInput;
    }
  | {
      id: string;
      kind: "REQUEST_LOGIN";
      payload: LoginUserInput;
    }
  | {
      id: string;
      kind: "REQUEST_LOGOUT";
      payload: { accessToken: string };
    };

export interface AuthState {
  registerEmail: string;
  registerPassword: string;
  registerDisplayName: string;
  registerRole: "NEW_HIRE" | "MENTOR";
  loginEmail: string;
  loginPassword: string;
  isSubmitting: boolean;
  error: UseCaseFailure | null;
  pendingEffects: AuthEffect[];
  session: {
    accessToken: string;
    refreshToken: string;
    userId: string;
    role: "NEW_HIRE" | "MENTOR" | "ADMIN";
  } | null;
}

export interface AuthActions {
  setRegisterField: (field: "email" | "password" | "displayName" | "role", value: string) => void;
  setLoginField: (field: "email" | "password", value: string) => void;
  submitRegistration: () => void;
  submitLogin: () => void;
  submitLogout: () => void;
  acknowledgeEffect: (effectId: string) => void;
  clearError: () => void;
  setSession: (session: AuthState["session"]) => void;
  setError: (error: UseCaseFailure | null) => void;
}

export interface AuthController {
  state: AuthState;
  actions: AuthActions;
}

const INITIAL_STATE: AuthState = {
  registerEmail: "",
  registerPassword: "",
  registerDisplayName: "",
  registerRole: "NEW_HIRE",
  loginEmail: "",
  loginPassword: "",
  isSubmitting: false,
  error: null,
  pendingEffects: [],
  session: null,
};

export const useAuthController = (): AuthController => {
  const effectIdRef = useRef(0);
  const [state, setState] = useState<AuthState>(INITIAL_STATE);

  const setRegisterField = useCallback((field: "email" | "password" | "displayName" | "role", value: string) => {
    setState((previous) => ({
      ...previous,
      registerEmail: field === "email" ? value : previous.registerEmail,
      registerPassword: field === "password" ? value : previous.registerPassword,
      registerDisplayName: field === "displayName" ? value : previous.registerDisplayName,
      registerRole: field === "role" ? (value as AuthState["registerRole"]) : previous.registerRole,
    }));
  }, []);

  const setLoginField = useCallback((field: "email" | "password", value: string) => {
    setState((previous) => ({
      ...previous,
      loginEmail: field === "email" ? value : previous.loginEmail,
      loginPassword: field === "password" ? value : previous.loginPassword,
    }));
  }, []);

  const clearError = useCallback(() => {
    setState((previous) => ({
      ...previous,
      error: null,
    }));
  }, []);

  const submitRegistration = useCallback(() => {
    setState((previous) => {
      if (previous.isSubmitting) {
        return previous;
      }
      const validation = registerUserUseCase({
        email: previous.registerEmail,
        password: previous.registerPassword,
        displayName: previous.registerDisplayName,
        role: previous.registerRole,
      });
      if (validation.kind === "failure") {
        return { ...previous, error: validation.error };
      }
      const effect: AuthEffect = {
        id: `auth-effect-${effectIdRef.current++}`,
        kind: "REQUEST_REGISTER",
        payload: validation.value,
      };
      return {
        ...previous,
        isSubmitting: true,
        error: null,
        pendingEffects: [...previous.pendingEffects, effect],
      };
    });
  }, []);

  const submitLogin = useCallback(() => {
    setState((previous) => {
      if (previous.isSubmitting) {
        return previous;
      }
      const validation = loginUserUseCase({
        email: previous.loginEmail,
        password: previous.loginPassword,
      });
      if (validation.kind === "failure") {
        return { ...previous, error: validation.error };
      }
      const effect: AuthEffect = {
        id: `auth-effect-${effectIdRef.current++}`,
        kind: "REQUEST_LOGIN",
        payload: validation.value,
      };
      return {
        ...previous,
        isSubmitting: true,
        error: null,
        pendingEffects: [...previous.pendingEffects, effect],
      };
    });
  }, []);

  const submitLogout = useCallback(() => {
    setState((previous) => {
      if (!previous.session || previous.isSubmitting) {
        return previous;
      }
      const validation = logoutUserUseCase({ accessToken: previous.session.accessToken });
      if (validation.kind === "failure") {
        return { ...previous, error: validation.error };
      }
      const effect: AuthEffect = {
        id: `auth-effect-${effectIdRef.current++}`,
        kind: "REQUEST_LOGOUT",
        payload: validation.value,
      };
      return {
        ...previous,
        isSubmitting: true,
        error: null,
        pendingEffects: [...previous.pendingEffects, effect],
      };
    });
  }, []);

  const acknowledgeEffect = useCallback((effectId: string) => {
    setState((previous) => ({
      ...previous,
      pendingEffects: previous.pendingEffects.filter((effect) => effect.id !== effectId),
      isSubmitting: false,
    }));
  }, []);

  const setSession = useCallback((session: AuthState["session"]) => {
    setState((previous) => ({
      ...previous,
      session,
    }));
  }, []);

  const setError = useCallback((error: UseCaseFailure | null) => {
    setState((previous) => ({
      ...previous,
      error,
    }));
  }, []);

  const actions: AuthActions = useMemo(
    () => ({
      setRegisterField,
      setLoginField,
      submitRegistration,
      submitLogin,
      submitLogout,
      acknowledgeEffect,
      clearError,
      setSession,
      setError,
    }),
    [acknowledgeEffect, clearError, setError, setLoginField, setRegisterField, setSession, submitLogin, submitLogout, submitRegistration]
  );

  return { state, actions };
};
