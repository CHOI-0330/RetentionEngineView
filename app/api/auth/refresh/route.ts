import { NextResponse, type NextRequest } from "next/server";

import { SupabaseAuthGateway } from "../../../../src/interfaceAdapters/gateways/supabase/authGateway";
import { setAuthCookies } from "../utils";

const authGateway = new SupabaseAuthGateway();

export async function POST(request: NextRequest) {
  // Refresh 토큰은 재발급 전용으로만 사용하므로 서버에서 직접 읽습니다.
  const refreshToken = request.cookies.get("auth_refresh_token")?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await authGateway.refreshSession({ refreshToken });
    const response = NextResponse.json({ data });
    setAuthCookies(response, data);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
