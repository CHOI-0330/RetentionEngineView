"use client";

import { useState, useEffect, useCallback } from "react";

// This is a simplified session data structure based on AppUserMenu.tsx
interface SessionData {
  accessToken: string;
  refreshToken: string;
  userId: string;
  role: "NEW_HIRE" | "MENTOR" | "ADMIN";
  displayName?: string;
}

export interface SessionViewModel {
  session: SessionData | null;
  isLoading: boolean;
}

export interface SessionInteractions {
  refetchSession: () => Promise<void>;
}

export const useSessionPresenter = (): SessionViewModel & { interactions: SessionInteractions } => {
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as { data: SessionData };
        setSession(json.data);
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSession();
  }, [fetchSession]);

  return {
    session,
    isLoading,
    interactions: {
      refetchSession: fetchSession,
    },
  };
};
