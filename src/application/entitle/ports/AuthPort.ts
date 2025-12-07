/**
 * Auth Port Interface
 *
 * 認証・認可に関するPort定義
 * Gateway層が実装すべきインターフェース
 */

import type { User } from "../../../domain/core";

/**
 * AuthPort
 *
 * ユーザー認証・セッション管理を定義するポート
 */
export interface AuthPort {
  /**
   * 新規ユーザーを登録
   *
   * @param input - 登録パラメータ
   * @param input.email - メールアドレス
   * @param input.password - パスワード
   * @param input.displayName - 表示名
   * @param input.role - ユーザーロール
   * @returns 登録されたユーザーID
   */
  registerUser(input: {
    email: string;
    password: string;
    displayName: string;
    role: User["role"];
  }): Promise<{ userId: string }>;

  /**
   * ユーザーログイン
   *
   * @param input - ログインパラメータ
   * @param input.email - メールアドレス
   * @param input.password - パスワード
   * @returns アクセストークン、リフレッシュトークン、ユーザー情報
   */
  loginUser(input: {
    email: string;
    password: string;
  }): Promise<{
    accessToken: string;
    refreshToken: string;
    userId: string;
    role: User["role"];
  }>;

  /**
   * セッションをリフレッシュ
   *
   * @param input - リフレッシュパラメータ
   * @param input.refreshToken - リフレッシュトークン
   * @returns 新しいアクセストークン、リフレッシュトークン、ユーザー情報
   */
  refreshSession(input: {
    refreshToken: string;
  }): Promise<{
    accessToken: string;
    refreshToken: string;
    userId: string;
    role: User["role"];
  }>;

  /**
   * ユーザーログアウト
   *
   * @param input - ログアウトパラメータ
   * @param input.accessToken - アクセストークン
   */
  logoutUser(input: { accessToken: string }): Promise<void>;

  /**
   * アクセストークンからユーザー情報を取得
   *
   * @param accessToken - アクセストークン
   * @returns ユーザーIDとロール
   */
  getUserFromAccessToken(
    accessToken: string
  ): Promise<{ userId: string; role: User["role"] }>;
}
