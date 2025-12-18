import "server-only";

import { cookies } from "next/headers";

import type { User } from "../domain/core";
import { createAdminSupabaseClient } from "../lib/supabaseClient";

// Supabase の環境変数が揃っていない場合は認証を検証できないため、そのまま null を返します。
const isSupabaseConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export interface AuthenticatedSession {
  userId: string;
  role: User["role"];
}

export const getAuthenticatedSession = async (): Promise<AuthenticatedSession | null> => {
  // クッキーはサーバーコンポーネントやルートハンドラーでのみ読み取れるため、ここで一度だけ取得します。
  const cookieStore = cookies();
  const accessToken = cookieStore.get("auth_access_token")?.value;
  const refreshToken = cookieStore.get("auth_refresh_token")?.value;
  if (!accessToken || !refreshToken) {
    return null;
  }

  if (!isSupabaseConfigured) {
    return null;
  }

  try {
    const adminClient = createAdminSupabaseClient();

    // 1. 먼저 유저 인증 검증 (userId가 필요하므로 선행 필수)
    const { data, error } = await adminClient.auth.getUser(accessToken);
    if (error || !data.user) {
      return null;
    }
    const userId = data.user.id;

    // 2. role 조회 (userId 확보 후)
    const { data: profile, error: profileError } = await adminClient
      .from("user")
      .select("role")  // 필요한 컬럼만 선택
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      return null;
    }

    return { userId, role: (profile as { role: User["role"] }).role };
  } catch {
    return null;
  }
};
