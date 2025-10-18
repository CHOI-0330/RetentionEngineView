import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getAuthenticatedSession } from "../../src/server/authSession";

export const dynamic = "force-dynamic";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  // 학생 화면은 NEW_HIRE 권한만 허용합니다. 토큰이 없거나 역할이 다르면 홈으로 돌려보냅니다.
  const session = await getAuthenticatedSession();
  if (!session || session.role !== "NEW_HIRE") {
    redirect("/?redirected=1");
  }

  return children;
}
