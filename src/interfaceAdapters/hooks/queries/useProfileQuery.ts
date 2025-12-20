/**
 * Profile Query Hook (React Query)
 *
 * MBTI 프로필 조회/수정을 위한 React Query hooks
 * Gateway를 직접 사용하여 단순화
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import type { MbtiType } from "../../../domain/mbti.types";
import { ProfileGateway } from "../../gateways/api/ProfileGateway";

// ===== Query Keys =====
export const profileKeys = {
  all: ["profile"] as const,
  mbti: (userId: string) => [...profileKeys.all, "mbti", userId] as const,
};

// ===== Hook Options =====
interface UseMbtiQueryOptions {
  userId?: string;
  accessToken?: string;
  enabled?: boolean;
}

// ===== MBTI Query =====
export function useMbtiQuery(options: UseMbtiQueryOptions) {
  const { userId, accessToken, enabled = true } = options;

  const gateway = useMemo(
    () => new ProfileGateway({ accessToken }),
    [accessToken]
  );

  return useQuery({
    queryKey: profileKeys.mbti(userId ?? ""),
    queryFn: async () => {
      if (!userId) return null;
      return gateway.fetchMbti(userId);
    },
    enabled: enabled && !!accessToken && !!userId,
    staleTime: 60 * 1000, // 1분 캐시 (Gateway와 동일)
    gcTime: 5 * 60 * 1000, // 5분 GC
  });
}

// ===== Update MBTI Mutation =====
interface UseUpdateMbtiOptions {
  userId?: string;
  accessToken?: string;
  onSuccess?: (mbti: MbtiType) => void;
  onError?: (error: Error) => void;
}

export function useUpdateMbti(options: UseUpdateMbtiOptions) {
  const { userId, accessToken, onSuccess, onError } = options;
  const queryClient = useQueryClient();

  const gateway = useMemo(
    () => new ProfileGateway({ accessToken }),
    [accessToken]
  );

  return useMutation({
    mutationFn: async (mbti: MbtiType) => {
      if (!userId) throw new Error("ユーザーIDが必要です");
      await gateway.updateMbti(userId, mbti);
      return mbti;
    },
    // Optimistic Update: 즉시 UI 반영
    onMutate: async (newMbti: MbtiType) => {
      if (!userId) return;

      await queryClient.cancelQueries({ queryKey: profileKeys.mbti(userId) });

      const previousMbti = queryClient.getQueryData<MbtiType | null>(
        profileKeys.mbti(userId)
      );

      queryClient.setQueryData<MbtiType | null>(
        profileKeys.mbti(userId),
        newMbti
      );

      return { previousMbti };
    },
    onError: (err, _newMbti, context) => {
      // 에러 시 롤백
      if (userId && context?.previousMbti !== undefined) {
        queryClient.setQueryData(profileKeys.mbti(userId), context.previousMbti);
      }
      onError?.(err instanceof Error ? err : new Error("更新に失敗しました"));
    },
    onSuccess: (mbti) => {
      // Optimistic Update가 이미 캐시를 업데이트했으므로
      // 추가 캐시 업데이트는 불필요 (invalidateQueries 제거)
      onSuccess?.(mbti);
    },
  });
}
