"use client";

import { useState, useMemo } from "react";
import {
  Search,
  HelpCircle,
  Loader2,
  RefreshCw,
  Eye,
  Tag,
  User,
  MessageSquare,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Skeleton } from "../../components/ui/skeleton";
import type {
  QCListViewModel,
  QCListActions,
} from "../../interfaceAdapters/presenters/useQuestionCardListPresenter";
import type { QCListItem } from "../../interfaceAdapters/gateways/api/QuestionCardGateway";
import { QuestionCardDetailDialog } from "./QuestionCardDetailDialog";

// ============================================
// 型定義
// ============================================

interface QuestionCardTabProps {
  viewModel: QCListViewModel;
  actions: QCListActions;
}

// ============================================
// 定数
// ============================================

const STATUS_FILTERS: { label: string; value: "open" | "resolved" | null }[] = [
  { label: "すべて", value: null },
  { label: "未回答", value: "open" },
  { label: "回答済み", value: "resolved" },
];

const statusConfig = {
  open: {
    label: "未回答",
    color: "bg-purple-100 text-purple-800",
    border: "border-l-purple-500",
  },
  resolved: {
    label: "回答済み",
    color: "bg-green-100 text-green-800",
    border: "border-l-green-500",
  },
} as const;

// ============================================
// メインコンポーネント
// ============================================

export default function QuestionCardTab({
  viewModel,
  actions,
}: QuestionCardTabProps) {
  const {
    items,
    total,
    isLoading,
    isLoadingMore,
    error,
    selectedStatus,
    hasMore,
  } = viewModel;
  const [selectedItem, setSelectedItem] = useState<QCListItem | null>(null);

  return (
    <div>
      {/* サブヘッダー */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          チームメンバーからの質問カード
          {total > 0 && `（${total}件）`}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={actions.refresh}
          disabled={isLoading}
        >
          <RefreshCw
            className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
          />
          更新
        </Button>
      </div>

      {/* フィルターバー */}
      <div className="mb-6 space-y-4">
        {/* ステータスフィルタ */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.label}
              variant={selectedStatus === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => actions.setStatus(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* 検索 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="質問を検索..."
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
        <QCLoadingSkeleton />
      ) : items.length === 0 ? (
        <QCEmptyState />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <QCCard
                key={item.id}
                item={item}
                onClick={() => setSelectedItem(item)}
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

      {/* 詳細モーダル */}
      <QuestionCardDetailDialog
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}

// ============================================
// サブコンポーネント
// ============================================

function QCCard({
  item,
  onClick,
}: {
  item: QCListItem;
  onClick: () => void;
}) {
  const cfg = statusConfig[item.status] ?? statusConfig.open;
  const date = new Date(item.createdAt);
  const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;

  return (
    <div
      className={`rounded-xl border border-l-4 ${cfg.border} bg-card p-5 space-y-3 hover:shadow-md transition-all cursor-pointer group`}
      onClick={onClick}
    >
      {/* ヘッダー: ステータス + 日付 */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className={cfg.color}>
          {cfg.label}
        </Badge>
        {!item.isAnonymous && item.creatorName && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            {item.creatorName}
          </span>
        )}
        {item.isAnonymous && (
          <span className="text-xs text-muted-foreground">匿名</span>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{dateStr}</span>
      </div>

      {/* タイトル */}
      <h3 className="text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">
        {item.title}
      </h3>

      {/* 背景プレビュー */}
      {item.background && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {item.background}
        </p>
      )}

      {/* 質問プレビュー */}
      <div className="flex items-start gap-1.5">
        <MessageSquare className="h-3 w-3 text-purple-500 mt-0.5 shrink-0" />
        <p className="text-xs text-foreground/80 line-clamp-2">
          {item.questionBody}
        </p>
      </div>

      {/* フッター: タグ + 統計 */}
      <div className="flex items-center justify-between pt-2 border-t border-border/40">
        {item.tags.length > 0 ? (
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
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Eye className="h-3 w-3" />
            {item.viewCount}
          </span>
        </div>
      </div>
    </div>
  );
}

function QCLoadingSkeleton() {
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

function QCEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <HelpCircle className="h-12 w-12 text-muted-foreground/50" />
      <h3 className="mt-4 text-lg font-medium">質問カードがありません</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        AIチャットの回答から「質問を作成」ボタンを押すと、先輩への質問カードを作成できます。
      </p>
    </div>
  );
}
