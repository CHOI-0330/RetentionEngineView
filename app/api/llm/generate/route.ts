import { NextResponse, type NextRequest } from "next/server";

import { createAdminSupabaseClient } from "../../../../src/lib/supabaseClient";
import type { User } from "../../../../src/domain/core";

class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

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
const generateAnswer = (payload: { question: string; conversationId: string; modelId?: string; runtimeId?: string; searchSettings?: { enableFileSearch?: boolean; allowWebSearch?: boolean; executeWebSearch?: boolean } }, accessToken: string) =>
  callBackend<GenerateAnswerResponseDto>(
    "/llm/generate",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    accessToken
  );

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await requireAuth(request);
    const body = (await request.json()) as {
      question?: string;
      conversationId?: string;
      modelId?: string;
      runtimeId?: string;
      searchSettings?: {
        enableFileSearch?: boolean;
        allowWebSearch?: boolean;
        executeWebSearch?: boolean;
      };
    };
    const question = (body.question ?? "").trim();
    if (!question) {
      throw new HttpError(400, "question is required.");
    }
    const conversationId = body.conversationId;
    if (!conversationId || typeof conversationId !== "string") {
      throw new HttpError(400, "conversationId is required.");
    }

    logRequest("POST", { conversationId, questionLength: question.length });

    const payload = {
      question,
      conversationId,
      modelId: body.modelId,
      runtimeId: body.runtimeId,
      searchSettings: body.searchSettings,
    };
    const backendResponse = await generateAnswer(payload, accessToken);
    return NextResponse.json(backendResponse);
  } catch (error) {
    console.error("[llm-generate][POST][error]", error);
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

export const runtime = "nodejs";
