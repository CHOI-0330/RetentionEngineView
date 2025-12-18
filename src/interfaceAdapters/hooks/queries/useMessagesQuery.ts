/**
 * Messages Query Hook (React Query)
 *
 * 채팅 메시지 조회를 위한 React Query hooks
 * Gateway를 직접 사용하여 단순화
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import type { Message } from "../../../domain/core";
import { ConversationGateway } from "../../gateways/api/ConversationGateway";
import { MessageGateway } from "../../gateways/api/MessageGateway";

// ===== Query Keys =====
export const messageKeys = {
  all: ["messages"] as const,
  list: (convId: string) => [...messageKeys.all, "list", convId] as const,
};

export const bootstrapKeys = {
  all: ["bootstrap"] as const,
  detail: (convId?: string) => [...bootstrapKeys.all, convId ?? "dashboard"] as const,
};

// ===== Hook Options =====
interface UseMessagesQueryOptions {
  convId: string;
  accessToken?: string;
  enabled?: boolean;
}

// ===== Messages List Query =====
export function useMessagesQuery(options: UseMessagesQueryOptions) {
  const { convId, accessToken, enabled = true } = options;

  const gateway = useMemo(
    () => new MessageGateway({ accessToken }),
    [accessToken]
  );

  return useQuery({
    queryKey: messageKeys.list(convId),
    queryFn: async () => {
      const result = await gateway.listConversationMessages({ convId });
      return result.items;
    },
    enabled: enabled && !!accessToken && !!convId,
    staleTime: 0, // 메시지는 항상 최신 유지
    refetchOnWindowFocus: true,
  });
}

// ===== Send Message Mutation =====
interface UseSendMessageOptions {
  convId: string;
  accessToken?: string;
  authorId: string;
  onSuccess?: (message: Message) => void;
}

export function useSendMessage(options: UseSendMessageOptions) {
  const { convId, accessToken, authorId, onSuccess } = options;
  const queryClient = useQueryClient();

  const gateway = useMemo(
    () => new MessageGateway({ accessToken }),
    [accessToken]
  );

  return useMutation({
    mutationFn: async (content: string) => {
      return gateway.createUserMessage({ convId, authorId, content });
    },
    // Optimistic Update: 메시지 즉시 표시
    onMutate: async (content: string) => {
      await queryClient.cancelQueries({ queryKey: messageKeys.list(convId) });

      // 임시 메시지 생성
      const optimisticMessage: Message = {
        msgId: `temp-${Date.now()}`,
        convId,
        role: "NEW_HIRE",
        content,
        status: "DRAFT",
        createdAt: new Date().toISOString(),
      };

      // 이전 데이터에 임시 메시지 추가
      const previousMessages = queryClient.getQueryData<Message[]>(messageKeys.list(convId));

      if (previousMessages) {
        queryClient.setQueryData<Message[]>(
          messageKeys.list(convId),
          [...previousMessages, optimisticMessage]
        );
      }

      return { previousMessages };
    },
    onError: (_err, _content, context) => {
      // 에러 시 롤백
      if (context?.previousMessages) {
        queryClient.setQueryData(messageKeys.list(convId), context.previousMessages);
      }
    },
    onSuccess: (message) => {
      onSuccess?.(message);
    },
    onSettled: () => {
      // 완료 후 메시지 목록 갱신
      queryClient.invalidateQueries({ queryKey: messageKeys.list(convId) });
    },
  });
}

// ===== Bootstrap Query (초기 데이터 로드) =====
interface UseBootstrapQueryOptions {
  convId?: string;
  accessToken?: string;
  enabled?: boolean;
}

export function useBootstrapQuery(options: UseBootstrapQueryOptions) {
  const { convId, accessToken, enabled = true } = options;

  const gateway = useMemo(
    () => new ConversationGateway({ accessToken }),
    [accessToken]
  );

  return useQuery({
    queryKey: bootstrapKeys.detail(convId),
    queryFn: async () => {
      return gateway.fetchBootstrap(convId);
    },
    enabled: enabled && !!accessToken,
    staleTime: convId ? 0 : 30 * 1000, // 대화 상세는 항상 신선, 대시보드는 30초
    gcTime: 5 * 60 * 1000,
  });
}
