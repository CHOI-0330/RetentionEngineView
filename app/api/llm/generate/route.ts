import { NextResponse, type NextRequest } from "next/server";

import { createAdminSupabaseClient } from "../../../../src/lib/supabaseClient";
import type { User } from "../../../../src/domain/core";

type ErrorCode =
  | "AUTH_ERROR"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR";

class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: ErrorCode
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * エラーをカテゴリ分類してクライアントに返却
 */
const categorizeError = (error: unknown): { code: ErrorCode; message: string; status: number; retryable: boolean } => {
  if (error instanceof HttpError) {
    // 認証エラー
    if (error.status === 401) {
      return { code: "AUTH_ERROR", message: "認証が必要です", status: 401, retryable: false };
    }
    // Rate Limit
    if (error.status === 429) {
      return { code: "RATE_LIMITED", message: "リクエスト制限を超えました。しばらく待ってから再試行してください", status: 429, retryable: true };
    }
    // バリデーションエラー
    if (error.status === 400) {
      return { code: "VALIDATION_ERROR", message: error.message, status: 400, retryable: false };
    }
    // サービス一時停止
    if (error.status === 503) {
      return { code: "SERVICE_UNAVAILABLE", message: "サービスが一時的に利用できません", status: 503, retryable: true };
    }
  }

  // タイムアウト判定
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("timeout") || msg.includes("timed out") || msg.includes("aborted")) {
      return { code: "TIMEOUT", message: "リクエストがタイムアウトしました。再試行してください", status: 504, retryable: true };
    }
    if (msg.includes("econnrefused") || msg.includes("fetch failed")) {
      return { code: "SERVICE_UNAVAILABLE", message: "バックエンドサービスに接続できません", status: 503, retryable: true };
    }
  }

  // その他内部エラー
  return { code: "INTERNAL_ERROR", message: "予期しないエラーが発生しました", status: 500, retryable: false };
};

// DTOs for backend REST responses
type GenerateAnswerResponseDto = {
  answer?: string;
  data?: {
    answer?: string;
  };
};

const BACKEND_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const getAdminClient = createAdminSupabaseClient;

const resolveAccessToken = (request: NextRequest): string | null => {
  const headerToken = request.headers.get("authorization");
  const accessTokenFromHeader = headerToken?.toLowerCase().startsWith("bearer ")
    ? headerToken.slice(7).trim()
    : null;
  const cookieAccessToken = request.cookies.get("auth_access_token")?.value ?? null;
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
  return accessTokenFromHeader ?? cookieAccessToken ?? supabaseAccessToken;
};

const logRequest = (label: string, payload: unknown) => {
  console.log(`[llm-generate][${label}]`, payload);
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
    return { accessToken, user: { userId, role, displayName: (profile as { display_name?: string }).display_name ?? "" } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    throw new HttpError(401, message);
  }
};

const callBackend = async <T>(path: string, init?: RequestInit, accessToken?: string): Promise<T> => {
  const response = await fetch(`${BACKEND_BASE_URL}/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new HttpError(response.status, text || "Backend request failed.");
  }
  return (await response.json()) as T;
};

// Align with backend controller intent.
const generateAnswer = (payload: { question: string; conversationId: string; modelId?: string; runtimeId?: string; requireWebSearch?: boolean }, accessToken: string) =>
  callBackend<GenerateAnswerResponseDto>(
    "/llm/generate",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    accessToken
  );

// リクエストの重複チェック用の簡易的なメモリキャッシュ
const recentRequests = new Map<string, number>();
const REQUEST_DUPLICATE_WINDOW = 1000; // 1秒以内の同一リクエストを重複とみなす

// 古いエントリを定期的にクリーンアップ
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of recentRequests.entries()) {
    if (now - timestamp > REQUEST_DUPLICATE_WINDOW * 2) {
      recentRequests.delete(key);
    }
  }
}, 10000); // 10秒ごとにクリーンアップ

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await requireAuth(request);
    const body = (await request.json()) as {
      question?: string;
      conversationId?: string;
      modelId?: string;
      runtimeId?: string;
      requireWebSearch?: boolean;
      requestId?: string; // フロントエンドから送られるユニークID
    };
    const question = (body.question ?? "").trim();
    if (!question) {
      throw new HttpError(400, "question is required.");
    }
    const conversationId = body.conversationId;
    if (!conversationId || typeof conversationId !== "string") {
      throw new HttpError(400, "conversationId is required.");
    }

    // 重複リクエストチェック
    const requestKey = `${conversationId}:${question}:${body.requireWebSearch}`;
    const lastRequestTime = recentRequests.get(requestKey);
    const now = Date.now();
    
    if (lastRequestTime && (now - lastRequestTime) < REQUEST_DUPLICATE_WINDOW) {
      console.warn("[llm-generate][DUPLICATE] Duplicate request detected, ignoring", { requestKey });
      throw new HttpError(429, "Duplicate request detected. Please wait before sending again.");
    }
    
    // リクエストを記録
    recentRequests.set(requestKey, now);

    logRequest("POST", { conversationId, questionLength: question.length, requireWebSearch: body.requireWebSearch });

    const payload = {
      question,
      conversationId,
      modelId: body.modelId,
      runtimeId: body.runtimeId,
      requireWebSearch: body.requireWebSearch,
    };
    const backendResponse = await generateAnswer(payload, accessToken);
    return NextResponse.json(backendResponse);
  } catch (error) {
    console.error("[llm-generate][POST][error]", error);
    const categorized = categorizeError(error);
    return NextResponse.json(
      {
        error: categorized.message,
        code: categorized.code,
        retryable: categorized.retryable,
      },
      { status: categorized.status }
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
