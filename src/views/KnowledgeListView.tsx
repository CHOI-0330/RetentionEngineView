"use client";

import { useState } from "react";
import { Search, BookOpen, Loader2, RefreshCw } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import type {
  KnowledgeListViewModel,
  KnowledgeListActions,
} from "../interfaceAdapters/presenters/useKnowledgeListPresenter";
import type { KnowledgeListItem } from "../interfaceAdapters/gateways/api/KnowledgeGateway";
import { KnowledgeGateway } from "../interfaceAdapters/gateways/api/KnowledgeGateway";

// ============================================
// 型定義
// ============================================

interface KnowledgeListViewProps {
  viewModel: KnowledgeListViewModel;
  actions: KnowledgeListActions;
  accessToken?: string;
}

// ============================================
// 定数
// ============================================

const CATEGORIES = ["対応方法", "業界用語", "業務知識"] as const;

const categoryColors: Record<string, string> = {
  対応方法: "bg-blue-100 text-blue-800",
  業界用語: "bg-purple-100 text-purple-800",
  業務知識: "bg-green-100 text-green-800",
};

// ============================================
// メインコンポーネント
// ============================================

export default function KnowledgeListView({
  viewModel,
  actions,
  accessToken,
}: KnowledgeListViewProps) {
  const { items, total, isLoading, isLoadingMore, error, selectedCategory, hasMore } =
    viewModel;
  const [selectedItem, setSelectedItem] = useState<KnowledgeListItem | null>(null);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              ナレッジライブラリ
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              チームが蓄積したナレッジを閲覧できます
              {total > 0 && `（${total}件）`}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={actions.refresh}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            更新
          </Button>
        </div>
      </div>

      {/* フィルターバー */}
      <div className="mb-6 space-y-4">
        {/* カテゴリフィルタ */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => actions.setCategory(null)}
          >
            すべて
          </Button>
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => actions.setCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* 検索 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ナレッジを検索..."
            className="pl-9"
            onChange={(e) => actions.setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* エラー */}
      {error && (
        <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* コンテンツ */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <KnowledgeCard
                key={item.id}
                item={item}
                onClick={() => {
                  setUpdateError(null);
                  setSelectedItem(item);
                }}
              />
            ))}
          </div>

          {/* もっと見る */}
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <Button
                variant="outline"
                onClick={actions.loadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    読み込み中...
                  </>
                ) : (
                  "もっと見る"
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {/* ナレッジ詳細モーダル */}
      <Dialog
        open={selectedItem !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedItem(null);
        }}
      >
        {selectedItem && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={categoryColors[selectedItem.category] ?? "bg-gray-100 text-gray-800"}
                >
                  {selectedItem.category}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                {(() => {
                  const d = new Date(selectedItem.created_at);
                  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
                })()}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {/* 全文 */}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {selectedItem.content}
              </p>

              {/* カテゴリ編集 */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  カテゴリを変更
                </label>
                <Select
                  value={selectedItem.category}
                  disabled={isUpdatingCategory}
                  onValueChange={async (newCategory) => {
                    if (newCategory === selectedItem.category) return;
                    setIsUpdatingCategory(true);
                    setUpdateError(null);
                    try {
                      const gateway = new KnowledgeGateway({ accessToken });
                      await gateway.updateKnowledge(selectedItem.id, {
                        category: newCategory,
                      });
                      setSelectedItem({ ...selectedItem, category: newCategory });
                      actions.refresh();
                    } catch (err) {
                      setUpdateError(
                        err instanceof Error ? err.message : "カテゴリの変更に失敗しました"
                      );
                    } finally {
                      setIsUpdatingCategory(false);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {updateError && (
                  <p className="text-xs text-destructive mt-1">{updateError}</p>
                )}
              </div>

              {/* タグ一覧 */}
              {selectedItem.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedItem.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

// ============================================
// サブコンポーネント
// ============================================

function KnowledgeCard({
  item,
  onClick,
}: {
  item: KnowledgeListItem;
  onClick: () => void;
}) {
  const colorClass = categoryColors[item.category] ?? "bg-gray-100 text-gray-800";
  const date = new Date(item.created_at);
  const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;

  return (
    <div
      className="rounded-lg border bg-card p-4 space-y-3 hover:shadow-sm transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className={colorClass}>
          {item.category}
        </Badge>
        <span className="text-xs text-muted-foreground ml-auto">{dateStr}</span>
      </div>
      <p className="text-sm leading-relaxed line-clamp-4">{item.content}</p>
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <BookOpen className="h-12 w-12 text-muted-foreground/50" />
      <h3 className="mt-4 text-lg font-medium">ナレッジがありません</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        チャット画面の「知識を抽出」ボタンからナレッジを蓄積できます。
      </p>
    </div>
  );
}
