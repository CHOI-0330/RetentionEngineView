import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { setAuthCookies } from "../utils";
import { createAdminSupabaseClient } from "../../../../src/lib/supabaseClient";

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

const fetchUserRole = async (userId: string): Promise<string> => {
  const adminClient = getAdminClient();
  const { data, error } = await adminClient.from("user").select("role").eq("user_id", userId).single();
  if (error || !data) {
    throw new HttpError(500, error?.message ?? "User profile not found.");
  }
  return (data as { role: string }).role;
};

export async function POST(request: NextRequest) {
  // リフレッシュトークンは再発行専用のため、サーバー側で直接読み取ります。
  const refreshToken = request.cookies.get("auth_refresh_token")?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const anonClient = getAnonClient();
    const { data, error } = await anonClient.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error || !data.session || !data.user) {
      throw error ?? new Error("Failed to refresh session.");
    }
    const role = await fetchUserRole(data.user.id);
    const payload = {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      userId: data.user.id,
      role,
    };
    const response = NextResponse.json({ data: payload });
    setAuthCookies(response, payload);
    return response;
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export const runtime = "nodejs";
