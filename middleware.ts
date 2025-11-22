import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Supabase JS는 브라우저 스토리지(LocalStorage)에 세션을 보관하므로
  // 미들웨어 단계에서는 확인할 수 없습니다. 인증은 클라이언트/서버 핸들러에서 처리합니다.
  return NextResponse.next();
}

export const config = {
  matcher: ["/student/:path*", "/mentor/:path*", "/api/entitle/:path*"],
};
