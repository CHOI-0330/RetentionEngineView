import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { createAdminSupabaseClient } from "../../../../src/lib/supabaseClient";
import { setAuthCookies } from "../utils";

class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const getAnonClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new HttpError(500, "Supabase anon client is not configured.");
  }
  return createClient(url, anonKey);
};

/**
 * refresh token으로 새 access token 발급
 */
async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  userId: string;
} | null> {
  try {
    const anonClient = getAnonClient();
    const { data, error } = await anonClient.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error || !data.session || !data.user) {
      return null;
    }
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      userId: data.user.id,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  // We rely on the httpOnly cookies that Next.js hands to this API route.
  let accessToken = request.cookies.get("auth_access_token")?.value;
  const refreshToken = request.cookies.get("auth_refresh_token")?.value;

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ data: null }, { status: 401 });
  }

  try {
    const adminClient = createAdminSupabaseClient();
    let userData = await adminClient.auth.getUser(accessToken);

    // access token이 만료된 경우 refresh 시도
    let tokensRefreshed = false;
    let newAccessToken = accessToken;
    let newRefreshToken = refreshToken;

    if (userData.error || !userData.data.user) {
      // JWT 만료 에러인 경우 refresh 시도
      const isTokenExpired = userData.error?.message?.toLowerCase().includes("expired") ||
                            userData.error?.message?.toLowerCase().includes("invalid");

      if (isTokenExpired) {
        const refreshed = await refreshAccessToken(refreshToken);
        if (refreshed) {
          // 새 토큰으로 다시 시도
          newAccessToken = refreshed.accessToken;
          newRefreshToken = refreshed.refreshToken;
          tokensRefreshed = true;
          userData = await adminClient.auth.getUser(newAccessToken);
        }
      }

      // refresh 후에도 실패하면 에러
      if (userData.error || !userData.data.user) {
        throw new HttpError(401, userData.error?.message ?? "Unauthorized");
      }
    }

    const userId = userData.data.user.id;
    const { data: profile, error: profileError } = await adminClient
      .from("user")
      .select("role, display_name")
      .eq("user_id", userId)
      .single();
    if (profileError || !profile) {
      throw new HttpError(401, profileError?.message ?? "User profile not found.");
    }

    const responseData = {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      userId,
      role: (profile as { role: string }).role,
      displayName: (profile as { display_name?: string }).display_name ?? "",
    };

    const response = NextResponse.json({ data: responseData });

    // 토큰이 갱신된 경우 쿠키도 업데이트
    if (tokensRefreshed) {
      setAuthCookies(response, responseData);
    }

    return response;
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export const runtime = "nodejs";
