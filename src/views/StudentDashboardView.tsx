/**
 * StudentDashboard View
 *
 * 순수 UI 컴포넌트 - 비즈니스 로직 없음
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
  Sparkles,
  Trash2,
} from "lucide-react";

import type {
  StudentDashboardPresenterViewModel,
  StudentDashboardPresenterStatus,
  StudentDashboardPresenterMeta,
  StudentDashboardPresenterInteractions,
  ConversationViewModel,
} from "../interfaceAdapters/presenters/useStudentDashboardPresenter";

export interface StudentDashboardViewProps {
  heading: string;
  viewModel: StudentDashboardPresenterViewModel;
  status: StudentDashboardPresenterStatus;
  meta: StudentDashboardPresenterMeta;
  interactions: StudentDashboardPresenterInteractions;
  onNavigateToConversation: (convId: string) => void;
}

const StudentDashboardView = ({
  heading,
  viewModel,
  status,
  meta,
  interactions,
  onNavigateToConversation,
}: StudentDashboardViewProps) => {
  const handleCreateConversation = () => {
    const title = viewModel.newTitle.trim() || "新しい会話";
    interactions.requestCreateConversation(title);
  };

  const handleDeleteConversation = (convId: string) => {
    const confirmed = window.confirm(
      "この会話を削除しますか？この操作は取り消せません。"
    );
    if (confirmed) {
      interactions.requestDeleteConversation(convId);
    }
  };

  return (
    <main className="min-h-screen pb-20">
      {/* Hero Section */}
      <HeroSection heading={heading} />

      <div className="container px-4 sm:px-6 space-y-12">
        {/* Error Display */}
        {status.error && (
          <ErrorBanner
            message={status.error.message}
            onClose={interactions.clearError}
          />
        )}

        {/* Create New Section */}
        <CreateConversationSection
          newTitle={viewModel.newTitle}
          onChangeNewTitle={viewModel.onChangeNewTitle}
          onCreateConversation={handleCreateConversation}
          isCreating={status.isCreating}
        />

        {/* Conversations Grid */}
        <ConversationsSection
          conversations={viewModel.conversations}
          conversationCount={meta.conversationCount}
          isLoading={status.isLoading}
          hasConversations={meta.hasConversations}
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
        <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary backdrop-blur-sm">
            <Sparkles className="mr-1 h-3 w-3" />
            New Hire Dashboard
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {heading}
            <span className="block text-gradient mt-2">Ready to learn?</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            AIメンターとの会話を通じて、新しいスキルや知識を身につけましょう。過去の会話履歴を確認したり、新しいトピックについて相談できます。
          </p>
        </div>
      </div>

      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -z-10 h-[500px] w-[500px] bg-primary/5 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/4" />
      <div className="absolute bottom-0 left-0 -z-10 h-[300px] w-[300px] bg-secondary/20 blur-[80px] rounded-full -translate-x-1/3 translate-y-1/4" />
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
              className="h-12 text-base bg-background border-input focus:ring-2 transition-all pl-4"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isCreating) {
                  onCreateConversation();
                }
              }}
            />
          </div>
        </div>
        <Button
          className="h-12 px-8 text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
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
  onNavigateToConversation: (convId: string) => void;
  onDeleteConversation: (convId: string) => void;
}

const ConversationsSection = memo(function ConversationsSection({
  conversations,
  conversationCount,
  isLoading,
  hasConversations,
  onNavigateToConversation,
  onDeleteConversation,
}: ConversationsSectionProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-200">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">
          Recent Conversations
        </h2>
        <Badge
          variant="outline"
          className="px-3 py-1 bg-background/50 backdrop-blur-sm"
        >
          {conversationCount} conversations
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
  onNavigate: (convId: string) => void;
  onDelete: (convId: string) => void;
}

const ConversationCard = memo(function ConversationCard({
  conversation,
  index,
  onNavigate,
  onDelete,
}: ConversationCardProps) {
  return (
    <Card
      className="group relative overflow-hidden border bg-card hover:shadow-md transition-all duration-300 cursor-pointer"
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={() => onNavigate(conversation.id)}
    >
      <CardContent className="p-6 flex flex-col h-full">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
            <MessageCircle className="h-5 w-5" />
          </div>
          <Badge
            variant="secondary"
            className="bg-secondary/50 backdrop-blur-sm text-xs font-normal"
          >
            ACTIVE
          </Badge>
        </div>

        <h3 className="text-lg font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {conversation.title}
        </h3>

        <div className="mt-auto pt-4 flex items-center justify-between text-xs text-muted-foreground border-t border-border/30">
          <span>
            {conversation.createdAt.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span className="font-mono opacity-50">
            ID: {conversation.id.slice(0, 4)}...
          </span>
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
            disabled={conversation.isDeleting}
          >
            {conversation.isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span className="sr-only">Delete conversation</span>
          </Button>
        </div>

        <div className="absolute inset-0 pointer-events-none border-2 border-primary/0 group-hover:border-primary/10 rounded-xl transition-all duration-300" />
      </CardContent>
    </Card>
  );
});
