import { NextResponse, type NextRequest } from "next/server";

import { SupabaseAuthGateway } from "../../../../src/interfaceAdapters/gateways/supabase/authGateway";

const authGateway = new SupabaseAuthGateway();

export async function GET(request: NextRequest) {
  // We rely on the httpOnly cookies that Next.js hands to this API route.
  const accessToken = request.cookies.get("auth_access_token")?.value;
  const refreshToken = request.cookies.get("auth_refresh_token")?.value;

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ data: null }, { status: 401 });
  }

  try {
    const { userId, role } = await authGateway.getUserFromAccessToken(accessToken);
    return NextResponse.json({
      data: {
        accessToken,
        refreshToken,
        userId,
        role,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
