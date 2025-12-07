import { NextResponse, type NextRequest } from "next/server";

import { createAdminSupabaseClient } from "../../../../../src/lib/supabaseClient";
import type { User } from "../../../../../src/domain/core";

class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

interface NewhireDto {
  userId: string;
  displayName: string;
  email: string;
  createdAt: string;
  isAssigned: boolean;
}

const getAdminClient = createAdminSupabaseClient;

const resolveAccessToken = (request: NextRequest): string | null => {
  const headerToken = request.headers.get("authorization");
  const accessTokenFromHeader = headerToken?.toLowerCase().startsWith("bearer ")
    ? headerToken.slice(7).trim()
    : null;
  const cookieAccessToken = request.cookies.get("auth_access_token")?.value ?? null;
  return accessTokenFromHeader ?? cookieAccessToken;
};

const requireMentorAuth = async (request: NextRequest) => {
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
  const role = (profile as { role: User["role"] }).role;
  if (role !== "MENTOR") {
    throw new HttpError(403, "Forbidden - Mentor role required");
  }
  return {
    accessToken,
    user: {
      userId,
      role,
      displayName: (profile as { display_name?: string }).display_name ?? "",
    },
  };
};

/**
 * GET /api/entitle/mentor/newhires
 *
 * メンターが割り当て可能な新入社員リスト照会
 * - NEW_HIREロールのユーザーリストを返却
 * - 現在メンターに既に割り当てられた社員はisAssigned: trueで表示
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireMentorAuth(request);
    const adminClient = getAdminClient();

    // 1. NEW_HIREロールの全ユーザー照会
    const { data: newhires, error: newhiresError } = await adminClient
      .from("user")
      .select("user_id, display_name, email, created_at")
      .eq("role", "NEW_HIRE")
      .order("display_name", { ascending: true });

    if (newhiresError) {
      throw new HttpError(500, newhiresError.message);
    }

    // 2. 現在メンターに割り当てられた新入社員リスト照会
    const { data: assignments, error: assignmentsError } = await adminClient
      .from("mentor_assignment")
      .select("newhire_id")
      .eq("mentor_id", user.userId);

    if (assignmentsError) {
      // テーブルが存在しない可能性があるためエラー無視
      console.warn("mentor_assignment query error:", assignmentsError.message);
    }

    const assignedNewhireIds = new Set(
      (assignments ?? []).map((a: { newhire_id: string }) => a.newhire_id)
    );

    // 3. DTOに変換
    const result: NewhireDto[] = (newhires ?? []).map((n: {
      user_id: string;
      display_name: string | null;
      email: string | null;
      created_at: string;
    }) => ({
      userId: n.user_id,
      displayName: n.display_name ?? "名前未設定",
      email: n.email ?? "",
      createdAt: n.created_at,
      isAssigned: assignedNewhireIds.has(n.user_id),
    }));

    return NextResponse.json({ data: result });
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
