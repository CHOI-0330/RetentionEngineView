import { type NextRequest } from "next/server";

import { createAdminSupabaseClient } from "../../../../../../src/lib/supabaseClient";
import type { User } from "../../../../../../src/domain/core";

class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

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
    throw new HttpError(401, "Unauthorized");
  }
  try {
    const adminClient = getAdminClient();
    const { data, error } = await adminClient.auth.getUser(accessToken);
    if (error || !data.user) {
      throw error ?? new Error("Unauthorized");
    }
    const userId = data.user.id;
    const { data: profile, error: profileError } = await adminClient
      .from("user")
      .select("role, display_name")
      .eq("user_id", userId)
      .single();
    if (profileError || !profile) {
      throw profileError ?? new Error("User profile not found.");
    }
    const role = (profile as { role: User["role"] }).role;
    if (role !== "MENTOR" && role !== "ADMIN") {
      throw new HttpError(403, "Mentor role required.");
    }
    return { accessToken, user: { userId, role } };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    const message = error instanceof Error ? error.message : "Unauthorized";
    throw new HttpError(401, message);
  }
};

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await requireAuth(request);
    const body = (await request.json()) as {
      question?: string;
      conversationId?: string;
    };

    const question = (body.question ?? "").trim();
    if (!question) {
      return new Response(
        JSON.stringify({ error: "question is required.", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const conversationId = body.conversationId;
    if (!conversationId || typeof conversationId !== "string") {
      return new Response(
        JSON.stringify({ error: "conversationId is required.", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("[llm-mentor-generate-stream][POST]", {
      conversationId,
      questionLength: question.length,
    });

    const payload = {
      question,
      conversationId,
    };

    // バックエンドのSSEエンドポイントにプロキシ
    // NOTE: メンター用の専用エンドポイントが存在しないため、汎用のストリーミングエンドポイントを使用
    // 会話IDに基づいてバックエンドがメンター/学生を区別する
    const backendResponse = await fetch(
      `${BACKEND_BASE_URL}/llm/generate/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!backendResponse.ok) {
      const text = await backendResponse.text();
      console.error("[llm-mentor-generate-stream][error]", backendResponse.status, text, "(via /llm/generate/stream)");
      return new Response(
        JSON.stringify({
          error: "バックエンドサービスに接続できません",
          code: "SERVICE_UNAVAILABLE",
          retryable: true,
        }),
        { status: backendResponse.status, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!backendResponse.body) {
      return new Response(
        JSON.stringify({
          error: "ストリーミングレスポンスが空です",
          code: "INTERNAL_ERROR",
          retryable: true,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
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
    console.error("[llm-mentor-generate-stream][POST][error]", error);
    if (error instanceof HttpError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: error.status, headers: { "Content-Type": "application/json" } }
      );
    }
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
      }
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
