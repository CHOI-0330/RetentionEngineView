import "server-only";

import { cookies } from "next/headers";

import { SupabaseAuthGateway } from "../interfaceAdapters/gateways/supabase/authGateway";
import type { User } from "../type/core";

// Supabase 환경 변수가 빠져있으면 인증을 확인할 수 없으니, 조용히 null 을 반환합니다.
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
  // 쿠키는 서버 컴포넌트나 라우트 핸들러에서만 읽을 수 있으므로 여기서 한 번만 읽도록 합니다.
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
    // 액세스 토큰이 실제로 유효한지 Supabase Admin API 를 통해 재검증합니다.
    const { userId, role } = await getGateway().getUserFromAccessToken(accessToken);
    return { userId, role };
  } catch {
    return null;
  }
};
