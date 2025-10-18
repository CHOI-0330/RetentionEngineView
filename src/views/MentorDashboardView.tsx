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
}

interface MentorDashboardViewProps {
  viewModel: MentorDashboardPresenterViewModel;
  status: MentorDashboardPresenterStatus;
  meta: MentorDashboardPresenterMeta;
  interactions: MentorDashboardPresenterInteractions;
}

const MentorDashboardView = ({ viewModel, status, meta, interactions }: MentorDashboardViewProps) => {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 rounded-2xl border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Mentor Dashboard</p>
            <h1 className="text-xl font-semibold">担当中の新入社員一覧</h1>
          </div>
          <Button variant="outline" size="sm" onClick={interactions.requestRefresh} disabled={status.isLoading}>
            {status.isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            再読み込み
          </Button>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={viewModel.searchQuery}
            onChange={(event) => viewModel.onChangeSearch(event.target.value)}
            placeholder="若手社員や科目で検索"
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

      <div className="grid gap-4">
        {viewModel.students.map((student) => {
          const qualitySubmitting = Boolean(meta.qualitySubmitting[student.id]);
          const isSelected = meta.selectedStudentId === student.id;
          return (
            <Card key={student.id} className={isSelected ? "border-primary" : undefined}>
              <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:gap-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback>{student.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold">{student.name}</h2>
                      <Badge variant="secondary" className="capitalize">
                        {student.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      最終活動: {student.lastActivity.toLocaleString()} / 総チャット数: {student.totalChats}
                    </p>
                    <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{student.recentChat.subject}</span>
                        <span>{student.recentChat.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p className="mt-2 font-medium text-foreground">若手社員: {student.recentChat.summary || "(メッセージなし)"}</p>
                      <p className="mt-1 text-muted-foreground">AI: {student.recentChat.aiResponse || "(未回答)"}</p>
                      {student.recentChat.needsReview ? (
                        <Badge variant="destructive" className="mt-2">レビューが必要</Badge>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="ml-auto flex flex-col items-end gap-2 sm:flex-row">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={qualitySubmitting}
                    onClick={() => viewModel.onFeedback(student.id, true)}
                  >
                    <ThumbsUp className="mr-2 h-4 w-4" /> 良かった
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={qualitySubmitting}
                    onClick={() => viewModel.onFeedback(student.id, false)}
                  >
                    <ThumbsDown className="mr-2 h-4 w-4" /> 改善必要
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => viewModel.onViewStudentChat(student.id)}>
                    チャットを見る
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

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
