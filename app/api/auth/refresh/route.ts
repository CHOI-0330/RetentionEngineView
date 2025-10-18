import { NextResponse, type NextRequest } from "next/server";

import { SupabaseAuthGateway } from "../../../../src/interfaceAdapters/gateways/supabase/authGateway";
import { setAuthCookies } from "../utils";

const authGateway = new SupabaseAuthGateway();

export async function POST(request: NextRequest) {
  // リフレッシュトークンは再発行専用のため、サーバー側で直接読み取ります。
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
