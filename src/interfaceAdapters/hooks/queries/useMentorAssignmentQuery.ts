/**
 * MentorAssignment Query Hook (React Query)
 *
 * メンター割り当て管理のためのReact Queryフック
 * Gateway直接使用でシンプル化
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import type { StudentSummary } from "../../../application/entitle/ports";
import {
  MentorDashboardGateway,
  type NewhireOption,
} from "../../gateways/api/MentorDashboardGateway";

// ===== Query Keys =====
export const mentorAssignmentKeys = {
  all: ["mentorAssignment"] as const,
  summaries: (mentorId: string) =>
    [...mentorAssignmentKeys.all, "summaries", mentorId] as const,
  newhires: () => [...mentorAssignmentKeys.all, "newhires"] as const,
};

// ===== Hook Options =====
interface UseStudentSummariesQueryOptions {
  mentorId?: string;
  accessToken?: string;
  enabled?: boolean;
}

interface UseNewhiresQueryOptions {
  accessToken?: string;
  enabled?: boolean;
}

interface UseCreateAssignmentOptions {
  accessToken?: string;
  mentorId?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

// ===== Student Summaries Query =====
/**
 * メンターが担当する学生たちの要約情報を取得
 *
 * @param options - クエリオプション
 * @returns React Query result
 */
export function useStudentSummariesQuery(options: UseStudentSummariesQueryOptions) {
  const { mentorId, accessToken, enabled = true } = options;

  const gateway = useMemo(
    () => new MentorDashboardGateway({ accessToken }),
    [accessToken]
  );

  return useQuery({
    queryKey: mentorAssignmentKeys.summaries(mentorId ?? ""),
    queryFn: async (): Promise<StudentSummary[]> => {
      if (!mentorId) return [];
      return gateway.listStudentSummaries({ mentorId });
    },
    enabled: enabled && !!accessToken && !!mentorId,
    staleTime: 30 * 1000, // 30秒間キャッシュ
    gcTime: 5 * 60 * 1000, // 5分間保持
    refetchOnWindowFocus: true,
  });
}

// ===== Available Newhires Query =====
/**
 * 割り当て可能な新入社員一覧を取得
 *
 * @param options - クエリオプション
 * @returns React Query result
 */
export function useAvailableNewhiresQuery(options: UseNewhiresQueryOptions) {
  const { accessToken, enabled = true } = options;

  const gateway = useMemo(
    () => new MentorDashboardGateway({ accessToken }),
    [accessToken]
  );

  return useQuery({
    queryKey: mentorAssignmentKeys.newhires(),
    queryFn: async (): Promise<NewhireOption[]> => {
      return gateway.listAvailableNewhires();
    },
    enabled: enabled && !!accessToken,
    staleTime: 30 * 1000, // 30秒間キャッシュ
    gcTime: 5 * 60 * 1000, // 5分間保持
  });
}

// ===== Create Assignment Mutation =====
/**
 * 新しいメンター割り当てを作成
 *
 * Optimistic Update: UIを即座に更新し、エラー時はロールバック
 */
export function useCreateAssignment(options: UseCreateAssignmentOptions) {
  const { accessToken, mentorId, onSuccess, onError } = options;
  const queryClient = useQueryClient();

  const gateway = useMemo(
    () => new MentorDashboardGateway({ accessToken }),
    [accessToken]
  );

  return useMutation({
    mutationFn: async (newhireId: string) => {
      return gateway.createAssignment(newhireId);
    },
    // Optimistic Update
    onMutate: async (newhireId: string) => {
      // 既存クエリをキャンセル
      await queryClient.cancelQueries({
        queryKey: mentorAssignmentKeys.newhires(),
      });

      const previousNewhires = queryClient.getQueryData<NewhireOption[]>(
        mentorAssignmentKeys.newhires()
      );

      // 楽観的に割り当て済みにマーク
      if (previousNewhires) {
        queryClient.setQueryData<NewhireOption[]>(
          mentorAssignmentKeys.newhires(),
          previousNewhires.map((nh) =>
            nh.userId === newhireId ? { ...nh, isAssigned: true } : nh
          )
        );
      }

      return { previousNewhires };
    },
    onError: (error, _newhireId, context) => {
      // エラー時はロールバック
      if (context?.previousNewhires) {
        queryClient.setQueryData(
          mentorAssignmentKeys.newhires(),
          context.previousNewhires
        );
      }
      onError?.(error as Error);
    },
    onSuccess: () => {
      onSuccess?.();
    },
    onSettled: () => {
      // 完了後にデータを再取得
      queryClient.invalidateQueries({
        queryKey: mentorAssignmentKeys.newhires(),
      });
      if (mentorId) {
        queryClient.invalidateQueries({
          queryKey: mentorAssignmentKeys.summaries(mentorId),
        });
      }
    },
  });
}
