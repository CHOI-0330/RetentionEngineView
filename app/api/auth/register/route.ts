import { NextResponse, type NextRequest } from "next/server";

import { registerUserUseCase } from "../../../../src/application/entitle/authUseCases";
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

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as {
    email?: string;
    password?: string;
    displayName?: string;
    role?: string;
  };

  const result = registerUserUseCase({
    email: payload.email ?? "",
    password: payload.password ?? "",
    displayName: payload.displayName ?? "",
    role: (payload.role ?? "NEW_HIRE") as "NEW_HIRE" | "MENTOR" | "ADMIN",
  });

  if (result.kind === "failure") {
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  }

  try {
    const adminClient = getAdminClient();

    // 1. 既存ユーザー確認 (同じメールアドレス)
    const { data: existingUsers } = await adminClient
      .from("user")
      .select("user_id")
      .eq("email", result.value.email)
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      throw new HttpError(409, "このメールアドレスは既に登録されています。");
    }

    // 2. Supabase Auth でユーザー作成
    const { data, error } = await adminClient.auth.admin.createUser({
      email: result.value.email,
      password: result.value.password,
      email_confirm: true,
    });

    if (error) {
      // メールアドレス重複エラーの場合
      if (error.message?.includes("already") || error.message?.includes("exists")) {
        throw new HttpError(409, "このメールアドレスは既に登録されています。");
      }
      throw new HttpError(500, error.message ?? "Failed to create user.");
    }

    if (!data.user) {
      throw new HttpError(500, "Failed to create user.");
    }

    const userId = data.user.id;

    // 3. user テーブルに upsert (競合時は更新)
    const { error: upsertError } = await adminClient.from("user").upsert(
      {
        user_id: userId,
        display_name: result.value.displayName,
        email: result.value.email,
        role: result.value.role,
      },
      { onConflict: "user_id" }
    );

    if (upsertError) {
      throw new HttpError(500, upsertError.message ?? "Failed to persist user profile.");
    }

    return NextResponse.json({ data: { userId } });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = "nodejs";
