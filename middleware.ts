import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Supabase JSはブラウザストレージ(LocalStorage)にセッションを保存するため
  // ミドルウェア段階では確認できません。認証はクライアント/サーバーハンドラーで処理します。
  return NextResponse.next();
}

export const config = {
  matcher: ["/student/:path*", "/mentor/:path*", "/api/entitle/:path*"],
};
