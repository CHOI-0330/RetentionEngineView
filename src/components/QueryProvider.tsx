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
            // 창 포커스 시 자동 리페치
            refetchOnWindowFocus: true,
            // 마운트 시 리페치 (stale 상태인 경우만)
            refetchOnMount: true,
            // 3회 재시도
            retry: 3,
            // 재시도 간 지수 백오프
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            // 뮤테이션 실패 시 1회 재시도
            retry: 1,
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
