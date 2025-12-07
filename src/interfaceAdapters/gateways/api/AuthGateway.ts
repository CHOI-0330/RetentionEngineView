/**
 * Auth API Gateway
 *
 * AuthPort 인터페이스 구현
 * - ログイン
 * - 会員登録
 * - ログアウト
 */

import type { UserRole, User } from "../../../domain/core";
import type { AuthPort } from "../../../application/entitle/ports/AuthPort";
import { apiFetch } from "../../../lib/api";
import { createErrorFromStatus } from "../../errors";

export interface AuthGatewayConfig {
  accessToken?: string;
}

/**
 * ログインレスポンス型
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  role: UserRole;
}

/**
 * 会員登録リクエスト型
 */
export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  mbti?: string;
}

/**
 * Auth API Gateway
 */
export class AuthGateway implements AuthPort {
  private accessToken?: string;

  constructor(config: AuthGatewayConfig = {}) {
    this.accessToken = config.accessToken;
  }

  setAccessToken(token: string | undefined): void {
    this.accessToken = token;
  }

  /**
   * ユーザー登録 (AuthPort)
   */
  async registerUser(input: {
    email: string;
    password: string;
    displayName: string;
    role: User["role"];
  }): Promise<{ userId: string }> {
    const result = await apiFetch<{ userId: string }>("/api/auth/register", {
      method: "POST",
      body: {
        email: input.email,
        password: input.password,
        displayName: input.displayName,
        role: input.role,
      },
    });

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    return result.data;
  }

  /**
   * ログイン (AuthPort)
   */
  async loginUser(input: {
    email: string;
    password: string;
  }): Promise<{
    accessToken: string;
    refreshToken: string;
    userId: string;
    role: User["role"];
  }> {
    const result = await apiFetch<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: {
        email: input.email,
        password: input.password,
      },
    });

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    return result.data;
  }

  /**
   * セッションリフレッシュ (AuthPort)
   */
  async refreshSession(input: {
    refreshToken: string;
  }): Promise<{
    accessToken: string;
    refreshToken: string;
    userId: string;
    role: User["role"];
  }> {
    const result = await apiFetch<LoginResponse>("/api/auth/refresh", {
      method: "POST",
      body: {
        refreshToken: input.refreshToken,
      },
    });

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    return result.data;
  }

  /**
   * ログアウト (AuthPort)
   */
  async logoutUser(_input: { accessToken: string }): Promise<void> {
    const result = await apiFetch("/api/auth/logout", {
      method: "POST",
      accessToken: this.accessToken,
    });

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }
  }

  /**
   * アクセストークンからユーザー情報取得 (AuthPort)
   */
  async getUserFromAccessToken(
    accessToken: string
  ): Promise<{ userId: string; role: User["role"] }> {
    const result = await apiFetch<{ userId: string; role: User["role"] }>(
      "/api/auth/me",
      {
        method: "GET",
        accessToken,
      }
    );

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    return result.data;
  }

  // ============================================
  // Legacy methods (backward compatibility)
  // ============================================

  /**
   * @deprecated Use loginUser instead
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    return this.loginUser({ email, password });
  }

  /**
   * @deprecated Use registerUser instead
   */
  async register(request: RegisterRequest): Promise<void> {
    await this.registerUser({
      email: request.email,
      password: request.password,
      displayName: request.displayName,
      role: request.role,
    });
  }

  /**
   * @deprecated Use logoutUser instead
   */
  async logout(): Promise<void> {
    await this.logoutUser({ accessToken: this.accessToken ?? "" });
  }
}
