import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Loader2, MessageCircle, ChevronLeft, Edit3 } from "lucide-react";

interface MentorChatMessage {
  id: string;
  role: "NEW_HIRE" | "ASSISTANT";
  content: string;
  createdAt: Date;
  status?: "DRAFT" | "PARTIAL" | "DONE" | "CANCELLED";
  feedbacks: {
    id: string;
    authorName: string;
    content: string;
    createdAt: Date;
  }[];
}

interface MentorStudentChatViewProps {
  conversationTitle: string;
  studentName: string;
  mentorName: string;
  messages: MentorChatMessage[];
  feedbackDrafts: Record<string, string>;
  feedbackSubmitting: Record<string, boolean>;
  feedbackErrors: Record<string, string | null | undefined>;
  editingFlags: Record<string, boolean>;
  onFeedbackDraftChange: (messageId: string, value: string) => void;
  onToggleEditing: (messageId: string, isEditing: boolean) => void;
  onSubmitFeedback: (messageId: string) => void;
}

const MentorStudentChatView = ({
  conversationTitle,
  studentName,
  mentorName,
  messages,
  feedbackDrafts,
  feedbackSubmitting,
  feedbackErrors,
  editingFlags,
  onFeedbackDraftChange,
  onToggleEditing,
  onSubmitFeedback,
}: MentorStudentChatViewProps) => {
  return (
    <div className="mx-auto w-full max-w-5xl flex flex-col gap-8">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card px-6 py-6 shadow-sm sm:px-8 sm:py-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-2 h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            <Link href="/mentor" aria-label="戻る">
              <ChevronLeft className="mr-1 h-4 w-4" /> 戻る
            </Link>
          </Button>
          <span className="text-border">/</span>
          <span className="text-sm font-medium">チャット詳細</span>
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {conversationTitle}
          </h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              <span className="font-medium text-foreground">{studentName}</span>
            </div>
            <span className="text-border">|</span>
            <span>メンター: {mentorName}</span>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-8">
        <div className="flex flex-col gap-2">
          {messages.map((message, index) => {
            const isStudent = message.role === "NEW_HIRE";
            const hasFeedback = message.feedbacks.length > 0;
            const isEditing = editingFlags[message.id] ?? false;
            const draftValue =
              feedbackDrafts[message.id] ??
              (hasFeedback ? message.feedbacks[0]?.content ?? "" : "");
            const submitLabel = hasFeedback
              ? "フィードバックを更新"
              : "フィードバックを送信";
            const prev = index > 0 ? messages[index - 1] : null;
            const isTurnChange = !prev || prev.role !== message.role;
            const marginClass =
              index === 0 ? "" : isTurnChange ? "mt-8" : "mt-2";

            return (
              <div
                key={message.id}
                className={`flex w-full flex-col ${
                  isStudent ? "items-end" : "items-start"
                } ${marginClass}`}
              >
                <div
                  className={`flex max-w-[85%] sm:max-w-[75%] flex-col ${
                    isStudent ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`mb-1.5 flex items-center gap-2 px-1 text-xs uppercase tracking-wider text-muted-foreground ${
                      isStudent ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <span className="font-semibold">
                      {isStudent ? "New Hire" : "Assistant"}
                    </span>
                    <span>•</span>
                    <span>
                      {message.createdAt.toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div
                    className={`group relative rounded-2xl px-5 py-4 shadow-sm transition-all ${
                      isStudent
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted/50 text-foreground rounded-tl-sm hover:bg-muted/80"
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>

                    {!isStudent && (
                      <div className="absolute -right-12 top-0 opacity-0 transition-opacity group-hover:opacity-100">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full bg-background shadow-sm hover:bg-accent"
                              onClick={() => onToggleEditing(message.id, true)}
                              aria-label={
                                hasFeedback ? "編集" : "フィードバックを書く"
                              }
                            >
                              <Edit3 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            {hasFeedback ? "編集" : "フィードバックを書く"}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </div>

                  {message.status && (
                    <Badge
                      variant="outline"
                      className="mt-2 text-[10px] uppercase tracking-widest"
                    >
                      {message.status.toLowerCase()}
                    </Badge>
                  )}
                </div>

                {message.feedbacks.length > 0 && (
                  <div
                    className={`mt-3 w-full max-w-[85%] sm:max-w-[75%] ${
                      isStudent ? "pr-2" : "pl-2"
                    }`}
                  >
                    <MentorFeedbackSection
                      messageId={message.id}
                      isAssistant={message.role === "ASSISTANT"}
                      feedbacks={message.feedbacks}
                      isEditing={isEditing}
                      onToggleEditing={(next) =>
                        onToggleEditing(message.id, next)
                      }
                    />
                  </div>
                )}

                {message.role === "ASSISTANT" ? (
                  <Dialog
                    open={isEditing}
                    onOpenChange={(open) => onToggleEditing(message.id, open)}
                  >
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>学生へのフィードバック</DialogTitle>
                        <DialogDescription>
                          このメッセージに対する具体的なアドバイスや修正案を入力してください。
                        </DialogDescription>
                      </DialogHeader>
                      <form
                        className="space-y-4 mt-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          onSubmitFeedback(message.id);
                        }}
                      >
                        <div className="space-y-2">
                          <Label
                            htmlFor={`mentor-feedback-${message.id}`}
                            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                          >
                            フィードバック内容
                          </Label>
                          <Textarea
                            id={`mentor-feedback-${message.id}`}
                            value={draftValue}
                            onChange={(event) =>
                              onFeedbackDraftChange(
                                message.id,
                                event.target.value
                              )
                            }
                            rows={6}
                            placeholder="例: この部分はもう少し具体的に説明すると良いでしょう..."
                            autoFocus
                            className="resize-none text-base leading-relaxed"
                            onKeyDown={(e) => {
                              if (
                                (e.metaKey || e.ctrlKey) &&
                                e.key === "Enter"
                              ) {
                                e.preventDefault();
                                onSubmitFeedback(message.id);
                              }
                            }}
                          />
                          <p className="text-xs text-muted-foreground text-right">
                            Cmd/Ctrl + Enter で送信
                          </p>
                        </div>
                        {feedbackErrors[message.id] ? (
                          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                            {feedbackErrors[message.id]}
                          </div>
                        ) : null}
                        <DialogFooter className="gap-2 sm:gap-0">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onToggleEditing(message.id, false)}
                          >
                            キャンセル
                          </Button>
                          <Button
                            type="submit"
                            disabled={feedbackSubmitting[message.id] ?? false}
                            className="min-w-[100px]"
                          >
                            {feedbackSubmitting[message.id] ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                                送信中
                              </>
                            ) : (
                              submitLabel
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                ) : null}
              </div>
            );
          })}

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <MessageCircle className="mb-4 h-12 w-12 opacity-20" />
              <p>まだメッセージがありません。</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default MentorStudentChatView;

function MentorFeedbackSection({
  messageId,
  isAssistant,
  feedbacks,
  isEditing,
  onToggleEditing,
}: {
  messageId: string;
  isAssistant: boolean;
  feedbacks: {
    id: string;
    authorName: string;
    content: string;
    createdAt: Date;
  }[];
  isEditing: boolean;
  onToggleEditing: (next: boolean) => void;
}) {
  const [open, setOpen] = useState<boolean>(false);
  const contentId = `mentor-fb-content-${messageId}`;

  // 編集開始時は自動的に展開
  useEffect(() => {
    if (isEditing) setOpen(true);
  }, [isEditing]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full">
      <div className="flex items-center gap-2">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            aria-controls={contentId}
            aria-expanded={open}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            フィードバック ({feedbacks.length})
            <span className="sr-only">Toggle feedback</span>
          </Button>
        </CollapsibleTrigger>
        <div className="h-px flex-1 bg-border/50"></div>
      </div>

      <CollapsibleContent
        id={contentId}
        className="space-y-3 pt-2 animate-in slide-in-from-top-2 fade-in duration-200"
      >
        {/* 先頭フィードバック */}
        <div className="relative rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                {feedbacks[0]?.authorName.slice(0, 1)}
              </div>
              <span className="font-medium text-foreground">
                {feedbacks[0]?.authorName}
              </span>
            </div>
            <span>{feedbacks[0]?.createdAt.toLocaleString()}</span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {feedbacks[0]?.content}
          </p>
        </div>

        {/* 残りを折りたたみ */}
        {feedbacks.length > 1 ? (
          <Collapsible>
            <CollapsibleTrigger className="flex w-full items-center justify-center gap-1 py-1 text-xs text-muted-foreground hover:text-foreground">
              <span>他 {feedbacks.length - 1} 件のフィードバックを表示</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2 pl-4 border-l-2 border-border/50">
              {feedbacks.slice(1).map((fb) => (
                <div key={fb.id} className="rounded-lg bg-muted/30 p-3">
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium">{fb.authorName}</span>
                    <span>{fb.createdAt.toLocaleString()}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {fb.content}
                  </p>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}
