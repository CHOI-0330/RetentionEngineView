import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { loginUserUseCase } from "../../../../src/application/entitle/authUseCases";
import { createAdminSupabaseClient } from "../../../../src/lib/supabaseClient";
import { setAuthCookies } from "../utils";

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

const getAnonClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new HttpError(500, "Supabase anon client is not configured.");
  }
  return createClient(url, anonKey);
};

const fetchUserProfile = async (userId: string): Promise<{ role: string; displayName: string }> => {
  const adminClient = getAdminClient();
  const { data, error } = await adminClient
    .from("user")
    .select("role, display_name")
    .eq("user_id", userId)
    .single();
  if (error || !data) {
    throw new HttpError(500, error?.message ?? "User profile not found.");
  }
  const profile = data as { role: string; display_name?: string };
  return {
    role: profile.role,
    displayName: profile.display_name ?? "",
  };
};

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as {
    email?: string;
    password?: string;
  };

  const result = loginUserUseCase({
    email: payload.email ?? "",
    password: payload.password ?? "",
  });

  if (result.kind === "failure") {
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  }

  try {
    const anonClient = getAnonClient();
    const { data, error } = await anonClient.auth.signInWithPassword({
      email: result.value.email,
      password: result.value.password,
    });
    if (error || !data.user || !data.session) {
      throw error ?? new Error("Failed to sign in.");
    }
    const profile = await fetchUserProfile(data.user.id);
    const response = NextResponse.json({
      data: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        userId: data.user.id,
        role: profile.role,
        displayName: profile.displayName,
      },
    });
    // Keep cookie handling consistent with logout / refresh so we never forget an option.
    setAuthCookies(response, {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      userId: data.user.id,
      role: profile.role,
      displayName: profile.displayName,
    });
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
