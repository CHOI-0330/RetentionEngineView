"use client";

"use client";

import { useState, useEffect, useCallback } from "react";
import { getBrowserSupabaseClient } from "../../lib/browserSupabaseClient";

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
  const supabase = getBrowserSupabaseClient();

  const toSessionData = (supabaseSession: any | null): SessionData | null => {
    if (!supabaseSession) return null;
    const user = supabaseSession.user;
    const role = (user?.user_metadata?.role as SessionData["role"]) ?? "NEW_HIRE";
    return {
      accessToken: supabaseSession.access_token,
      refreshToken: supabaseSession.refresh_token ?? "",
      userId: user.id,
      role,
      displayName: user.user_metadata?.displayName ?? user.email ?? "",
    };
  };

  const fetchSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      setSession(toSessionData(data.session));
    } catch {
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, [supabase.auth]);

  useEffect(() => {
    // 초기 로드
    void fetchSession();
    // 실시간 auth 상태 구독
    const { data: subscription } = supabase.auth.onAuthStateChange((_, newSession) => {
      setSession(toSessionData(newSession));
      setIsLoading(false);
    });
    return () => {
      subscription?.subscription?.unsubscribe();
    };
  }, [fetchSession, supabase.auth]);

  return {
    session,
    isLoading,
    interactions: {
      refetchSession: fetchSession,
    },
  };
};
