"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "../components/ui/button";

type Role = "NEW_HIRE" | "MENTOR" | "ADMIN";

interface SessionData {
  accessToken: string;
  refreshToken: string;
  userId: string;
  role: Role;
  displayName?: string;
}

export default function AppUserMenu() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const supabaseEnabled = useMemo(
    () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    []
  );

  useEffect(() => {
    let cancelled = false;
    if (!supabaseEnabled) {
      setLoading(false);
      return;
    }
    const run = async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (!cancelled && res.ok) {
          const json = (await res.json()) as { data: SessionData };
          setSession(json.data);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [supabaseEnabled]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    } catch {
      // ignore
    } finally {
      window.location.href = "/";
    }
  };

  if (loading) {
    return <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap sm:whitespace-normal">認証確認中…</div>;
  }

  if (!session) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>未ログイン</span>
        <Button asChild size="sm" variant="outline">
          <Link href="/">ログイン</Link>
        </Button>
      </div>
    );
  }

  const roleLabel = session.role === "MENTOR" ? "メンター" : session.role === "NEW_HIRE" ? "新入社員" : session.role;

  return (
    <div className="flex items-center gap-2 sm:gap-3 whitespace-nowrap sm:whitespace-normal">
      <span className="text-sm sm:text-base font-semibold text-foreground max-w-[42vw] sm:max-w-none overflow-hidden sm:overflow-visible whitespace-nowrap sm:whitespace-normal">
        {session.displayName ?? session.userId}
      </span>
      <span className="rounded bg-primary px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-primary-foreground">
        {roleLabel}
      </span>
      <Button size="sm" variant="outline" onClick={handleLogout} className="h-8 px-2 sm:px-3">
        ログアウト
      </Button>
    </div>
  );
}
