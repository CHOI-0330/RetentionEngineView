/**
 * Conversations Query Hook (React Query)
 *
 * 기존 useStudentDashboardPresenter의 데이터 페칭 로직을 대체
 * 290줄 → ~50줄로 단순화
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import type { ConversationListItem } from "../../../application/entitle/ports/StudentDashboardPort";
import { createStudentDashboardService } from "../../../application/entitle/factories/StudentDashboardFactory";

// ===== Query Keys =====
export const conversationKeys = {
  all: ["conversations"] as const,
  list: () => [...conversationKeys.all, "list"] as const,
  detail: (convId: string) => [...conversationKeys.all, "detail", convId] as const,
};

// ===== Hook Options =====
interface UseConversationsQueryOptions {
  accessToken?: string;
  enabled?: boolean;
}

// ===== Query Hook =====
export function useConversationsQuery(options: UseConversationsQueryOptions) {
  const { accessToken, enabled = true } = options;

  const service = useMemo(
    () => createStudentDashboardService({ accessToken }),
    [accessToken]
  );

  return useQuery({
    queryKey: conversationKeys.list(),
    queryFn: async (): Promise<ConversationListItem[]> => {
      const result = await service.fetchConversations();
      if (result.kind === "failure") {
        throw new Error(result.error.message);
      }
      return result.value;
    },
    enabled: enabled && !!accessToken,
    staleTime: 30 * 1000, // 30초간 신선 유지
    gcTime: 5 * 60 * 1000, // 5분간 캐시 유지
  });
}

// ===== Mutation Hooks =====

interface UseCreateConversationOptions {
  accessToken?: string;
  onSuccess?: () => void;
}

export function useCreateConversation(options: UseCreateConversationOptions) {
  const { accessToken, onSuccess } = options;
  const queryClient = useQueryClient();

  const service = useMemo(
    () => createStudentDashboardService({ accessToken }),
    [accessToken]
  );

  return useMutation({
    mutationFn: async (title: string) => {
      const result = await service.createConversation(title);
      if (result.kind === "failure") {
        throw new Error(result.error.message);
      }
      return result.value;
    },
    onSuccess: () => {
      // 목록 갱신
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() });
      onSuccess?.();
    },
  });
}

interface UseDeleteConversationOptions {
  accessToken?: string;
  onSuccess?: () => void;
}

export function useDeleteConversation(options: UseDeleteConversationOptions) {
  const { accessToken, onSuccess } = options;
  const queryClient = useQueryClient();

  const service = useMemo(
    () => createStudentDashboardService({ accessToken }),
    [accessToken]
  );

  return useMutation({
    mutationFn: async (convId: string) => {
      const result = await service.deleteConversation(convId);
      if (result.kind === "failure") {
        throw new Error(result.error.message);
      }
    },
    // Optimistic Update: UI 즉시 반영
    onMutate: async (convId: string) => {
      // 진행 중인 쿼리 취소
      await queryClient.cancelQueries({ queryKey: conversationKeys.list() });

      // 이전 데이터 백업
      const previousConversations = queryClient.getQueryData<ConversationListItem[]>(
        conversationKeys.list()
      );

      // Optimistic update: 삭제 항목 즉시 제거
      if (previousConversations) {
        queryClient.setQueryData<ConversationListItem[]>(
          conversationKeys.list(),
          previousConversations.filter((c) => c.convId !== convId)
        );
      }

      return { previousConversations };
    },
    onError: (_err, _convId, context) => {
      // 에러 시 롤백
      if (context?.previousConversations) {
        queryClient.setQueryData(conversationKeys.list(), context.previousConversations);
      }
    },
    onSettled: () => {
      // 완료 후 목록 갱신
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() });
      onSuccess?.();
    },
  });
}
