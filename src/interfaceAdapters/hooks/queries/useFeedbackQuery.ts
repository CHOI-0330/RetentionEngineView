/**
 * Feedback Query Hook (React Query)
 *
 * フィードバック操作のためのReact Queryフック
 * Gateway直接使用でシンプル化
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import type { Feedback, FeedbackAuthorRole } from "../../../domain/core";
import { FeedbackGateway } from "../../gateways/api/FeedbackGateway";
import { messageKeys } from "./useMessagesQuery";

// ===== Query Keys =====
export const feedbackKeys = {
  all: ["feedbacks"] as const,
  list: (msgId: string) => [...feedbackKeys.all, "list", msgId] as const,
  detail: (fbId: string) => [...feedbackKeys.all, "detail", fbId] as const,
};

// ===== Hook Options =====
interface UseFeedbacksQueryOptions {
  msgId: string;
  accessToken?: string;
  enabled?: boolean;
  cursor?: string;
  limit?: number;
}

interface UseCreateFeedbackOptions {
  accessToken?: string;
  authorId: string;
  authorRole: FeedbackAuthorRole;
  onSuccess?: (feedback: Feedback) => void;
  onError?: (error: Error) => void;
}

interface UseUpdateFeedbackOptions {
  accessToken?: string;
  onSuccess?: (feedback: Feedback) => void;
  onError?: (error: Error) => void;
}

// ===== Response Types =====
interface FeedbacksListResponse {
  items: Feedback[];
  nextCursor?: string;
  authorNames?: Record<string, string>;
}

// ===== Feedbacks List Query =====
/**
 * メッセージに対するフィードバック一覧を取得
 *
 * @param options - クエリオプション
 * @returns React Query result
 */
export function useFeedbacksQuery(options: UseFeedbacksQueryOptions) {
  const { msgId, accessToken, enabled = true, cursor, limit } = options;

  const gateway = useMemo(
    () => new FeedbackGateway({ accessToken }),
    [accessToken]
  );

  return useQuery({
    queryKey: feedbackKeys.list(msgId),
    queryFn: async (): Promise<FeedbacksListResponse> => {
      return gateway.listFeedbacks({ msgId, cursor, limit });
    },
    enabled: enabled && !!accessToken && !!msgId,
    staleTime: 30 * 1000, // 30秒間キャッシュ
    gcTime: 5 * 60 * 1000, // 5分間保持
  });
}

// ===== Create Feedback Mutation =====
/**
 * 新規フィードバックを作成
 *
 * Optimistic Update: 即座にUIに反映し、エラー時はロールバック
 */
export function useCreateFeedback(options: UseCreateFeedbackOptions) {
  const { accessToken, authorId, authorRole, onSuccess, onError } = options;
  const queryClient = useQueryClient();

  const gateway = useMemo(
    () => new FeedbackGateway({ accessToken }),
    [accessToken]
  );

  return useMutation({
    mutationFn: async (input: {
      targetMsgId: string;
      content: string;
      visibility?: "ALL" | "OWNER_ONLY" | "MENTOR_ONLY";
    }) => {
      return gateway.createFeedback({
        targetMsgId: input.targetMsgId,
        authorId,
        authorRole,
        content: input.content,
        visibility: input.visibility,
      });
    },
    // Optimistic Update
    onMutate: async (input) => {
      const queryKey = feedbackKeys.list(input.targetMsgId);
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData<FeedbacksListResponse>(queryKey);

      // 楽観的にフィードバックを追加
      const optimisticFeedback: Feedback = {
        fbId: `temp-${Date.now()}`,
        targetMsgId: input.targetMsgId,
        authorId,
        authorRole,
        content: input.content,
        createdAt: new Date().toISOString(),
        visibility: input.visibility,
      };

      if (previousData) {
        queryClient.setQueryData<FeedbacksListResponse>(queryKey, {
          ...previousData,
          items: [...previousData.items, optimisticFeedback],
        });
      }

      return { previousData, queryKey };
    },
    onError: (error, _input, context) => {
      // エラー時はロールバック
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
      onError?.(error as Error);
    },
    onSuccess: (feedback, input) => {
      onSuccess?.(feedback);
      // 関連するメッセージのキャッシュも更新（フィードバック数が変わる場合）
      const convIdMatch = input.targetMsgId.match(/^msg-(.+?)-/);
      if (convIdMatch) {
        queryClient.invalidateQueries({ queryKey: messageKeys.all });
      }
    },
    onSettled: (_data, _error, input) => {
      // 完了後にフィードバック一覧を再取得
      queryClient.invalidateQueries({
        queryKey: feedbackKeys.list(input.targetMsgId)
      });
    },
  });
}

// ===== Update Feedback Mutation =====
/**
 * フィードバックを更新
 *
 * Optimistic Update: 即座にUIに反映
 */
export function useUpdateFeedback(options: UseUpdateFeedbackOptions) {
  const { accessToken, onSuccess, onError } = options;
  const queryClient = useQueryClient();

  const gateway = useMemo(
    () => new FeedbackGateway({ accessToken }),
    [accessToken]
  );

  return useMutation({
    mutationFn: async (input: {
      feedbackId: string;
      targetMsgId: string; // キャッシュ更新に必要
      content: string;
    }) => {
      return gateway.updateFeedback({
        feedbackId: input.feedbackId,
        content: input.content,
      });
    },
    // Optimistic Update
    onMutate: async (input) => {
      const queryKey = feedbackKeys.list(input.targetMsgId);
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData<FeedbacksListResponse>(queryKey);

      // 楽観的にフィードバックを更新
      if (previousData) {
        queryClient.setQueryData<FeedbacksListResponse>(queryKey, {
          ...previousData,
          items: previousData.items.map((fb) =>
            fb.fbId === input.feedbackId
              ? { ...fb, content: input.content, updatedAt: new Date().toISOString() }
              : fb
          ),
        });
      }

      return { previousData, queryKey };
    },
    onError: (error, _input, context) => {
      // エラー時はロールバック
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
      onError?.(error as Error);
    },
    onSuccess: (feedback) => {
      onSuccess?.(feedback);
    },
    onSettled: (_data, _error, input) => {
      // 完了後にフィードバック一覧を再取得
      queryClient.invalidateQueries({
        queryKey: feedbackKeys.list(input.targetMsgId)
      });
    },
  });
}

// ===== Delete Feedback Mutation (Future) =====
// Note: FeedbackGatewayにdeleteFeedbackがないため、必要時に追加
