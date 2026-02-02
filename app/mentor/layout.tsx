"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionGuard } from "../../src/interfaceAdapters/hooks/useSessionGuard";

export default function MentorLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { state, session } = useSessionGuard({ requiredRole: "MENTOR" });

  useEffect(() => {
    if (state === "unauthenticated") {
      router.replace("/");
    }
    if (state === "unauthorized") {
      router.replace(session?.role === "NEW_HIRE" ? "/student/dashboard" : "/");
    }
  }, [state, session, router]);

  if (state !== "authenticated") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
