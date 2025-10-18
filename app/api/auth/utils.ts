import { NextResponse } from "next/server";

interface AuthCookiePayload {
  accessToken: string;
  refreshToken: string;
  userId: string;
  role: string;
}

const baseOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/" as const,
};

export const setAuthCookies = (response: NextResponse, payload: AuthCookiePayload) => {
  // Every cookie shares the same security flags so we centralise them here.
  response.cookies.set("auth_access_token", payload.accessToken, baseOptions);
  response.cookies.set("auth_refresh_token", payload.refreshToken, baseOptions);
  response.cookies.set("auth_user_id", payload.userId, baseOptions);
  response.cookies.set("auth_role", payload.role, { ...baseOptions, httpOnly: false });
};

export const clearAuthCookies = (response: NextResponse) => {
  response.cookies.delete("auth_access_token");
  response.cookies.delete("auth_refresh_token");
  response.cookies.delete("auth_user_id");
  response.cookies.delete("auth_role");
};
