import type {
  MentorDashboardPresenterInteractions,
  MentorDashboardPresenterMeta,
  MentorDashboardPresenterStatus,
  MentorDashboardPresenterViewModel,
} from "../interfaceAdapters/presenters/useMentorDashboardPresenter";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Loader2, Search } from "lucide-react";
import Link from "next/link";

export interface MentorDashboardStudentItem {
  id: string;
  name: string;
  avatar?: string;
  lastActivity: Date;
  status: "active" | "idle" | "offline";
  recentChat: {
    summary: string;
    aiResponse: string;
    subject: string;
    timestamp: Date;
    needsReview: boolean;
  };
  totalChats: number;
  conversationId: string;
}

interface MentorDashboardViewProps {
  viewModel: MentorDashboardPresenterViewModel;
  status: MentorDashboardPresenterStatus;
  meta: MentorDashboardPresenterMeta;
  interactions: MentorDashboardPresenterInteractions;
}

const MentorDashboardView = ({
  viewModel,
  status,
  meta,
  interactions,
}: MentorDashboardViewProps) => {
  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card px-6 py-6 shadow-sm sm:px-8 sm:py-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Mentor Dashboard
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              担当中の新入社員一覧
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={interactions.requestRefresh}
            disabled={status.isLoading}
            className="h-9 shadow-sm transition-all hover:bg-accent hover:text-accent-foreground"
          >
            {status.isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            再読み込み
          </Button>
        </div>
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={viewModel.searchQuery}
            onChange={(event) => viewModel.onChangeSearch(event.target.value)}
            placeholder="新入社員や科目で検索"
            aria-label="新入社員や科目で検索"
            className="h-11 pl-10 shadow-sm transition-all focus-visible:ring-primary"
          />
        </div>
        {status.error ? (
          <div className="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive animate-in fade-in slide-in-from-top-2">
            <span className="font-medium">{status.error.message}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={interactions.clearError}
              className="h-auto p-0 hover:bg-transparent text-destructive hover:text-destructive/80"
            >
              閉じる
            </Button>
          </div>
        ) : null}
      </header>

      {status.isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed bg-card/50 px-6 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-lg">担当情報を読み込み中...</span>
        </div>
      ) : null}

      {!status.isLoading && (
        <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {viewModel.students.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-card/50 py-20 text-center">
              <div className="rounded-full bg-muted p-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-semibold">担当が見つかりません</h3>
                <p className="text-muted-foreground">
                  検索条件を変更するか、担当の割り当てを確認してください。
                </p>
              </div>
            </div>
          ) : (
            viewModel.students.map((student) => (
              <MentorDashboardStudentCard
                key={student.conversationId}
                student={student}
                isSelected={meta.selectedStudentId === student.id}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MentorDashboardView;

interface MentorDashboardStudentCardProps {
  student: MentorDashboardStudentItem;
  isSelected: boolean;
}

const MentorDashboardStudentCard = ({
  student,
  isSelected,
}: MentorDashboardStudentCardProps) => {
  return (
    <Card
      className={`group relative overflow-hidden transition-all hover:shadow-lg ${
        isSelected
          ? "border-primary ring-1 ring-primary"
          : "hover:border-primary/50"
      }`}
    >
      <CardContent className="flex flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-background shadow-sm">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                {student.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h2 className="text-lg font-bold leading-none">{student.name}</h2>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    student.status === "active" ? "default" : "secondary"
                  }
                  className="capitalize px-2 py-0.5 text-xs font-medium"
                >
                  {student.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  最終: {student.lastActivity.toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          {student.recentChat.needsReview && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>レビューが必要です</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-xl bg-muted/50 p-4 transition-colors group-hover:bg-muted/80">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {student.recentChat.subject}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {student.recentChat.timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          <div className="space-y-1.5">
            {student.recentChat.summary ? (
              <p className="font-medium text-sm leading-relaxed line-clamp-2 text-foreground/90">
                {student.recentChat.summary}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                サマリーなし
              </p>
            )}
            {student.recentChat.aiResponse && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                <span className="font-medium text-primary/70">AI:</span>{" "}
                {student.recentChat.aiResponse}
              </p>
            )}
          </div>
        </div>

        <div className="mt-auto pt-2">
          <Link
            href={`/mentor/chat/${encodeURIComponent(student.conversationId)}`}
            className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            チャット詳細を確認
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
