import { type NextRequest, NextResponse } from "next/server";

import { createAdminSupabaseClient } from "../../../src/lib/supabaseClient";

const BACKEND_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

const getAdminClient = createAdminSupabaseClient;

const resolveAccessToken = (request: NextRequest): string | null => {
  const headerToken = request.headers.get("authorization");
  const accessTokenFromHeader = headerToken?.toLowerCase().startsWith("bearer ")
    ? headerToken.slice(7).trim()
    : null;
  const cookieAccessToken =
    request.cookies.get("auth_access_token")?.value ?? null;
  const supabaseCookie = request.cookies
    .getAll()
    .find((cookie) => cookie.name.includes("-auth-token"));
  let supabaseAccessToken: string | null = null;
  if (supabaseCookie) {
    try {
      const parsed = JSON.parse(supabaseCookie.value);
      supabaseAccessToken =
        typeof parsed?.access_token === "string" ? parsed.access_token : null;
    } catch {
      supabaseAccessToken = null;
    }
  }
  return accessTokenFromHeader ?? cookieAccessToken ?? supabaseAccessToken;
};

const requireAuth = async (request: NextRequest) => {
  const accessToken = resolveAccessToken(request);
  if (!accessToken) {
    throw new Error("Unauthorized");
  }
  const adminClient = getAdminClient();
  const { data, error } = await adminClient.auth.getUser(accessToken);
  if (error || !data.user) {
    throw error ?? new Error("Unauthorized");
  }
  return { accessToken };
};

/**
 * GET /api/question-cards — 質問カード一覧
 */
export async function GET(request: NextRequest) {
  try {
    const { accessToken } = await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const qs = searchParams.toString();
    const url = `${BACKEND_BASE_URL}/question-cards${qs ? `?${qs}` : ""}`;

    const backendResponse = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json(data, { status: backendResponse.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "予期しないエラーが発生しました";
    const isAuthError = message === "Unauthorized";
    return NextResponse.json(
      { error: isAuthError ? "認証が必要です" : message },
      { status: isAuthError ? 401 : 500 },
    );
  }
}

/**
 * POST /api/question-cards — 質問カード保存
 */
export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await requireAuth(request);
    const body = await request.json();

    const backendResponse = await fetch(
      `${BACKEND_BASE_URL}/question-cards`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      },
    );

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json(data, { status: backendResponse.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "予期しないエラーが発生しました";
    const isAuthError = message === "Unauthorized";
    return NextResponse.json(
      { error: isAuthError ? "認証が必要です" : message },
      { status: isAuthError ? 401 : 500 },
    );
  }
}
