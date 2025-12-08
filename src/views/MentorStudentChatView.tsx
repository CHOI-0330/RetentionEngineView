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
import { Loader2, MessageCircle, ChevronLeft } from "lucide-react";
import MarkdownRendererView from "../components/MarkdownRenderer";

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
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const anchor = bottomRef.current;
    const viewport = scrollAreaRef.current;
    if (!anchor || !viewport) return;

    const smoothToBottom = () => {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      anchor.scrollIntoView({ behavior: "smooth", block: "end" });
    };

    smoothToBottom();
    const timeoutId = setTimeout(smoothToBottom, 120);
    return () => clearTimeout(timeoutId);
  }, [messages.length]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-3">
        <div className="flex items-center gap-4">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Link href="/mentor" aria-label="戻る">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              {conversationTitle}
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                <span className="font-medium text-foreground">
                  {studentName}
                </span>
              </div>
              <span className="text-border">|</span>
              <span>メンター: {mentorName}</span>
            </div>
          </div>
        </div>
      </header>

      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          {messages.map((message, index) => {
            const isStudent = message.role === "NEW_HIRE";
            const hasFeedback = message.feedbacks.length > 0;
            const isEditing = editingFlags[message.id] ?? false;
            const isAssistantDraft =
              message.role === "ASSISTANT" &&
              (message.status === "DRAFT" || message.status === "PARTIAL");
            // 複数フィードバック対応: 入力欄は常に空、既存内容は表示しない
            const draftValue = feedbackDrafts[message.id] ?? "";
            const feedbackCount = message.feedbacks.length;
            const isAdditionalFeedback = feedbackCount > 0;
            const prev = index > 0 ? messages[index - 1] : null;
            const isTurnChange = !prev || prev.role !== message.role;

            return (
              <div
                key={message.id}
                className={`flex w-full ${
                  isStudent ? "justify-end" : "justify-start"
                } ${isTurnChange ? "mt-4" : ""}`}
              >
                <div
                  className={`flex max-w-[85%] flex-col ${
                    isStudent ? "items-end" : "items-start"
                  }`}
                >
                  <div className="flex items-end gap-2">
                    {!isStudent && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-primary/5 text-[10px] font-bold text-primary">
                        AI
                      </div>
                    )}

                    <div
                      className={`group relative rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                        isStudent
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-muted/50 text-foreground rounded-tl-sm hover:bg-muted/80"
                      } ${hasFeedback ? "ring-2 ring-blue-400/50" : ""}`}
                    >
                      {isAssistantDraft ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>生成中...</span>
                        </div>
                      ) : message.role === "ASSISTANT" ? (
                        <MarkdownRendererView
                          content={message.content}
                          className="space-y-2 break-words [&>pre]:mt-2 [&>pre]:bg-background/60 [&>pre]:text-xs [&>pre]:text-foreground"
                        />
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}

                      {!isStudent && (
                        <div className="absolute -right-12 top-0 opacity-0 group-hover:opacity-100">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full relative bg-blue-50 hover:bg-blue-100"
                                onClick={() =>
                                  onToggleEditing(message.id, true)
                                }
                              >
                                <MessageCircle className="h-4 w-4 text-blue-600" />
                                {isAdditionalFeedback && (
                                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">
                                    {feedbackCount}
                                  </span>
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              {isAdditionalFeedback
                                ? `フィードバックを追加 (${feedbackCount}件済)`
                                : "フィードバックを書く"}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    className={`mt-1 flex items-center gap-2 px-1 text-[10px] text-muted-foreground ${
                      isStudent ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <span>
                      {message.createdAt.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {message.status && message.status !== "DONE" ? (
                      <Badge
                        variant="outline"
                        className="h-4 px-1 text-[9px] uppercase tracking-widest"
                      >
                        {message.status.toLowerCase()}
                      </Badge>
                    ) : null}
                  </div>

                  {message.feedbacks.length > 0 && (
                    <div
                      className={`mt-3 w-full ${isStudent ? "pr-1" : "pl-10"}`}
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
                      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5 text-blue-600" />
                            フィードバック
                            {isAdditionalFeedback && (
                              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                {feedbackCount + 1}件目
                              </Badge>
                            )}
                          </DialogTitle>
                          <DialogDescription>
                            このメッセージに対するフィードバックを入力してください。
                          </DialogDescription>
                        </DialogHeader>

                        {/* 既存フィードバック一覧（追加時のみ表示） */}
                        {isAdditionalFeedback && (
                          <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 mt-2">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageCircle className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-semibold text-blue-800">
                                既存のフィードバック ({feedbackCount}件)
                              </span>
                            </div>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {message.feedbacks.map((fb, idx) => (
                                <div
                                  key={fb.id}
                                  className="rounded-lg bg-white/80 p-3 border border-blue-100"
                                >
                                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                                    <div className="flex items-center gap-2">
                                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600">
                                        {fb.authorName.slice(0, 1)}
                                      </div>
                                      <div className="leading-tight">
                                        <span className="block text-foreground font-semibold text-xs">
                                          {fb.authorName}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                          {fb.createdAt.toLocaleString("ja-JP", {
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </span>
                                      </div>
                                    </div>
                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[9px] h-4 px-1.5">
                                      {idx + 1}件目
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-foreground/80 line-clamp-2 pl-7">
                                    {fb.content}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

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
                              className="text-xs font-semibold uppercase tracking-wide text-blue-700 flex items-center gap-2"
                            >
                              <MessageCircle className="h-3 w-3" />
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
                              className="resize-none text-base leading-relaxed border-blue-200 focus:border-blue-400 focus:ring-blue-400"
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
                              className="min-w-[100px] bg-blue-600 hover:bg-blue-700"
                            >
                              {feedbackSubmitting[message.id] ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  送信中
                                </>
                              ) : (
                                <>
                                  <MessageCircle className="mr-1.5 h-4 w-4" />
                                  送信
                                </>
                              )}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  ) : null}
                </div>
              </div>
            );
          })}

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <MessageCircle className="mb-4 h-12 w-12 opacity-20" />
              <p>まだメッセージがありません。</p>
            </div>
          )}

          <div ref={bottomRef} className="h-px" />
        </div>
      </div>
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
            className="h-6 gap-1.5 px-2 text-[10px] font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700"
            aria-controls={contentId}
            aria-expanded={open}
          >
            <MessageCircle className="h-3 w-3" />
            フィードバック ({feedbacks.length})
            <span className="sr-only">フィードバック表示</span>
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent
        id={contentId}
        className="space-y-2 pt-2"
      >
        {/* 統一されたフィードバック表示 */}
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
          <div className="space-y-3">
            {feedbacks.map((fb, idx) => (
              <div
                key={fb.id}
                className={`rounded-lg bg-white/80 p-3 border border-blue-100 ${
                  idx > 0 ? "mt-2" : ""
                }`}
              >
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-600">
                      {fb.authorName.slice(0, 1)}
                    </div>
                    <div className="leading-tight">
                      <span className="block text-foreground font-semibold text-sm">
                        {fb.authorName}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {fb.createdAt.toLocaleString("ja-JP", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px]">
                    {idx + 1}件目
                  </Badge>
                </div>
                <div className="prose prose-sm max-w-none text-foreground/90">
                  <MarkdownRendererView content={fb.content} className="space-y-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
