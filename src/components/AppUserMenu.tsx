"use client";

import Link from "next/link";
import { Button } from "../components/ui/button";
import { useSession } from "./SessionProvider";
import { getBrowserSupabaseClient } from "../lib/browserSupabaseClient";

export default function AppUserMenu() {
  const { session, isLoading, interactions } = useSession();
  const supabase = getBrowserSupabaseClient();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      // Ensure local Supabase auth state is cleared even if signOut fails.
      try {
        Object.keys(localStorage)
          .filter((key) => key.startsWith("sb-") && key.endsWith("-auth-token"))
          .forEach((key) => localStorage.removeItem(key));
      } catch {
        // ignore
      }
      try {
        document.cookie
          .split(";")
          .map((c) => c.trim())
          .filter((c) => c.startsWith("sb-") && c.includes("auth-token"))
          .forEach((cookie) => {
            const name = cookie.split("=")[0];
            document.cookie = `${name}=; path=/; max-age=0;`;
          });
      } catch {
        // ignore
      }
      // Force a session refetch and then redirect to the home page.
      await interactions.refetchSession();
      window.location.href = "/";
    }
  };

  if (isLoading) {
    return (
      <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap sm:whitespace-normal">
        認証確認中…
      </div>
    );
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

  const roleLabel =
    session.role === "MENTOR"
      ? "メンター"
      : session.role === "NEW_HIRE"
      ? "新入社員"
      : session.role;

  return (
    <div className="flex items-center gap-2 sm:gap-3 whitespace-nowrap sm:whitespace-normal">
      <span className="text-sm sm:text-base font-semibold text-foreground max-w-[42vw] sm:max-w-none overflow-hidden sm:overflow-visible whitespace-nowrap sm:whitespace-normal">
        {session.displayName ?? session.userId}
      </span>
      <span className="rounded bg-primary px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-primary-foreground">
        {roleLabel}
      </span>
      <Button asChild size="sm" variant="outline" className="h-8 px-2 sm:px-3">
        <Link href="/profile">プロフィール</Link>
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleLogout}
        className="h-8 px-2 sm:px-3"
      >
        ログアウト
      </Button>
    </div>
  );
}
