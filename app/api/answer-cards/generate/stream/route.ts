import { type NextRequest } from "next/server";

import { createAdminSupabaseClient } from "../../../../../src/lib/supabaseClient";

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
 * POST /api/answer-cards/generate/stream — AI対話による回答作成（ストリーミング）
 */
export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await requireAuth(request);
    const body = await request.json();

    if (!body.mentorInput || !Array.isArray(body.chatHistory)) {
      return new Response(
        JSON.stringify({
          error: "mentorInput and chatHistory are required.",
          code: "VALIDATION_ERROR",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // バックエンドのSSEエンドポイントにプロキシ
    const backendResponse = await fetch(
      `${BACKEND_BASE_URL}/answer-cards/generate/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      },
    );

    if (!backendResponse.ok) {
      const text = await backendResponse.text();
      console.error(
        "[answer-cards-generate-stream][error]",
        backendResponse.status,
        text,
      );
      return new Response(
        JSON.stringify({
          error: "バックエンドサービスに接続できません",
          code: "SERVICE_UNAVAILABLE",
          retryable: true,
        }),
        {
          status: backendResponse.status,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (!backendResponse.body) {
      return new Response(
        JSON.stringify({
          error: "ストリーミングレスポンスが空です",
          code: "INTERNAL_ERROR",
          retryable: true,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // SSEストリームをそのままパイプスルー
    return new Response(backendResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("[answer-cards-generate-stream][POST][error]", error);
    const message =
      error instanceof Error ? error.message : "予期しないエラーが発生しました";
    const isAuthError = message === "Unauthorized";
    return new Response(
      JSON.stringify({
        error: isAuthError ? "認証が必要です" : message,
        code: isAuthError ? "AUTH_ERROR" : "INTERNAL_ERROR",
        retryable: !isAuthError,
      }),
      {
        status: isAuthError ? 401 : 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
