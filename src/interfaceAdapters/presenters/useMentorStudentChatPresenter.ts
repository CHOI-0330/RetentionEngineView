/**
 * MentorStudentChat Presenter
 *
 * React Hook（React依存層）
 * - Factory経由でServiceを生成
 * - React状態管理
 * - ViewModelをViewに提供
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

import type { UseCaseFailure } from "../../application/entitle/models";
import type { MentorChatBootstrapData } from "../../application/entitle/ports/MentorStudentChatPort";
import type { MentorStudentChatViewModel } from "../services/MentorStudentChatService";
import { createMentorStudentChatService } from "../../application/entitle/factories/MentorStudentChatFactory";

// ============================================
// 状態型定義
// ============================================

interface PresenterState {
  bootstrapData: MentorChatBootstrapData | null;
  isLoading: boolean;
  error: UseCaseFailure | null;
  // フィードバック関連
  drafts: Record<string, string>;
  submitting: Record<string, boolean>;
  formErrors: Record<string, string | null>;
  editingFlags: Record<string, boolean>;
}

// ============================================
// Props型定義
// ============================================

interface UseMentorStudentChatPresenterProps {
  convId: string;
  accessToken?: string;
  isSessionLoading?: boolean;
}

// ============================================
// Output型定義
// ============================================

export interface MentorStudentChatPresenterOutput {
  // ViewModel
  viewModel: MentorStudentChatViewModel | null;
  // 状態
  isLoading: boolean;
  error: UseCaseFailure | null;
  drafts: Record<string, string>;
  submitting: Record<string, boolean>;
  formErrors: Record<string, string | null>;
  editingFlags: Record<string, boolean>;
  // アクション
  actions: {
    handleDraftChange: (messageId: string, value: string) => void;
    handleToggleEditing: (messageId: string, next: boolean) => void;
    handleSubmitFeedback: (messageId: string) => Promise<void>;
    refresh: () => Promise<void>;
  };
}

// ============================================
// 初期状態
// ============================================

const initialState: PresenterState = {
  bootstrapData: null,
  isLoading: true,
  error: null,
  drafts: {},
  submitting: {},
  formErrors: {},
  editingFlags: {},
};

// ============================================
// Presenter Hook
// ============================================

export function useMentorStudentChatPresenter(
  props: UseMentorStudentChatPresenterProps
): MentorStudentChatPresenterOutput {
  const { convId, accessToken, isSessionLoading } = props;
  const router = useRouter();

  // Service生成（Factory使用）
  const service = useMemo(
    () => createMentorStudentChatService({ accessToken, convId }),
    [accessToken, convId]
  );

  // 状態
  const [state, setState] = useState<PresenterState>(initialState);
  const hasLoadedInitial = useRef(false);

  // ============================================
  // データロード
  // ============================================

  const loadChatDetail = useCallback(async () => {
    if (!accessToken) {
      if (!isSessionLoading) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: { kind: "ValidationError", message: "ログインしてください。" },
        }));
      }
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const result = await service.fetchChatDetail();

    if (result.kind === "failure") {
      // 認証エラーの場合はリダイレクト
      if (
        result.error.message === "Unauthorized" ||
        result.error.kind === "Forbidden"
      ) {
        router.push("/?redirected=1");
        return;
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: result.error,
      }));
      return;
    }

    // 成功時：編集フラグ初期化
    const editingFlags: Record<string, boolean> = {};
    result.value.messages.forEach((message) => {
      editingFlags[message.msgId] = false;
    });

    setState((prev) => ({
      ...prev,
      bootstrapData: result.value,
      isLoading: false,
      error: null,
      editingFlags,
    }));
  }, [accessToken, isSessionLoading, service, router]);

  // 初回ロード
  useEffect(() => {
    if (hasLoadedInitial.current) return;
    if (isSessionLoading) return;

    hasLoadedInitial.current = true;
    void loadChatDetail();
  }, [isSessionLoading, loadChatDetail]);

  // ============================================
  // フィードバックアクション
  // ============================================

  const handleDraftChange = useCallback((messageId: string, value: string) => {
    setState((prev) => ({
      ...prev,
      drafts: { ...prev.drafts, [messageId]: value },
      formErrors: { ...prev.formErrors, [messageId]: null },
    }));
  }, []);

  const handleToggleEditing = useCallback(
    (messageId: string, next: boolean) => {
      setState((prev) => {
        const newState = {
          ...prev,
          editingFlags: { ...prev.editingFlags, [messageId]: next },
        };

        // 編集開始時：既存フィードバックがあれば下書きにセット
        if (next && prev.bootstrapData) {
          const existingFeedback =
            prev.bootstrapData.feedbackByMessageId[messageId]?.[0];
          if (existingFeedback) {
            newState.drafts = {
              ...newState.drafts,
              [messageId]: existingFeedback.content,
            };
          }
          newState.formErrors = { ...newState.formErrors, [messageId]: null };
        }

        return newState;
      });
    },
    []
  );

  const handleSubmitFeedback = useCallback(
    async (messageId: string) => {
      const { bootstrapData, drafts } = state;

      if (!bootstrapData) return;

      const existingFeedback =
        bootstrapData.feedbackByMessageId[messageId]?.[0] ?? null;
      const rawDraft = drafts[messageId] ?? existingFeedback?.content ?? "";
      const trimmed = rawDraft.trim();

      if (!trimmed) {
        setState((prev) => ({
          ...prev,
          formErrors: {
            ...prev.formErrors,
            [messageId]: "フィードバック内容を入力してください。",
          },
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        submitting: { ...prev.submitting, [messageId]: true },
      }));

      const result = await service.createFeedback({
        messageId,
        content: trimmed,
        feedbackId: existingFeedback?.fbId,
      });

      if (result.kind === "failure") {
        setState((prev) => ({
          ...prev,
          submitting: (() => {
            const next = { ...prev.submitting };
            delete next[messageId];
            return next;
          })(),
          formErrors: {
            ...prev.formErrors,
            [messageId]: result.error.message,
          },
        }));
        return;
      }

      // 成功時：データ更新
      setState((prev) => {
        if (!prev.bootstrapData) return prev;

        const updatedData = service.updateWithNewFeedback(
          prev.bootstrapData,
          messageId,
          result.value
        );

        const nextSubmitting = { ...prev.submitting };
        delete nextSubmitting[messageId];

        return {
          ...prev,
          bootstrapData: updatedData,
          drafts: { ...prev.drafts, [messageId]: trimmed },
          submitting: nextSubmitting,
          formErrors: { ...prev.formErrors, [messageId]: null },
          editingFlags: { ...prev.editingFlags, [messageId]: false },
        };
      });
    },
    [state, service]
  );

  const refresh = useCallback(async () => {
    hasLoadedInitial.current = false;
    await loadChatDetail();
  }, [loadChatDetail]);

  // ============================================
  // ViewModel生成
  // ============================================

  const viewModel = useMemo(() => {
    if (!state.bootstrapData) return null;
    return service.toViewModel(state.bootstrapData);
  }, [service, state.bootstrapData]);

  // ============================================
  // 返却
  // ============================================

  return {
    viewModel,
    isLoading: state.isLoading,
    error: state.error,
    drafts: state.drafts,
    submitting: state.submitting,
    formErrors: state.formErrors,
    editingFlags: state.editingFlags,
    actions: {
      handleDraftChange,
      handleToggleEditing,
      handleSubmitFeedback,
      refresh,
    },
  };
}
