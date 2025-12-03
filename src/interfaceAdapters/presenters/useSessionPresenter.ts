"use client";

import { useState, useEffect, useCallback } from "react";

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
      const response = await fetch("/api/auth/session", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });
      const raw = await response.text();
      let json: any = null;
      if (raw) {
        try {
          json = JSON.parse(raw);
        } catch {
          json = null;
        }
      }
      if (!response.ok) {
        setSession(null);
        return;
      }
      const data = json?.data;
      if (!data) {
        setSession(null);
        return;
      }
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        userId: data.userId,
        role: data.role,
        displayName: data.displayName ?? "",
      });
    } catch {
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 초기 로드
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
