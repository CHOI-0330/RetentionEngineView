/**
 * Messages Query Hook (React Query)
 *
 * 채팅 메시지 조회를 위한 React Query hooks
 * Gateway를 직접 사용하여 단순화
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useCallback } from "react";

import type { Message } from "../../../domain/core";
import { ConversationGateway } from "../../gateways/api/ConversationGateway";
import { MessageGateway } from "../../gateways/api/MessageGateway";

// ===== Query Keys =====
export const messageKeys = {
  all: ["messages"] as const,
  list: (convId: string) => [...messageKeys.all, "list", convId] as const,
  infinite: (convId: string) => [...messageKeys.all, "infinite", convId] as const,
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
    // 🔥 FIX: 30초 캐시 (429 Rate Limit 방지)
    staleTime: 30 * 1000,
    // 🔥 FIX: 탭 전환 시 refetch 비활성화
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

// ===== Infinite Messages Query (無限スクロール用) =====
interface UseInfiniteMessagesQueryOptions {
  convId: string;
  accessToken?: string;
  enabled?: boolean;
  pageSize?: number;
  initialMessages?: Message[]; // Bootstrap時の初期データ
}

/**
 * 無限スクロール用メッセージ取得フック
 * チャットの上方向スクロールで過去メッセージをロード
 */
export function useInfiniteMessagesQuery(options: UseInfiniteMessagesQueryOptions) {
  const { convId, accessToken, enabled = true, pageSize = 30, initialMessages } = options;

  const gateway = useMemo(
    () => new MessageGateway({ accessToken }),
    [accessToken]
  );

  const query = useInfiniteQuery({
    queryKey: messageKeys.infinite(convId),
    queryFn: async ({ pageParam }) => {
      const result = await gateway.listConversationMessagesPaginated({
        convId,
        cursor: pageParam as string | undefined,
        limit: pageSize,
      });
      return result;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      // hasMoreがtrueかつnextCursorが存在する場合、カーソルを返す（過去方向への追加読み込み）
      // nextCursorは最も古いメッセージのタイムスタンプを指す
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
    // 初期データがある場合は使用（Bootstrap時）
    // 空配列の場合はinitialDataを設定しない
    initialData: initialMessages && initialMessages.length > 0
      ? {
          pages: [{
            items: initialMessages,
            hasMore: initialMessages.length >= pageSize,
            // ページサイズ以上ある場合のみnextCursorを設定（最も古いメッセージのタイムスタンプ）
            nextCursor: initialMessages.length >= pageSize ? initialMessages[0]?.createdAt : undefined
          }],
          pageParams: [undefined],
        }
      : undefined,
    enabled: enabled && !!accessToken && !!convId,
    // 🔥 FIX: 5분 캐시 (과거 메시지는 변경 안 됨)
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // 全メッセージをフラット化（時系列順）
  const allMessages = useMemo(() => {
    if (!query.data?.pages) return [];
    // pagesは逆順（最新ページが最後）なので、結合後にソート
    const messages = query.data.pages.flatMap((page) => page.items);
    // created_at順でソート（古い順）
    return messages.sort((a, b) => {
      const timeCompare = a.createdAt.localeCompare(b.createdAt);
      if (timeCompare !== 0) return timeCompare;
      return a.msgId.localeCompare(b.msgId);
    });
  }, [query.data?.pages]);

  // 過去メッセージをロード（上方向スクロール時）
  const loadOlderMessages = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      return query.fetchNextPage();
    }
  }, [query]);

  return {
    ...query,
    messages: allMessages,
    loadOlderMessages,
    hasOlderMessages: query.hasNextPage,
    isLoadingOlder: query.isFetchingNextPage,
  };
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
    // Optimistic Update: メッセージを即座に表示
    onMutate: async (content: string) => {
      // 両方のキャッシュをキャンセル
      await queryClient.cancelQueries({ queryKey: messageKeys.list(convId) });
      await queryClient.cancelQueries({ queryKey: messageKeys.infinite(convId) });

      // 一時メッセージを生成
      const optimisticMessage: Message = {
        msgId: `temp-${Date.now()}`,
        convId,
        role: "NEW_HIRE",
        content,
        status: "DRAFT",
        createdAt: new Date().toISOString(),
      };

      // list キャッシュを更新
      const previousMessages = queryClient.getQueryData<Message[]>(messageKeys.list(convId));
      if (previousMessages) {
        queryClient.setQueryData<Message[]>(
          messageKeys.list(convId),
          [...previousMessages, optimisticMessage]
        );
      }

      // infinite キャッシュも更新
      type InfiniteData = {
        pages: Array<{ items: Message[]; hasMore: boolean; nextCursor?: string }>;
        pageParams: Array<string | undefined>;
      };
      const previousInfinite = queryClient.getQueryData<InfiniteData>(messageKeys.infinite(convId));
      if (previousInfinite && previousInfinite.pages.length > 0) {
        const newPages = [...previousInfinite.pages];
        // 最後のページ（最新メッセージを含む）に追加
        const lastPageIndex = newPages.length - 1;
        newPages[lastPageIndex] = {
          ...newPages[lastPageIndex],
          items: [...newPages[lastPageIndex].items, optimisticMessage],
        };
        queryClient.setQueryData<InfiniteData>(messageKeys.infinite(convId), {
          ...previousInfinite,
          pages: newPages,
        });
      }

      return { previousMessages, previousInfinite };
    },
    onError: (_err, _content, context) => {
      // エラー時にロールバック
      if (context?.previousMessages) {
        queryClient.setQueryData(messageKeys.list(convId), context.previousMessages);
      }
      if (context?.previousInfinite) {
        queryClient.setQueryData(messageKeys.infinite(convId), context.previousInfinite);
      }
    },
    onSuccess: (message) => {
      onSuccess?.(message);
    },
    onSettled: () => {
      // 🔥 FIX: refetchType: 'none'으로 즉시 refetch 방지 (Optimistic Update가 충분)
      // stale 마킹만 하고, 다음 자연스러운 fetch 시점에 갱신
      queryClient.invalidateQueries({
        queryKey: messageKeys.list(convId),
        refetchType: 'none',
      });
      queryClient.invalidateQueries({
        queryKey: messageKeys.infinite(convId),
        refetchType: 'none',
      });
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
    // 🔥 FIX: 1분 캐시 (Bootstrap 데이터는 자주 변경 안 됨)
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
