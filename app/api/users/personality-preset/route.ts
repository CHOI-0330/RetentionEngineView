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
type GetUserPresetResponseDto = {
  presetId: string | null;
};

type UpdateUserPresetResponseDto = {
  message?: string;
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

const requireAuth = async (request: NextRequest) => {
  const accessToken = resolveAccessToken(request);
  if (!accessToken) {
    throw new HttpError(401, "Unauthorized");
  }
  const adminClient = getAdminClient();
  const { data, error } = await adminClient.auth.getUser(accessToken);
  if (error || !data.user) {
    throw new HttpError(401, error?.message ?? "Unauthorized");
  }
  const userId = data.user.id;
  const { data: profile, error: profileError } = await adminClient
    .from("user")
    .select("role, display_name")
    .eq("user_id", userId)
    .single();
  if (profileError || !profile) {
    throw new HttpError(401, profileError?.message ?? "User profile not found.");
  }
  return {
    accessToken,
    user: {
      userId,
      role: (profile as { role: User["role"] }).role,
      displayName: (profile as { display_name?: string }).display_name ?? "",
    },
  };
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
  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(500, "Invalid JSON response from backend");
  }
};

const getUserPreset = (accessToken: string) =>
  callBackend<GetUserPresetResponseDto>(
    "/users/personality-preset",
    { method: "GET" },
    accessToken
  );

const updateUserPreset = (presetId: string | null, accessToken: string) =>
  callBackend<UpdateUserPresetResponseDto>(
    "/users/personality-preset",
    {
      method: "PUT",
      body: JSON.stringify({ presetId }),
    },
    accessToken
  );

export async function GET(request: NextRequest) {
  try {
    const { accessToken } = await requireAuth(request);
    const response = await getUserPreset(accessToken);
    return NextResponse.json({ data: { presetId: response?.presetId ?? null } });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { accessToken, user } = await requireAuth(request);

    // Only NEW_HIRE can update personality preset
    if (user.role !== "NEW_HIRE") {
      throw new HttpError(403, "Only NEW_HIRE users can update personality preset.");
    }

    const body = (await request.json()) as { presetId?: string | null };
    const presetId = body.presetId ?? null;

    await updateUserPreset(presetId, accessToken);
    return NextResponse.json({ data: { message: "Personality preset updated successfully" } });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
