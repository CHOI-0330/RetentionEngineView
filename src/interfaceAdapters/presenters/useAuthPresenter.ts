import { useMemo } from "react";

import type { UseCaseFailure } from "../../application/entitle/models";
import type { AuthController } from "../controllers/useAuthController";

export interface AuthPresenterViewModel {
  register: {
    email: string;
    password: string;
    displayName: string;
    role: "NEW_HIRE" | "MENTOR";
  };
  login: {
    email: string;
    password: string;
  };
  session: {
    accessToken: string;
    refreshToken: string;
    userId: string;
    role: "NEW_HIRE" | "MENTOR" | "ADMIN";
  } | null;
}

export interface AuthPresenterStatus {
  isSubmitting: boolean;
  error: UseCaseFailure | null;
}

export interface AuthPresenterInteractions {
  setRegisterField: (field: "email" | "password" | "displayName" | "role", value: string) => void;
  setLoginField: (field: "email" | "password", value: string) => void;
  submitRegistration: () => void;
  submitLogin: () => void;
  submitLogout: () => void;
  clearError: () => void;
}

export interface AuthPresenterOutput {
  viewModel: AuthPresenterViewModel;
  status: AuthPresenterStatus;
  interactions: AuthPresenterInteractions;
}

export const useAuthPresenter = (controller: AuthController): AuthPresenterOutput => {
  const { state, actions } = controller;

  const viewModel = useMemo<AuthPresenterViewModel>(
    () => ({
      register: {
        email: state.registerEmail,
        password: state.registerPassword,
        displayName: state.registerDisplayName,
        role: state.registerRole,
      },
      login: {
        email: state.loginEmail,
        password: state.loginPassword,
      },
      session: state.session,
    }),
    [state.loginEmail, state.loginPassword, state.registerDisplayName, state.registerEmail, state.registerPassword, state.registerRole, state.session]
  );

  const status = useMemo<AuthPresenterStatus>(
    () => ({
      isSubmitting: state.isSubmitting,
      error: state.error,
    }),
    [state.error, state.isSubmitting]
  );

  const interactions: AuthPresenterInteractions = useMemo(
    () => ({
      setRegisterField: actions.setRegisterField,
      setLoginField: actions.setLoginField,
      submitRegistration: actions.submitRegistration,
      submitLogin: actions.submitLogin,
      submitLogout: actions.submitLogout,
      clearError: actions.clearError,
    }),
    [actions.clearError, actions.setLoginField, actions.setRegisterField, actions.submitLogin, actions.submitLogout, actions.submitRegistration]
  );

  return { viewModel, status, interactions };
};
