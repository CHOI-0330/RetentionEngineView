"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  KnowledgeGateway,
  type KCListItem,
  type KCStatus,
  type KCSourceType,
} from "../gateways/api/KnowledgeGateway";

// ============================================
// 型定義
// ============================================

interface UseKCListPresenterProps {
  accessToken?: string;
}

export interface KCListViewModel {
  items: KCListItem[];
  total: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  selectedStatus: KCStatus | null;
  selectedSourceType: KCSourceType | null;
  searchQuery: string;
  hasMore: boolean;
}

export interface KCListActions {
  setStatus: (status: KCStatus | null) => void;
  setSourceType: (sourceType: KCSourceType | null) => void;
  setSearchQuery: (query: string) => void;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface KCListPresenterOutput {
  viewModel: KCListViewModel;
  actions: KCListActions;
}

// ============================================
// Presenter Hook
// ============================================

const PAGE_SIZE = 20;

export function useKCListPresenter({
  accessToken,
}: UseKCListPresenterProps): KCListPresenterOutput {
  const [items, setItems] = useState<KCListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<KCStatus | null>(null);
  const [selectedSourceType, setSelectedSourceType] = useState<KCSourceType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchKnowledgeCards = useCallback(
    async (offset: number, append: boolean) => {
      if (!accessToken) return;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const gateway = new KnowledgeGateway({ accessToken });
        const result = await gateway.listKnowledgeCards({
          status: selectedStatus ?? undefined,
          sourceType: selectedSourceType ?? undefined,
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
          err instanceof Error ? err.message : "ナレッジカードの取得に失敗しました"
        );
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [accessToken, selectedStatus, selectedSourceType, searchQuery]
  );

  // 初回読み込み & フィルタ変更時
  useEffect(() => {
    fetchKnowledgeCards(0, false);
  }, [fetchKnowledgeCards]);

  const setStatus = useCallback((status: KCStatus | null) => {
    setSelectedStatus(status);
  }, []);

  const setSourceType = useCallback((sourceType: KCSourceType | null) => {
    setSelectedSourceType(sourceType);
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
    await fetchKnowledgeCards(items.length, true);
  }, [fetchKnowledgeCards, isLoadingMore, items.length, total]);

  const refresh = useCallback(async () => {
    await fetchKnowledgeCards(0, false);
  }, [fetchKnowledgeCards]);

  return {
    viewModel: {
      items,
      total,
      isLoading,
      isLoadingMore,
      error,
      selectedStatus,
      selectedSourceType,
      searchQuery,
      hasMore: items.length < total,
    },
    actions: {
      setStatus,
      setSourceType,
      setSearchQuery: handleSearchInput,
      loadMore,
      refresh,
    },
  };
}
