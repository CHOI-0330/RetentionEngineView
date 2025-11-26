import { NextResponse, type NextRequest } from "next/server";

import { SupabaseAuthGateway } from "../../../../src/interfaceAdapters/gateways/supabase/authGateway";

class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const BACKEND_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.LLM_BACKEND_BASE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

const authGateway = new SupabaseAuthGateway();

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

const requireMentorAuth = async (request: NextRequest) => {
  const accessToken = resolveAccessToken(request);
  if (!accessToken) {
    throw new HttpError(401, "Unauthorized");
  }
  try {
    const user = await authGateway.getUserFromAccessToken(accessToken);
    if (user.role !== "MENTOR") {
      throw new HttpError(403, "Forbidden");
    }
    return { accessToken, user };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Unauthorized";
    throw new HttpError(401, message);
  }
};

const logRequest = (label: string, payload: unknown) => {
  console.log(`[mentor-api][${label}]`, payload);
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

export async function GET(request: NextRequest) {
  try {
    const { accessToken, user } = await requireMentorAuth(request);
    logRequest("GET", { userId: user.userId });
    const conversations = await callBackend<{ conv_id: string; title: string; created_at: string; owner_name?: string }[]>(
      `/conversations/mentor?mentorId=${encodeURIComponent(user.userId)}`,
      undefined,
      accessToken
    );
    return NextResponse.json({ data: conversations });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { accessToken, user } = await requireMentorAuth(request);
    logRequest("POST", { userId: user.userId });
    const body = (await request.json()) as { newhireId?: string; newHireId?: string };
    const newhireId = (body.newhireId ?? body.newHireId ?? "").trim();
    if (!newhireId) {
      throw new HttpError(400, "newhireId is required.");
    }
    await callBackend(
      "/mentor-assignments",
      {
        method: "POST",
        body: JSON.stringify({
          mentorId: user.userId,
          newhireId,
        }),
      },
      accessToken
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[mentor-api][POST][error]", error);
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
