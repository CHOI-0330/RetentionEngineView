import { NextResponse, type NextRequest } from "next/server";

import { SupabaseAuthGateway } from "../../../../src/interfaceAdapters/gateways/supabase/authGateway";
import { logoutUserUseCase } from "../../../../src/application/entitle/authUseCases";
import { clearAuthCookies } from "../utils";

const authGateway = new SupabaseAuthGateway();

export async function POST(request: NextRequest) {
  // httpOnly 쿠키는 브라우저에서 읽을 수 없지만 API 라우트에서는 바로 사용할 수 있습니다.
  const accessToken = request.cookies.get("auth_access_token")?.value;
  if (!accessToken) {
    const response = NextResponse.json({ data: { ok: true } });
    clearAuthCookies(response);
    return response;
  }

  const result = logoutUserUseCase({ accessToken });
  if (result.kind === "failure") {
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  }

  try {
    await authGateway.logoutUser(result.value);
    const response = NextResponse.json({ data: { ok: true } });
    // 사용자를 로그아웃할 때는 모든 인증 쿠키를 반드시 정리합니다.
    clearAuthCookies(response);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
