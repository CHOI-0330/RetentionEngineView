"use client";

import { useState, useMemo, lazy, Suspense } from "react";
import { Search, BookOpen, Loader2, RefreshCw, ThumbsUp, Eye, Lightbulb, AlertTriangle, MapPin, Star, FileText } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import type {
  KCListViewModel,
  KCListActions,
} from "../interfaceAdapters/presenters/useKCListPresenter";
import type {
  QCListViewModel,
  QCListActions,
} from "../interfaceAdapters/presenters/useQuestionCardListPresenter";
import type { KCListItem, KCStatus } from "../interfaceAdapters/gateways/api/KnowledgeGateway";
import { KnowledgeGateway } from "../interfaceAdapters/gateways/api/KnowledgeGateway";

// Dynamic Import: QuestionCardTab（タブ切替時のみロード）
const QuestionCardTab = lazy(() => import("./questionCard/QuestionCardTab"));

// ============================================
// 型定義
// ============================================

interface KCLibraryViewProps {
  viewModel: KCListViewModel;
  actions: KCListActions;
  accessToken?: string;
  /** 質問カードタブ用 */
  qcViewModel?: QCListViewModel;
  qcActions?: QCListActions;
}

// ============================================
// 定数
// ============================================

const STATUS_FILTERS: { label: string; value: KCStatus | null }[] = [
  { label: "すべて", value: null },
  { label: "下書き", value: "draft" },
  { label: "検証済み", value: "verified" },
  { label: "公式", value: "official" },
];

const statusColors: Record<KCStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  verified: "bg-blue-100 text-blue-800",
  official: "bg-green-100 text-green-800",
};

const statusBorderColors: Record<KCStatus, string> = {
  draft: "border-l-gray-400",
  verified: "border-l-blue-500",
  official: "border-l-green-500",
};

const statusLabels: Record<KCStatus, string> = {
  draft: "下書き",
  verified: "検証済み",
  official: "公式",
};

// マークダウンコンテンツを状況/ノウハウ/注意点/重要性/具体例に分割
interface ParsedContent {
  situation: string;
  knowhow: string;
  precaution: string;
  importance: string;
  example: string;
  raw: string;
}

function parseKCContent(content: string): ParsedContent {
  const result: ParsedContent = { situation: "", knowhow: "", precaution: "", importance: "", example: "", raw: content };
  const sections = content.split(/^##\s+/m).filter(Boolean);
  for (const section of sections) {
    const lines = section.split("\n");
    const heading = (lines[0] ?? "").trim().toLowerCase();
    const body = lines.slice(1).join("\n").trim();
    if (heading.includes("状況") || heading.includes("situation")) {
      result.situation = body;
    } else if (heading.includes("ノウハウ") || heading.includes("knowhow") || heading.includes("知見")) {
      result.knowhow = body;
    } else if (heading.includes("注意点") || heading.includes("precaution") || heading.includes("注意")) {
      result.precaution = body;
    } else if (heading.includes("重要性") || heading.includes("importance")) {
      result.importance = body;
    } else if (heading.includes("具体例") || heading.includes("example")) {
      result.example = body;
    }
  }
  return result;
}

const SECTION_CONFIG = [
  { key: "situation" as const, label: "状況", icon: MapPin, color: "text-blue-600", bg: "bg-blue-50" },
  { key: "knowhow" as const, label: "ノウハウ", icon: Lightbulb, color: "text-amber-600", bg: "bg-amber-50" },
  { key: "precaution" as const, label: "注意点", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
  { key: "importance" as const, label: "重要性", icon: Star, color: "text-purple-600", bg: "bg-purple-50" },
  { key: "example" as const, label: "具体例", icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50" },
] as const;

// ============================================
// メインコンポーネント
// ============================================

export default function KCLibraryView({
  viewModel,
  actions,
  accessToken,
  qcViewModel,
  qcActions,
}: KCLibraryViewProps) {
  const { items, total, isLoading, isLoadingMore, error, selectedStatus, hasMore } =
    viewModel;
  const [selectedItem, setSelectedItem] = useState<KCListItem | null>(null);

  const hasQCTab = !!qcViewModel && !!qcActions;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          ナレッジライブラリ
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          チームが蓄積したナレッジ・質問カードを閲覧できます
        </p>
      </div>

      {/* タブ切替 */}
      {hasQCTab ? (
        <Tabs defaultValue="knowledge">
          <TabsList className="mb-6">
            <TabsTrigger value="knowledge">
              <BookOpen className="mr-1.5 h-4 w-4" />
              ナレッジ
              {total > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {total}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="questions">
              <Search className="mr-1.5 h-4 w-4" />
              質問
              {qcViewModel.total > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {qcViewModel.total}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="knowledge">
            <KCContent
              items={items}
              total={total}
              isLoading={isLoading}
              isLoadingMore={isLoadingMore}
              error={error}
              selectedStatus={selectedStatus}
              hasMore={hasMore}
              actions={actions}
              selectedItem={selectedItem}
              setSelectedItem={setSelectedItem}
              accessToken={accessToken}
            />
          </TabsContent>

          <TabsContent value="questions">
            <Suspense
              fallback={
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-40 w-full rounded-lg" />
                  ))}
                </div>
              }
            >
              <QuestionCardTab
                viewModel={qcViewModel}
                actions={qcActions}
              />
            </Suspense>
          </TabsContent>
        </Tabs>
      ) : (
        /* タブなし（後方互換） */
        <KCContent
          items={items}
          total={total}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          error={error}
          selectedStatus={selectedStatus}
          hasMore={hasMore}
          actions={actions}
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
          accessToken={accessToken}
        />
      )}
    </div>
  );
}

// ============================================
// ナレッジカードコンテンツ（タブ内用に抽出）
// ============================================

function KCContent({
  items,
  total,
  isLoading,
  isLoadingMore,
  error,
  selectedStatus,
  hasMore,
  actions,
  selectedItem,
  setSelectedItem,
  accessToken,
}: {
  items: KCListItem[];
  total: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  selectedStatus: KCStatus | null;
  hasMore: boolean;
  actions: KCListActions;
  selectedItem: KCListItem | null;
  setSelectedItem: (item: KCListItem | null) => void;
  accessToken?: string;
}) {
  return (
    <>
      {/* サブヘッダー */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          チームが蓄積したナレッジカード
          {total > 0 && `（${total}件）`}
        </p>
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
              <KCCard
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

      {/* KC詳細モーダル */}
      <KCDetailDialog
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        accessToken={accessToken}
        onRefresh={actions.refresh}
      />
    </>
  );
}

// ============================================
// サブコンポーネント
// ============================================

function KCCard({
  item,
  onClick,
}: {
  item: KCListItem;
  onClick: () => void;
}) {
  const colorClass = statusColors[item.status] ?? "bg-gray-100 text-gray-800";
  const date = new Date(item.createdAt);
  const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
  const parsed = useMemo(() => parseKCContent(item.content), [item.content]);
  const previewSection = parsed.knowhow || parsed.situation || parsed.raw;

  return (
    <div
      className={`rounded-xl border border-l-4 ${statusBorderColors[item.status] ?? "border-l-gray-400"} bg-card p-5 space-y-3 hover:shadow-md transition-all cursor-pointer group`}
      onClick={onClick}
    >
      {/* ヘッダー: ステータス + 日付 */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className={colorClass}>
          {statusLabels[item.status] ?? item.status}
        </Badge>
        {item.confidence !== null && (
          <span className="text-xs text-muted-foreground">
            {Math.round(item.confidence * 100)}%
          </span>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{dateStr}</span>
      </div>

      {/* タイトル */}
      <h3 className="text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">
        {item.title}
      </h3>

      {/* セクションプレビュー */}
      <div className="space-y-1.5">
        {parsed.situation && (
          <div className="flex items-start gap-1.5">
            <MapPin className="h-3 w-3 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground line-clamp-1">{parsed.situation}</p>
          </div>
        )}
        {parsed.knowhow && (
          <div className="flex items-start gap-1.5">
            <Lightbulb className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground line-clamp-1">{parsed.knowhow}</p>
          </div>
        )}
        {parsed.precaution && (
          <div className="flex items-start gap-1.5">
            <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground line-clamp-1">{parsed.precaution}</p>
          </div>
        )}
        {parsed.importance && (
          <div className="flex items-start gap-1.5">
            <Star className="h-3 w-3 text-purple-500 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground line-clamp-1">{parsed.importance}</p>
          </div>
        )}
        {parsed.example && (
          <div className="flex items-start gap-1.5">
            <FileText className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground line-clamp-1">{parsed.example}</p>
          </div>
        )}
        {!parsed.situation && !parsed.knowhow && !parsed.precaution && !parsed.importance && !parsed.example && (
          <p className="text-xs text-muted-foreground line-clamp-3">{item.content}</p>
        )}
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
          <span className="flex items-center gap-0.5">
            <ThumbsUp className="h-3 w-3" />
            {item.usefulCount}
          </span>
        </div>
      </div>
    </div>
  );
}

function KCDetailDialog({
  item,
  onClose,
  accessToken,
  onRefresh,
}: {
  item: KCListItem | null;
  onClose: () => void;
  accessToken?: string;
  onRefresh: () => void;
}) {
  const [isMarkingUseful, setIsMarkingUseful] = useState(false);

  const parsed = useMemo(() => (item ? parseKCContent(item.content) : null), [item?.content]);
  const hasSections = parsed && (parsed.situation || parsed.knowhow || parsed.precaution || parsed.importance || parsed.example);

  if (!item) return null;

  const handleMarkUseful = async () => {
    setIsMarkingUseful(true);
    try {
      const gateway = new KnowledgeGateway({ accessToken });
      await gateway.markUseful(item.id);
      onRefresh();
    } finally {
      setIsMarkingUseful(false);
    }
  };

  return (
    <Dialog
      open={item !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={statusColors[item.status] ?? "bg-gray-100 text-gray-800"}
            >
              {statusLabels[item.status] ?? item.status}
            </Badge>
            <span className="text-base">{item.title}</span>
          </DialogTitle>
          <DialogDescription>
            {(() => {
              const d = new Date(item.createdAt);
              return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
            })()}
            {item.confidence !== null && ` ・ 信頼度: ${Math.round(item.confidence * 100)}%`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* セクション別表示 or 全文 */}
          {hasSections ? (
            <div className="space-y-3">
              {SECTION_CONFIG.map(({ key, label, icon: Icon, color, bg }) => {
                const value = parsed[key];
                if (!value) return null;
                return (
                  <div key={key} className={`rounded-lg ${bg} p-3`}>
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${color} mb-1`}>
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{value}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {item.content}
            </div>
          )}

          {/* タグ一覧 */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* 統計 + アクション */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {item.viewCount}回閲覧
              </span>
              <span className="flex items-center gap-1">
                <ThumbsUp className="h-3.5 w-3.5" />
                {item.usefulCount}回役立った
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleMarkUseful()}
              disabled={isMarkingUseful}
            >
              <ThumbsUp className="mr-1.5 h-3.5 w-3.5" />
              役に立った
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
      <h3 className="mt-4 text-lg font-medium">ナレッジカードがありません</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        メンターAIとの対話から暗黙知が自動的に検出・蓄積されます。
      </p>
    </div>
  );
}
