import { NextResponse, type NextRequest } from "next/server";

import { SupabaseAuthGateway } from "../../../../src/interfaceAdapters/gateways/supabase/authGateway";
import { logoutUserUseCase } from "../../../../src/application/entitle/authUseCases";
import { clearAuthCookies } from "../utils";

const authGateway = new SupabaseAuthGateway();

export async function POST(request: NextRequest) {
  // httpOnly クッキーはブラウザからは読み取れませんが、API ルートからは直接参照できます。
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
    // ログアウト時にはすべての認証クッキーを必ず削除します。
    clearAuthCookies(response);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
