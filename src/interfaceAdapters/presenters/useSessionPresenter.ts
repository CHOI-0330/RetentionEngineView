"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchSession as fetchSessionApi,
  invalidateSessionCache,
  type SessionData,
} from "../../lib/api";

export type { SessionData };

export interface SessionViewModel {
  session: SessionData | null;
  isLoading: boolean;
}

export interface SessionInteractions {
  refetchSession: () => Promise<void>;
  /**
   * 세션 캐시를 무효화하고 다시 fetch (로그인/로그아웃 후 사용)
   */
  invalidateAndRefetch: () => Promise<void>;
}

export const useSessionPresenter = (): SessionViewModel & { interactions: SessionInteractions } => {
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);

  const loadSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchSessionApi();
      if (isMountedRef.current) {
        setSession(data);
      }
    } catch {
      if (isMountedRef.current) {
        setSession(null);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const invalidateAndRefetch = useCallback(async () => {
    invalidateSessionCache();
    await loadSession();
  }, [loadSession]);

  useEffect(() => {
    isMountedRef.current = true;
    void loadSession();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadSession]);

  return {
    session,
    isLoading,
    interactions: {
      refetchSession: loadSession,
      invalidateAndRefetch,
    },
  };
};
