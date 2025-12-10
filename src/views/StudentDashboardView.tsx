/**
 * StudentDashboard View - V2 Architecture
 *
 * 純粋なUIコンポーネント - ビジネスロジックなし
 * V2 Presenterの出力を直接使用
 */

import { memo } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Loader2,
  MessageSquarePlus,
  MessageCircle,
  ArrowRight,
  Trash2,
  User,
} from "lucide-react";

import type { UseCaseFailure } from "../application/entitle/models";
import type {
  StudentDashboardViewModel,
  ConversationViewModel,
} from "../interfaceAdapters/services/StudentDashboardService";

// ============================================
// Props型定義
// ============================================

export interface StudentDashboardViewProps {
  heading: string;
  viewModel: StudentDashboardViewModel;
  isLoading: boolean;
  isCreating: boolean;
  error: UseCaseFailure | null;
  searchQuery: string;
  newTitle: string;
  isDeleting: Record<string, boolean>;
  actions: {
    setSearchQuery: (value: string) => void;
    setNewTitle: (value: string) => void;
    refresh: () => Promise<void>;
    createConversation: (title: string) => Promise<void>;
    deleteConversation: (convId: string) => Promise<void>;
    clearError: () => void;
  };
  onNavigateToConversation: (convId: string) => void;
}

// ============================================
// メインコンポーネント
// ============================================

const StudentDashboardView = ({
  heading,
  viewModel,
  isLoading,
  isCreating,
  error,
  newTitle,
  isDeleting,
  actions,
  onNavigateToConversation,
}: StudentDashboardViewProps) => {
  const handleCreateConversation = () => {
    const title = newTitle.trim() || "新しい会話";
    void actions.createConversation(title);
  };

  const handleDeleteConversation = (convId: string) => {
    const confirmed = window.confirm(
      "この会話を削除しますか？この操作は取り消せません。"
    );
    if (confirmed) {
      void actions.deleteConversation(convId);
    }
  };

  return (
    <main className="min-h-screen pb-20">
      {/* Hero Section */}
      <HeroSection heading={heading} />

      <div className="container px-4 sm:px-6 space-y-12">
        {/* Error Display */}
        {error && (
          <ErrorBanner message={error.message} onClose={actions.clearError} />
        )}

        {/* Create New Section */}
        <CreateConversationSection
          newTitle={newTitle}
          onChangeNewTitle={actions.setNewTitle}
          onCreateConversation={handleCreateConversation}
          isCreating={isCreating}
        />

        {/* Conversations Grid */}
        <ConversationsSection
          conversations={viewModel.conversations}
          conversationCount={viewModel.totalCount}
          isLoading={isLoading}
          hasConversations={viewModel.hasConversations}
          isDeleting={isDeleting}
          onNavigateToConversation={onNavigateToConversation}
          onDeleteConversation={handleDeleteConversation}
        />
      </div>
    </main>
  );
};

export default StudentDashboardView;

// --- Sub Components ---

interface HeroSectionProps {
  heading: string;
}

const HeroSection = memo(function HeroSection({ heading }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
      <div className="container px-4 sm:px-6 relative z-10">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            新入社員ダッシュボード
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {heading}
            <span className="block text-primary mt-2">学習を始めましょう</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            AIメンターとの会話を通じて、新しいスキルや知識を身につけましょう。過去の会話履歴を確認したり、新しいトピックについて相談できます。
          </p>
          {/* TODO: AIアバター機能が完成したら以下のボタンを有効化する */}
          {/* <div className="pt-2">
            <a
              href="/student/profile"
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
            >
              <User className="h-4 w-4" />
              AIアバターを設定する
            </a>
          </div> */}
        </div>
      </div>
    </section>
  );
});

interface ErrorBannerProps {
  message: string;
  onClose: () => void;
}

const ErrorBanner = memo(function ErrorBanner({ message, onClose }: ErrorBannerProps) {
  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive animate-in fade-in zoom-in-95 flex items-center justify-between">
      <span>{message}</span>
      <Button variant="ghost" size="sm" onClick={onClose} className="h-6 px-2">
        閉じる
      </Button>
    </div>
  );
});

interface CreateConversationSectionProps {
  newTitle: string;
  onChangeNewTitle: (value: string) => void;
  onCreateConversation: () => void;
  isCreating: boolean;
}

const CreateConversationSection = memo(function CreateConversationSection({
  newTitle,
  onChangeNewTitle,
  onCreateConversation,
  isCreating,
}: CreateConversationSectionProps) {
  return (
    <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1 space-y-3">
          <Label className="text-base font-medium flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4 text-primary" />
            新しい会話を始める
          </Label>
          <div className="relative">
            <Input
              value={newTitle}
              onChange={(e) => onChangeNewTitle(e.target.value)}
              placeholder="例: オンボーディングの進め方について"
              autoComplete="off"
              className="h-12 text-base bg-background border-input focus:ring-2 transition-colors pl-4"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isCreating) {
                  onCreateConversation();
                }
              }}
            />
          </div>
        </div>
        <Button
          className="h-12 px-8 text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-colors"
          disabled={isCreating}
          onClick={onCreateConversation}
        >
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              作成中...
            </>
          ) : (
            <>
              会話を作成 <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
});

interface ConversationsSectionProps {
  conversations: ConversationViewModel[];
  conversationCount: number;
  isLoading: boolean;
  hasConversations: boolean;
  isDeleting: Record<string, boolean>;
  onNavigateToConversation: (convId: string) => void;
  onDeleteConversation: (convId: string) => void;
}

const ConversationsSection = memo(function ConversationsSection({
  conversations,
  conversationCount,
  isLoading,
  hasConversations,
  isDeleting,
  onNavigateToConversation,
  onDeleteConversation,
}: ConversationsSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">
          最近の会話
        </h2>
        <Badge
          variant="outline"
          className="px-3 py-1 bg-background/50"
        >
          {conversationCount} 件
        </Badge>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : !hasConversations ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {conversations.map((conversation, index) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              index={index}
              isDeleting={isDeleting[conversation.id] ?? false}
              onNavigate={onNavigateToConversation}
              onDelete={onDeleteConversation}
            />
          ))}
        </div>
      )}
    </div>
  );
});

const LoadingSkeleton = memo(function LoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-48 rounded-xl border bg-card/50 animate-pulse"
        />
      ))}
    </div>
  );
});

const EmptyState = memo(function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/30 px-4 py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <MessageCircle className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium">まだ会話がありません</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
        新しいトピックについてAIメンターと会話を始めてみましょう。
      </p>
    </div>
  );
});

interface ConversationCardProps {
  conversation: ConversationViewModel;
  index: number;
  isDeleting: boolean;
  onNavigate: (convId: string) => void;
  onDelete: (convId: string) => void;
}

const ConversationCard = memo(function ConversationCard({
  conversation,
  index,
  isDeleting,
  onNavigate,
  onDelete,
}: ConversationCardProps) {
  return (
    <Card
      className="group relative overflow-hidden border bg-card hover:shadow-md transition-colors cursor-pointer"
      onClick={() => onNavigate(conversation.id)}
    >
      <CardContent className="p-6 flex flex-col h-full">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <MessageCircle className="h-5 w-5" />
          </div>
          <Badge
            variant="secondary"
            className="bg-secondary/50 text-xs font-normal"
          >
            対応中
          </Badge>
        </div>

        <h3 className="text-lg font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {conversation.title}
        </h3>

        <div className="mt-auto pt-4 flex items-center text-xs text-muted-foreground border-t border-border/30">
          <span>{conversation.displayDate}</span>
        </div>

        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative z-20 h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(conversation.id);
            }}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span className="sr-only">会話を削除</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
