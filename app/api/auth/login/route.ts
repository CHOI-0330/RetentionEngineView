import { NextResponse, type NextRequest } from "next/server";

import { SupabaseAuthGateway } from "../../../../src/interfaceAdapters/gateways/supabase/authGateway";
import { loginUserUseCase } from "../../../../src/application/entitle/authUseCases";
import { setAuthCookies } from "../utils";

const authGateway = new SupabaseAuthGateway();

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
    const data = await authGateway.loginUser(result.value);
    const response = NextResponse.json({ data });
    // Keep cookie handling consistent with logout / refresh so we never forget an option.
    setAuthCookies(response, data);
    return response;
  } catch (error) {
    let message = "Unexpected error";
    if (error instanceof Error) {
      message = error.message;
    } else if (error && typeof error === "object" && "message" in error) {
      const extracted = (error as { message?: unknown }).message;
      if (typeof extracted === "string" && extracted.length > 0) {
        message = extracted;
      }
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
