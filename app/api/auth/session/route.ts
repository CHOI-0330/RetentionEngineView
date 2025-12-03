import { NextResponse, type NextRequest } from "next/server";

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

export async function GET(request: NextRequest) {
  // We rely on the httpOnly cookies that Next.js hands to this API route.
  const accessToken = request.cookies.get("auth_access_token")?.value;
  const refreshToken = request.cookies.get("auth_refresh_token")?.value;

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ data: null }, { status: 401 });
  }

  try {
    const adminClient = createAdminSupabaseClient();
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
    return NextResponse.json({
      data: {
        accessToken,
        refreshToken,
        userId,
        role: (profile as { role: string }).role,
        displayName: (profile as { display_name?: string }).display_name ?? "",
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export const runtime = "nodejs";
