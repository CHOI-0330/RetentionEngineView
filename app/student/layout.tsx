import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getAuthenticatedSession } from "../../src/server/authSession";

export const dynamic = "force-dynamic";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  // 新入社員向け画面は NEW_HIRE 権限のみ許可するため、トークンまたは役割が一致しなければトップへリダイレクトします。
  const session = await getAuthenticatedSession();
  if (!session || session.role !== "NEW_HIRE") {
    redirect("/?redirected=1");
  }

  return children;
}
