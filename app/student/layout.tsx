import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

// 서버 사이드 인증 리다이렉트를 임시로 제거합니다. 클라이언트에서 세션을 확인합니다.
export default async function StudentLayout({ children }: { children: ReactNode }) {
  return children;
}
