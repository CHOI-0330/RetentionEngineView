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
import { Loader2, Search, ThumbsDown, ThumbsUp } from "lucide-react";
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
      <header className="flex flex-col gap-3 rounded-2xl border bg-card px-6 py-4">
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
        <div className="relative max-w-md">
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

      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {viewModel.students.map((student) => (
          <MentorDashboardStudentCard
            key={student.conversationId}
            student={student}
            isSelected={meta.selectedStudentId === student.id}
            isSubmitting={Boolean(meta.qualitySubmitting[student.id])}
            onFeedback={(isPositive) => viewModel.onFeedback(student.id, isPositive)}
          />
        ))}

        {viewModel.students.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 py-16 text-center text-sm text-muted-foreground">
            現在表示できる担当はありません。
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default MentorDashboardView;

interface MentorDashboardStudentCardProps {
  student: MentorDashboardStudentItem;
  isSelected: boolean;
  isSubmitting: boolean;
  onFeedback: (isPositive: boolean) => void;
}

const MentorDashboardStudentCard = ({
  student,
  isSelected,
  isSubmitting,
  onFeedback,
}: MentorDashboardStudentCardProps) => {
  return (
    <Card className={isSelected ? "border-primary" : undefined}>
      <CardContent className="flex flex-col gap-4 p-5 sm:gap-5 lg:flex-row lg:items-start lg:gap-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback>{student.name.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <h2 className="text-lg font-semibold">{student.name}</h2>
              <Badge variant="secondary" className="w-fit capitalize">
                {student.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              最終活動: {student.lastActivity.toLocaleString()} / 総チャット数: {student.totalChats}
            </p>
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">トピック</span>
                  <span
                    className="mt-1 block text-base font-semibold text-foreground sm:line-clamp-2"
                    title={student.recentChat.subject}
                  >
                    {student.recentChat.subject}
                  </span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {student.recentChat.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="mt-3 font-medium text-foreground">
                新入社員: {student.recentChat.summary || "(メッセージなし)"}
              </p>
              <p className="mt-1 text-muted-foreground">
                AI: {student.recentChat.aiResponse || "(未回答)"}
              </p>
              {student.recentChat.needsReview ? (
                <Badge variant="destructive" className="mt-2 w-fit">
                  レビューが必要
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end lg:ml-auto">
          <Button
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={() => onFeedback(true)}
            className="min-w-[140px] justify-center"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 送信中...
              </>
            ) : (
              <>
                <ThumbsUp className="mr-2 h-4 w-4" /> 良かった
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={() => onFeedback(false)}
            className="min-w-[140px] justify-center"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 送信中...
              </>
            ) : (
              <>
                <ThumbsDown className="mr-2 h-4 w-4" /> 改善必要
              </>
            )}
          </Button>
          <Button asChild variant="secondary" size="sm" className="justify-center">
            <Link href={`/mentor/chat/${encodeURIComponent(student.conversationId)}`}>
              チャットを見る
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
