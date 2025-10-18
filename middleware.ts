import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = ["/student", "/mentor", "/api/entitle"];

export function middleware(request: NextRequest) {
  const requiresAuth = PROTECTED_PATHS.some((prefix) => request.nextUrl.pathname.startsWith(prefix));

  if (!requiresAuth) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("auth_access_token")?.value;
  if (!accessToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("redirected", "1");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/student/:path*", "/mentor/:path*", "/api/entitle/:path*"],
};
