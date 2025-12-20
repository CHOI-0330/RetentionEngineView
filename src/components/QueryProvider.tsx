"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";

interface QueryProviderProps {
  children: ReactNode;
}

export default function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 5분 동안 데이터를 신선하게 유지
            staleTime: 5 * 60 * 1000,
            // 30분 후 캐시에서 제거
            gcTime: 30 * 60 * 1000,
            // 🔥 FIX: 탭 전환 시 refetch 비활성화 (429 Rate Limit 방지)
            refetchOnWindowFocus: false,
            // 🔥 FIX: stale 상태일 때만 refetch (불필요한 API 호출 방지)
            refetchOnMount: "always",
            // 🔥 FIX: 429 에러 시 재시도 안 함
            retry: (failureCount, error) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const status = (error as any)?.response?.status ?? (error as any)?.status;
              if (status === 429) return false; // Rate Limit 에러는 재시도 안 함
              return failureCount < 2; // 다른 에러는 2회까지 재시도
            },
            // 재시도 간 지수 백오프 (더 긴 간격)
            retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 60000),
          },
          mutations: {
            // 🔥 FIX: 429 에러 시 mutation도 재시도 안 함
            retry: (failureCount, error) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const status = (error as any)?.response?.status ?? (error as any)?.status;
              if (status === 429) return false;
              return failureCount < 1;
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 개발 환경에서만 DevTools 표시 */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      )}
    </QueryClientProvider>
  );
}
