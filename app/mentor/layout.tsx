import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getAuthenticatedSession } from "../../src/server/authSession";

export const dynamic = "force-dynamic";

export default async function MentorLayout({ children }: { children: ReactNode }) {
  // 멘토 화면은 멘토 권한만 허용하므로 세션이 없거나 역할이 다르면 로그인 페이지로 보냅니다.
  const session = await getAuthenticatedSession();
  if (!session || session.role !== "MENTOR") {
    redirect("/?redirected=1");
  }

  return children;
}
