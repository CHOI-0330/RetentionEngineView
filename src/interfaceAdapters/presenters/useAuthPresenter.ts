/**
 * Auth Presenter V2
 *
 * 新アーキテクチャ：React Hook（React依存層）
 * - Factory経由でServiceを生成
 * - React状態管理
 * - ViewModelをViewに提供
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";

import type { UseCaseFailure } from "../../application/entitle/models";
import type { MbtiType } from "../../domain/mbti.types";
import { createAuthService } from "../../application/entitle/factories/AuthFactory";
import type {
  AuthViewModel,
  AuthRegisterViewModel,
  AuthLoginViewModel,
  AuthSessionViewModel,
} from "../services/AuthService";

// ============================================
// 状態型定義
// ============================================

interface PresenterState {
  // フォームデータ
  registerEmail: string;
  registerPassword: string;
  registerDisplayName: string;
  registerRole: "NEW_HIRE" | "MENTOR";
  registerMbti: MbtiType | null;
  loginEmail: string;
  loginPassword: string;
  // セッション
  session: AuthSessionViewModel | null;
  // 状態
  isSubmitting: boolean;
  error: UseCaseFailure | null;
}

// ============================================
// Props型定義
// ============================================

interface UseAuthPresenterProps {
  accessToken?: string;
  initialSession?: AuthSessionViewModel | null;
}

// ============================================
// Output型定義
// ============================================

export interface AuthPresenterOutput {
  // ViewModel
  viewModel: AuthViewModel;
  // 状態
  isSubmitting: boolean;
  error: UseCaseFailure | null;
  // アクション
  actions: {
    // フォーム入力
    setRegisterField: (
      field: "email" | "password" | "displayName" | "role" | "mbti",
      value: string | MbtiType | null
    ) => void;
    setLoginField: (field: "email" | "password", value: string) => void;
    // 認証操作
    submitRegistration: () => Promise<void>;
    submitLogin: () => Promise<void>;
    submitLogout: () => Promise<void>;
    // セッション管理
    setSession: (session: AuthSessionViewModel | null) => void;
    // エラー
    clearError: () => void;
  };
}

// ============================================
// V1互換性のための型エクスポート
// ============================================

/**
 * @deprecated Use AuthViewModel from AuthService instead
 * Kept for backward compatibility with AuthView.tsx
 */
export interface AuthPresenterViewModel {
  register: {
    email: string;
    password: string;
    displayName: string;
    role: "NEW_HIRE" | "MENTOR";
    mbti: MbtiType | null;
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

/**
 * @deprecated Use isSubmitting and error from AuthPresenterOutput instead
 * Kept for backward compatibility with AuthView.tsx
 */
export interface AuthPresenterStatus {
  isSubmitting: boolean;
  error: UseCaseFailure | null;
}

/**
 * @deprecated Use actions from AuthPresenterOutput instead
 * Kept for backward compatibility with AuthView.tsx
 */
export interface AuthPresenterInteractions {
  setRegisterField: (
    field: "email" | "password" | "displayName" | "role" | "mbti",
    value: string | MbtiType | null
  ) => void;
  setLoginField: (field: "email" | "password", value: string) => void;
  submitRegistration: () => void;
  submitLogin: () => void;
  submitLogout: () => void;
  clearError: () => void;
}

// ============================================
// 初期状態
// ============================================

const initialState: PresenterState = {
  registerEmail: "",
  registerPassword: "",
  registerDisplayName: "",
  registerRole: "NEW_HIRE",
  registerMbti: null,
  loginEmail: "",
  loginPassword: "",
  session: null,
  isSubmitting: false,
  error: null,
};

// ============================================
// Presenter Hook
// ============================================

export function useAuthPresenter(
  props: UseAuthPresenterProps = {}
): AuthPresenterOutput {
  const { accessToken, initialSession } = props;

  // Service生成（Factory使用）
  const service = useMemo(
    () => createAuthService({ accessToken }),
    [accessToken]
  );

  // 状態
  const [state, setState] = useState<PresenterState>({
    ...initialState,
    session: initialSession ?? null,
  });

  // 初期セッション同期 (マウント時のみ)
  const initialSessionRef = useRef<AuthSessionViewModel | null>(initialSession ?? null);
  useEffect(() => {
    // マウント時に一度だけ実行
    if (initialSessionRef.current !== null) {
      setState((prev) => ({ ...prev, session: initialSessionRef.current }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 空の依存配列でマウント時のみ実行

  // ============================================
  // フォーム入力アクション
  // ============================================

  const setRegisterField = useCallback(
    (
      field: "email" | "password" | "displayName" | "role" | "mbti",
      value: string | MbtiType | null
    ) => {
      setState((prev) => {
        switch (field) {
          case "email":
            return { ...prev, registerEmail: value as string };
          case "password":
            return { ...prev, registerPassword: value as string };
          case "displayName":
            return { ...prev, registerDisplayName: value as string };
          case "role":
            return { ...prev, registerRole: value as "NEW_HIRE" | "MENTOR" };
          case "mbti":
            return { ...prev, registerMbti: value as MbtiType | null };
          default:
            return prev;
        }
      });
    },
    []
  );

  const setLoginField = useCallback(
    (field: "email" | "password", value: string) => {
      setState((prev) => {
        switch (field) {
          case "email":
            return { ...prev, loginEmail: value };
          case "password":
            return { ...prev, loginPassword: value };
          default:
            return prev;
        }
      });
    },
    []
  );

  // ============================================
  // 認証アクション
  // ============================================

  const submitRegistration = useCallback(async () => {
    const {
      registerEmail,
      registerPassword,
      registerDisplayName,
      registerRole,
      registerMbti,
    } = state;

    setState((prev) => ({ ...prev, isSubmitting: true, error: null }));

    const result = await service.register(
      registerEmail,
      registerPassword,
      registerDisplayName,
      registerRole,
      registerMbti
    );

    if (result.kind === "failure") {
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        error: result.error,
      }));
      return;
    }

    // 成功時は状態をリセット
    setState((prev) => ({
      ...prev,
      isSubmitting: false,
      error: null,
      registerEmail: "",
      registerPassword: "",
      registerDisplayName: "",
      registerMbti: null,
    }));
  }, [state, service]);

  const submitLogin = useCallback(async () => {
    const { loginEmail, loginPassword } = state;

    setState((prev) => ({ ...prev, isSubmitting: true, error: null }));

    const result = await service.login(loginEmail, loginPassword);

    if (result.kind === "failure") {
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        error: result.error,
      }));
      return;
    }

    // 成功時はセッションを設定
    setState((prev) => ({
      ...prev,
      isSubmitting: false,
      error: null,
      session: {
        accessToken: result.value.accessToken,
        refreshToken: result.value.refreshToken,
        userId: result.value.userId,
        role: result.value.role,
      },
      loginPassword: "", // セキュリティのためパスワードをクリア
    }));
  }, [state, service]);

  const submitLogout = useCallback(async () => {
    const { session } = state;

    if (!session) {
      setState((prev) => ({
        ...prev,
        error: {
          kind: "ValidationError",
          message: "ログインしていません。",
        },
      }));
      return;
    }

    setState((prev) => ({ ...prev, isSubmitting: true, error: null }));

    const result = await service.logout(session.accessToken);

    if (result.kind === "failure") {
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        error: result.error,
      }));
      return;
    }

    // 成功時はセッションをクリア
    setState((prev) => ({
      ...prev,
      isSubmitting: false,
      error: null,
      session: null,
    }));
  }, [state, service]);

  // ============================================
  // セッション管理
  // ============================================

  const setSession = useCallback((session: AuthSessionViewModel | null) => {
    setState((prev) => ({ ...prev, session }));
  }, []);

  // ============================================
  // エラー管理
  // ============================================

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // ============================================
  // ViewModel生成
  // ============================================

  const viewModel = useMemo(() => {
    const registerViewModel = service.toRegisterViewModel(
      state.registerEmail,
      state.registerPassword,
      state.registerDisplayName,
      state.registerRole,
      state.registerMbti
    );

    const loginViewModel = service.toLoginViewModel(
      state.loginEmail,
      state.loginPassword
    );

    const sessionViewModel = service.toSessionViewModel(state.session);

    return service.toViewModel(registerViewModel, loginViewModel, sessionViewModel);
  }, [
    service,
    state.registerEmail,
    state.registerPassword,
    state.registerDisplayName,
    state.registerRole,
    state.registerMbti,
    state.loginEmail,
    state.loginPassword,
    state.session,
  ]);

  // ============================================
  // 返却
  // ============================================

  return {
    viewModel,
    isSubmitting: state.isSubmitting,
    error: state.error,
    actions: {
      setRegisterField,
      setLoginField,
      submitRegistration,
      submitLogin,
      submitLogout,
      setSession,
      clearError,
    },
  };
}
