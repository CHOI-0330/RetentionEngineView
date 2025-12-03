import { NextResponse, type NextRequest } from "next/server";

import { logoutUserUseCase } from "../../../../src/application/entitle/authUseCases";
import { createAdminSupabaseClient } from "../../../../src/lib/supabaseClient";
import { clearAuthCookies } from "../utils";

class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const getAdminClient = createAdminSupabaseClient;

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
    const adminClient = getAdminClient();
    const { error } = await adminClient.auth.admin.signOut(result.value.accessToken, "global");
    if (error) {
      throw new HttpError(500, error.message ?? "Failed to sign out.");
    }
    const response = NextResponse.json({ data: { ok: true } });
    // ログアウト時にはすべての認証クッキーを必ず削除します。
    clearAuthCookies(response);
    return response;
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = "nodejs";
