import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getAuthenticatedSession } from "../../src/server/authSession";

export const dynamic = "force-dynamic";

export default async function MentorLayout({ children }: { children: ReactNode }) {
  // メンター用画面は MENTOR 権限のみ許可するため、セッションがない・ロールが異なる場合はログインページへリダイレクトします。
  const session = await getAuthenticatedSession();
  if (!session || session.role !== "MENTOR") {
    redirect("/?redirected=1");
  }

  return children;
}
