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
type MentorConversationDto = {
  conv_id: string;
  title: string;
  created_at: string;
  owner_name?: string;
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

const requireMentorAuth = async (request: NextRequest) => {
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
    if (role !== "MENTOR") {
      throw new HttpError(403, "Forbidden");
    }
    return {
      accessToken,
      user: {
        userId,
        role,
        displayName: (profile as { display_name?: string }).display_name ?? "",
      },
    };
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

// Match NestJS controller method names for clarity.
const getMentorConversationList = (mentorId: string, accessToken: string) =>
  callBackend<MentorConversationDto[]>(
    `/conversations/mentor?mentorId=${encodeURIComponent(mentorId)}`,
    undefined,
    accessToken
  );

const createMentorAssignment = (input: { mentorId: string; newhireId: string }, accessToken: string) =>
  callBackend(
    "/mentor-assignments",
    {
      method: "POST",
      body: JSON.stringify({
        mentorId: input.mentorId,
        newhireId: input.newhireId,
      }),
    },
    accessToken
  );

export async function GET(request: NextRequest) {
  try {
    const { accessToken, user } = await requireMentorAuth(request);
    logRequest("GET", { userId: user.userId });
    const conversations = await getMentorConversationList(user.userId, accessToken);
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
    await createMentorAssignment({ mentorId: user.userId, newhireId }, accessToken);
    return NextResponse.json({ data: { ok: true } });
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
