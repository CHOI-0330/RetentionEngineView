import type { ReactNode } from "react";
export const dynamic = "force-dynamic";

// サーバーサイド認証リダイレクトを一時的に削除。クライアントでセッションを確認します。
export default async function MentorLayout({ children }: { children: ReactNode }) {
  return children;
}
