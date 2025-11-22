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
    <div className="space-y-6">
      <header className="flex flex-col gap-3 rounded-2xl border bg-card px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Mentor Dashboard
            </p>
            <h1 className="text-xl font-semibold">担当中の新入社員一覧</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={interactions.requestRefresh}
            disabled={status.isLoading}
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
            className="pl-9"
          />
        </div>
        {status.error ? (
          <div className="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <span>{status.error.message}</span>
            <Button size="sm" variant="ghost" onClick={interactions.clearError}>
              閉じる
            </Button>
          </div>
        ) : null}
      </header>

      {status.isLoading ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-card/60 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>担当情報を読み込み中...</span>
        </div>
      ) : null}

      {!status.isLoading && (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {viewModel.students.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center text-center text-lg text-muted-foreground">
              現在表示できる担当はありません。
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
    <Card className={isSelected ? "border-primary shadow-lg" : undefined}>
      <CardContent className="flex flex-col gap-4 p-5 sm:gap-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:pr-8">
        <div className="flex items-start gap-4 pr-4 lg:pr-6 w-full">
          <Avatar className="h-14 w-14">
            <AvatarFallback>{student.name.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <h2 className="text-lg font-semibold">{student.name}</h2>
              <Badge variant="secondary" className="w-fit capitalize">
                {student.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              最終活動: {student.lastActivity.toLocaleString()}
            </p>
            <div className="w-full rounded-lg border bg-card p-3 sm:p-4 text-sm shadow-sm flex flex-col justify-between overflow-hidden" style={{ height: "11rem" }}>
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">トピック</span>
                <span
                  className="block text-base font-semibold text-foreground whitespace-nowrap overflow-hidden"
                  title={student.recentChat.subject}
                  style={{ textOverflow: "ellipsis" }}
                >
                  {student.recentChat.subject}
                </span>
                <span className="text-xs text-muted-foreground">
                  {student.recentChat.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="mt-3 space-y-2 overflow-hidden">
                {student.recentChat.summary ? (
                  <p className="font-medium text-foreground line-clamp-2" title={student.recentChat.summary}>
                    {student.recentChat.summary}
                  </p>
                ) : null}
                {student.recentChat.aiResponse ? (
                  <p className="text-muted-foreground line-clamp-2" title={student.recentChat.aiResponse}>
                    {student.recentChat.aiResponse}
                  </p>
                ) : null}
              </div>
              {student.recentChat.needsReview ? (
                <div className="mt-3 flex justify-end">
                  <Badge variant="destructive" className="w-fit">
                    レビューが必要
                  </Badge>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="w-full pr-4 lg:justify-self-end lg:pl-3 space-y-2">
          <Link
            className="inline-flex w-full justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition"
            href={`/mentor/chat/${encodeURIComponent(student.conversationId)}`}
          >
            チャットを見る
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
