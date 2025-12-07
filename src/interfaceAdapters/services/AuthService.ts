/**
 * Auth Service
 *
 * 純粋クラス（React非依存）
 * UseCaseとGatewayを組み合わせて認証機能を提供
 * ViewModelへの変換も担当
 */

import type { UserRole } from "../../domain/core";
import type { UseCaseResult, UseCaseFailure } from "../../application/entitle/models";
import type { AuthGateway, LoginResponse } from "../gateways/api/AuthGateway";
import type { MbtiType } from "../../domain/mbti.types";

// ============================================
// ViewModel型定義
// ============================================

export interface AuthRegisterViewModel {
  email: string;
  password: string;
  displayName: string;
  role: "NEW_HIRE" | "MENTOR";
  mbti: MbtiType | null;
}

export interface AuthLoginViewModel {
  email: string;
  password: string;
}

export interface AuthSessionViewModel {
  accessToken: string;
  refreshToken: string;
  userId: string;
  role: "NEW_HIRE" | "MENTOR" | "ADMIN";
}

export interface AuthViewModel {
  register: AuthRegisterViewModel;
  login: AuthLoginViewModel;
  session: AuthSessionViewModel | null;
}

// ============================================
// UseCase型定義（関数シグネチャ）
// ============================================

type LoginUseCase = (input: {
  email: string;
  password: string;
}) => UseCaseResult<{ email: string; password: string }>;

type RegisterUseCase = (input: {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
}) => UseCaseResult<{
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
}>;

type LogoutUseCase = (input: {
  accessToken: string;
}) => UseCaseResult<{ accessToken: string }>;

// ============================================
// Service クラス
// ============================================

/**
 * Auth Service
 *
 * UseCase経由でビジネスロジックを実行
 * Gatewayで外部API呼び出し
 * データをViewModelに変換
 */
export class AuthService {
  constructor(
    private readonly authGateway: AuthGateway,
    private readonly loginUseCase: LoginUseCase,
    private readonly registerUseCase: RegisterUseCase,
    private readonly logoutUseCase: LogoutUseCase
  ) {}

  // ============================================
  // 認証操作
  // ============================================

  /**
   * ログイン処理
   */
  async login(
    email: string,
    password: string
  ): Promise<UseCaseResult<LoginResponse>> {
    // 1. UseCaseでバリデーション
    const validation = this.loginUseCase({ email, password });

    if (validation.kind === "failure") {
      return validation;
    }

    // 2. Gatewayでログイン実行
    try {
      const response = await this.authGateway.login(
        validation.value.email,
        validation.value.password
      );

      return {
        kind: "success",
        value: response,
      };
    } catch (error) {
      return {
        kind: "failure",
        error: this.mapErrorToFailure(error),
      };
    }
  }

  /**
   * 会員登録処理
   */
  async register(
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    mbti?: MbtiType | null
  ): Promise<UseCaseResult<void>> {
    // 1. UseCaseでバリデーション
    const validation = this.registerUseCase({
      email,
      password,
      displayName,
      role,
    });

    if (validation.kind === "failure") {
      return validation;
    }

    // 2. Gatewayで登録実行
    try {
      await this.authGateway.register({
        email: validation.value.email,
        password: validation.value.password,
        displayName: validation.value.displayName,
        role: validation.value.role,
        mbti: mbti ?? undefined,
      });

      return {
        kind: "success",
        value: undefined,
      };
    } catch (error) {
      return {
        kind: "failure",
        error: this.mapErrorToFailure(error),
      };
    }
  }

  /**
   * ログアウト処理
   */
  async logout(accessToken: string): Promise<UseCaseResult<void>> {
    // 1. UseCaseでバリデーション
    const validation = this.logoutUseCase({ accessToken });

    if (validation.kind === "failure") {
      return validation;
    }

    // 2. Gatewayでログアウト実行
    try {
      await this.authGateway.logout();

      return {
        kind: "success",
        value: undefined,
      };
    } catch (error) {
      return {
        kind: "failure",
        error: this.mapErrorToFailure(error),
      };
    }
  }

  // ============================================
  // ViewModel変換
  // ============================================

  /**
   * 登録フォームデータをViewModelに変換
   */
  toRegisterViewModel(
    email: string,
    password: string,
    displayName: string,
    role: "NEW_HIRE" | "MENTOR",
    mbti: MbtiType | null
  ): AuthRegisterViewModel {
    return {
      email,
      password,
      displayName,
      role,
      mbti,
    };
  }

  /**
   * ログインフォームデータをViewModelに変換
   */
  toLoginViewModel(email: string, password: string): AuthLoginViewModel {
    return {
      email,
      password,
    };
  }

  /**
   * セッションデータをViewModelに変換
   */
  toSessionViewModel(
    session: AuthSessionViewModel | null
  ): AuthSessionViewModel | null {
    return session;
  }

  /**
   * 統合ViewModelを生成
   */
  toViewModel(
    registerData: AuthRegisterViewModel,
    loginData: AuthLoginViewModel,
    session: AuthSessionViewModel | null
  ): AuthViewModel {
    return {
      register: registerData,
      login: loginData,
      session,
    };
  }

  // ============================================
  // エラーマッピング
  // ============================================

  /**
   * エラーをUseCaseFailureにマップ
   */
  private mapErrorToFailure(error: unknown): UseCaseFailure {
    if (error instanceof Error) {
      return {
        kind: "ValidationError",
        message: error.message,
      };
    }

    return {
      kind: "ValidationError",
      message: "認証エラーが発生しました。",
    };
  }
}
