import "server-only";

import { cookies } from "next/headers";

import { SupabaseAuthGateway } from "../interfaceAdapters/gateways/supabase/authGateway";
import type { User } from "../type/core";

// Supabase の環境変数が揃っていない場合は認証を検証できないため、そのまま null を返します。
const isSupabaseConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export interface AuthenticatedSession {
  userId: string;
  role: User["role"];
}

let cachedGateway: SupabaseAuthGateway | null = null;

const getGateway = () => {
  if (!cachedGateway) {
    cachedGateway = new SupabaseAuthGateway();
  }
  return cachedGateway;
};

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
    // アクセストークンが実際に有効かを Supabase Admin API で再検証します。
    const { userId, role } = await getGateway().getUserFromAccessToken(accessToken);
    return { userId, role };
  } catch {
    return null;
  }
};
