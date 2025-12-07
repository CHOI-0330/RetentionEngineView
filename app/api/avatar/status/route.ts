/**
 * GET /api/avatar/status - アバター生成状態照会（バックエンドプロキシ）
 */

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5001";

// 複数ソースからアクセストークン抽出（既存APIと同一方式）
function resolveAccessToken(request: NextRequest): string | null {
  // 1. Authorizationヘッダー
  const headerToken = request.headers.get("authorization");
  const accessTokenFromHeader = headerToken?.toLowerCase().startsWith("bearer ")
    ? headerToken.slice(7).trim()
    : null;

  // 2. auth_access_tokenクッキー
  const cookieAccessToken = request.cookies.get("auth_access_token")?.value ?? null;

  // 3. Supabase authクッキー
  const supabaseCookie = request.cookies.getAll().find((cookie) => cookie.name.includes("-auth-token"));
  let supabaseAccessToken: string | null = null;
  if (supabaseCookie) {
    try {
      const parsed = JSON.parse(supabaseCookie.value);
      supabaseAccessToken = typeof parsed?.access_token === "string" ? parsed.access_token : null;
    } catch {
      supabaseAccessToken = null;
    }
  }

  // 4. sessionクッキー（レガシー）
  const sessionCookie = request.cookies.get("session");
  let sessionAccessToken: string | null = null;
  if (sessionCookie?.value) {
    try {
      const session = JSON.parse(sessionCookie.value);
      sessionAccessToken = session.accessToken as string ?? null;
    } catch {
      sessionAccessToken = null;
    }
  }

  return accessTokenFromHeader ?? cookieAccessToken ?? supabaseAccessToken ?? sessionAccessToken;
}

export async function GET(request: NextRequest) {
  const accessToken = resolveAccessToken(request);

  if (!accessToken) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const response = await fetch(`${BACKEND_URL}/avatar/status`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to fetch avatar status" },
        { status: response.status }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Failed to fetch avatar status:", error);
    return NextResponse.json(
      { error: "Failed to fetch avatar status" },
      { status: 500 }
    );
  }
}
