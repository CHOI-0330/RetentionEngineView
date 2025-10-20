import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
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
    <div className="flex flex-col gap-6">
      <header className="rounded-2xl border bg-card px-4 py-3 sm:px-6 sm:py-4">
        <div className="mb-2">
          <Button asChild variant="ghost" size="sm" className="px-2">
            <Link href="/mentor" aria-label="戻る">
              <ChevronLeft className="mr-1 h-4 w-4" /> 戻る
            </Link>
          </Button>
        </div>
        <h1 className="text-xl font-semibold">{conversationTitle}</h1>
        <p className="text-sm text-muted-foreground">
          学生: {studentName} / メンター: {mentorName}
        </p>
      </header>

      <section className="rounded-2xl border bg-card p-4 sm:p-6">
        <div className="flex flex-col">
          {messages.map((message, index) => {
            const isStudent = message.role === "NEW_HIRE";
            const hasFeedback = message.feedbacks.length > 0;
            const isEditing = editingFlags[message.id] ?? false;
            const draftValue = feedbackDrafts[message.id] ?? (hasFeedback ? message.feedbacks[0]?.content ?? "" : "");
            const submitLabel = hasFeedback ? "フィードバックを更新" : "フィードバックを送信";
            const prev = index > 0 ? messages[index - 1] : null;
            const isTurnChange = !prev || prev.role !== message.role;
            const marginClass = index === 0 ? "" : isTurnChange ? "mt-6" : "mt-3";
            return (
              <div
                key={message.id}
                className={`flex w-full flex-col ${isStudent ? "items-end" : "items-start"} ${marginClass}`}
              >
                <Card className={isStudent ? "w-fit sm:max-w-[70%] bg-primary text-primary-foreground ml-auto mr-2" : "w-fit sm:max-w-[70%] bg-muted"}>
                  <CardContent className="space-y-2 p-3 sm:p-4">
                    <div className={`flex items-center ${isStudent ? "justify-end" : "justify-between"} text-xs uppercase tracking-wide`}>
                      <span>{isStudent ? "New Hire" : "Assistant"}</span>
                      <span>{message.createdAt.toLocaleString()}</span>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    {message.status && (
                      <Badge variant="outline" className="text-xs">
                        {message.status.toLowerCase()}
                      </Badge>
                    )}
                    {!isStudent ? (
                      <div className="mt-2 flex items-center justify-end pt-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => onToggleEditing(message.id, true)}
                              aria-label={hasFeedback ? "編集" : "フィードバックを書く"}
                              aria-expanded={isEditing}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {hasFeedback ? "編集" : "フィードバックを書く"}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
                {message.feedbacks.length ? (
                  <MentorFeedbackSection
                    messageId={message.id}
                    isAssistant={message.role === "ASSISTANT"}
                    feedbacks={message.feedbacks}
                    isEditing={isEditing}
                    onToggleEditing={(next) => onToggleEditing(message.id, next)}
                  />
                ) : null}
                {/* ボタンはメッセージボックス内に配置したため、下部の行は不要 */}

                {message.role === "ASSISTANT" ? (
                  <Dialog open={isEditing} onOpenChange={(open) => onToggleEditing(message.id, open)}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>学生へのフィードバック</DialogTitle>
                        <DialogDescription>対象メッセージに対するフィードバックを入力してください。</DialogDescription>
                      </DialogHeader>
                      <form
                        className="space-y-3"
                        onSubmit={(event) => {
                          event.preventDefault();
                          onSubmitFeedback(message.id);
                        }}
                      >
                        <div className="space-y-1">
                          <Label htmlFor={`mentor-feedback-${message.id}`} className="text-xs uppercase tracking-wide text-muted-foreground">
                            学生へのフィードバック
                          </Label>
                          <Textarea
                            id={`mentor-feedback-${message.id}`}
                            value={draftValue}
                            onChange={(event) => onFeedbackDraftChange(message.id, event.target.value)}
                            rows={5}
                            placeholder="気づきやアドバイスを入力してください"
                            autoFocus
                            onKeyDown={(e) => {
                              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                                e.preventDefault();
                                onSubmitFeedback(message.id);
                              }
                            }}
                          />
                        </div>
                        {feedbackErrors[message.id] ? (
                          <p className="text-sm text-destructive" role="alert" aria-live="polite">{feedbackErrors[message.id]}</p>
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
                            aria-busy={feedbackSubmitting[message.id] ?? false}
                          >
                            {feedbackSubmitting[message.id] ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 送信中...
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
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだメッセージがありません。</p>
          ) : null}
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
  feedbacks: { id: string; authorName: string; content: string; createdAt: Date }[];
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
    <div className="mt-3 w-full sm:max-w-[70%]">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <button
            type="button"
            className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-accent hover:text-accent-foreground"
            onClick={() => setOpen((v) => !v)}
            aria-controls={contentId}
            aria-expanded={open}
            title="フィードバックを確認"
          >
            <MessageCircle className="h-4 w-4" /> フィードバック {feedbacks.length}件
          </button>
          {/* 編集はメッセージボックス内ボタンに統一 */}
        </div>
        <CollapsibleContent id={contentId} className="mt-2 space-y-3">
          {/* 先頭フィードバック */}
          <Card className="border-dashed bg-muted/30">
            <CardContent className="space-y-2 p-3 sm:p-4 text-base">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{feedbacks[0]?.authorName}</span>
                <span>{feedbacks[0]?.createdAt.toLocaleString()}</span>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{feedbacks[0]?.content}</p>
            </CardContent>
          </Card>
          {/* 残りを折りたたみ */}
          {feedbacks.length > 1 ? (
            <Collapsible>
              <CollapsibleTrigger className="text-xs text-primary underline">
                さらに表示（{feedbacks.length - 1}）
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {feedbacks.slice(1).map((fb) => (
                  <div key={fb.id} className="rounded-md border bg-background p-2 sm:p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{fb.authorName}</span>
                      <span>{fb.createdAt.toLocaleString()}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap leading-relaxed">{fb.content}</p>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ) : null}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
