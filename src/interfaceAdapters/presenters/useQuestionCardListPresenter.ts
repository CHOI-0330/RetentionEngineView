"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  QuestionCardGateway,
  type QCListItem,
  type QuestionCardStatus,
} from "../gateways/api/QuestionCardGateway";

// ============================================
// 型定義
// ============================================

interface UseQuestionCardListPresenterProps {
  accessToken?: string;
}

export interface QCListViewModel {
  items: QCListItem[];
  total: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  selectedStatus: QuestionCardStatus | null;
  searchQuery: string;
  hasMore: boolean;
}

export interface QCListActions {
  setStatus: (status: QuestionCardStatus | null) => void;
  setSearchQuery: (query: string) => void;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface QCListPresenterOutput {
  viewModel: QCListViewModel;
  actions: QCListActions;
}

// ============================================
// Presenter Hook
// ============================================

const PAGE_SIZE = 20;

export function useQuestionCardListPresenter({
  accessToken,
}: UseQuestionCardListPresenterProps): QCListPresenterOutput {
  const [items, setItems] = useState<QCListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] =
    useState<QuestionCardStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchQuestionCards = useCallback(
    async (offset: number, append: boolean) => {
      if (!accessToken) return;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const gateway = new QuestionCardGateway({ accessToken });
        const result = await gateway.listQuestionCards({
          status: selectedStatus ?? undefined,
          search: searchQuery || undefined,
          limit: PAGE_SIZE,
          offset,
        });

        if (append) {
          setItems((prev) => [...prev, ...result.items]);
        } else {
          setItems(result.items);
        }
        setTotal(result.total);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "質問カードの取得に失敗しました",
        );
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [accessToken, selectedStatus, searchQuery],
  );

  // 初回読み込み & フィルタ変更時
  useEffect(() => {
    fetchQuestionCards(0, false);
  }, [fetchQuestionCards]);

  const setStatus = useCallback((status: QuestionCardStatus | null) => {
    setSelectedStatus(status);
  }, []);

  const handleSearchInput = useCallback((query: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setSearchQuery(query);
    }, 300);
  }, []);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || items.length >= total) return;
    await fetchQuestionCards(items.length, true);
  }, [fetchQuestionCards, isLoadingMore, items.length, total]);

  const refresh = useCallback(async () => {
    await fetchQuestionCards(0, false);
  }, [fetchQuestionCards]);

  return {
    viewModel: {
      items,
      total,
      isLoading,
      isLoadingMore,
      error,
      selectedStatus,
      searchQuery,
      hasMore: items.length < total,
    },
    actions: {
      setStatus,
      setSearchQuery: handleSearchInput,
      loadMore,
      refresh,
    },
  };
}
