"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  KnowledgeGateway,
  type KnowledgeListItem,
} from "../gateways/api/KnowledgeGateway";

// ============================================
// 型定義
// ============================================

interface UseKnowledgeListPresenterProps {
  accessToken?: string;
}

export interface KnowledgeListViewModel {
  items: KnowledgeListItem[];
  total: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  selectedCategory: string | null;
  searchQuery: string;
  hasMore: boolean;
}

export interface KnowledgeListActions {
  setCategory: (category: string | null) => void;
  setSearchQuery: (query: string) => void;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface KnowledgeListPresenterOutput {
  viewModel: KnowledgeListViewModel;
  actions: KnowledgeListActions;
}

// ============================================
// Presenter Hook
// ============================================

const PAGE_SIZE = 20;

export function useKnowledgeListPresenter({
  accessToken,
}: UseKnowledgeListPresenterProps): KnowledgeListPresenterOutput {
  const [items, setItems] = useState<KnowledgeListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchKnowledge = useCallback(
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
        const result = await gateway.listKnowledge({
          category: selectedCategory ?? undefined,
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
          err instanceof Error ? err.message : "ナレッジの取得に失敗しました"
        );
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [accessToken, selectedCategory, searchQuery]
  );

  // 初回読み込み & フィルタ変更時
  useEffect(() => {
    fetchKnowledge(0, false);
  }, [fetchKnowledge]);

  const setCategory = useCallback((category: string | null) => {
    setSelectedCategory(category);
  }, []);

  const setSearchQueryDebounced = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleSearchInput = useCallback(
    (query: string) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        setSearchQueryDebounced(query);
      }, 300);
    },
    [setSearchQueryDebounced]
  );

  const loadMore = useCallback(async () => {
    if (isLoadingMore || items.length >= total) return;
    await fetchKnowledge(items.length, true);
  }, [fetchKnowledge, isLoadingMore, items.length, total]);

  const refresh = useCallback(async () => {
    await fetchKnowledge(0, false);
  }, [fetchKnowledge]);

  return {
    viewModel: {
      items,
      total,
      isLoading,
      isLoadingMore,
      error,
      selectedCategory,
      searchQuery,
      hasMore: items.length < total,
    },
    actions: {
      setCategory,
      setSearchQuery: handleSearchInput,
      loadMore,
      refresh,
    },
  };
}
