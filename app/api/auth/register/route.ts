import { NextResponse, type NextRequest } from "next/server";

import { SupabaseAuthGateway } from "../../../../src/interfaceAdapters/gateways/supabase/authGateway";
import { registerUserUseCase } from "../../../../src/application/entitle/authUseCases";

const authGateway = new SupabaseAuthGateway();

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
    const data = await authGateway.registerUser(result.value);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
