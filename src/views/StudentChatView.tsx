import type {
  StudentChatPresenterInteractions,
  StudentChatPresenterMeta,
  StudentChatPresenterStatus,
  StudentChatViewModel,
} from "../interfaceAdapters/presenters/useStudentChatPresenter";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import { AlertTriangle, Loader2, MessageCircle, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../components/ui/collapsible";
import { Textarea } from "../components/ui/textarea";
import { Skeleton } from "../components/ui/skeleton";

interface ConversationSummary {
  convId: string;
  title: string;
  lastActiveAt: string;
}

interface MentorOption {
  mentorId: string;
  displayName: string;
  email?: string;
}

interface CreateConversationDialogProps {
  isOpen: boolean;
  title: string;
  mentorOptions: MentorOption[];
  selectedMentorId: string | null;
  isSubmitting: boolean;
  onOpen: () => void;
  onClose: () => void;
  onChangeTitle: (value: string) => void;
  onChangeMentor: (value: string | null) => void;
  onSubmit: () => void;
}

interface StudentChatViewProps {
  conversationTitle: string;
  conversationOptions?: ConversationSummary[];
  selectedConversationId?: string;
  onConversationChange?: (convId: string) => void;
  createDialog?: CreateConversationDialogProps;
  viewModel: StudentChatViewModel;
  status: StudentChatPresenterStatus;
  meta: StudentChatPresenterMeta;
  interactions: StudentChatPresenterInteractions;
}

const StudentChatView = ({
  conversationTitle,
  conversationOptions,
  selectedConversationId,
  onConversationChange,
  createDialog,
  viewModel,
  status,
  meta,
  interactions,
}: StudentChatViewProps) => {
  const feedbackByMessageId = viewModel.mentorFeedbacks.reduce<Record<string, StudentChatViewModel["mentorFeedbacks"]>>(
    (acc, feedback) => {
      acc[feedback.messageId] = [...(acc[feedback.messageId] ?? []), feedback];
      return acc;
    },
    {}
  );

  const showConversationPicker = Boolean(onConversationChange) && (conversationOptions?.length ?? 0) > 1;
  const pickerValue =
    selectedConversationId ??
    conversationOptions?.[0]?.convId ??
    "";

  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (meta.isHistoryLoading) return;
    const anchor = bottomRef.current;
    const viewport = scrollAreaRef.current?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
    if (!anchor) return;

    // Prefer a single smooth path to avoid jank
    const smoothToBottom = () => {
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      }
      anchor.scrollIntoView({ behavior: "smooth", block: "end" });
      const comp = composerRef.current;
      if (comp) comp.scrollIntoView({ behavior: "smooth", block: "end" });
    };

    smoothToBottom();
    const rafId = requestAnimationFrame(smoothToBottom);
    const timeoutId = setTimeout(smoothToBottom, 140);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [viewModel.messages.length, status.isAwaitingAssistant, meta.isHistoryLoading]);

  return (
    <div className="flex min-h-[80vh] flex-col overflow-hidden rounded-2xl border bg-card">
      <ConversationHeader
        conversationTitle={conversationTitle}
        conversationOptions={conversationOptions}
        pickerValue={pickerValue}
        showConversationPicker={showConversationPicker}
        onConversationChange={onConversationChange}
        createDialog={createDialog}
      />
      {status.error ? (
        <div
          className="border-b border-dashed border-destructive/40 bg-destructive/5 px-6 py-3 text-sm text-destructive"
          aria-live="polite"
          role="status"
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {status.error.message}
            </span>
            <Button size="sm" variant="ghost" onClick={interactions.clearError}>
              閉じる
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-4 overflow-hidden pl-4 pr-0 py-4 sm:pl-6 sm:pr-0 sm:py-6">
        <section className="flex h-full w-full flex-col overflow-hidden rounded-xl border bg-background/60">
          <div className="flex items-center justify-between border-b px-4 py-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full">チャット</Badge>
              {status.isAwaitingAssistant ? (
                <span className="flex items-center gap-2 text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" /> AI が回答中です…
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={interactions.requestOlderMessages}
                disabled={!meta.hasMoreHistory || meta.isHistoryLoading}
              >
                履歴を読み込む
              </Button>
            </div>
          </div>

          <StudentChatMessageList
            containerRef={scrollAreaRef}
            bottomRef={bottomRef}
            messages={viewModel.messages}
            feedbackByMessageId={feedbackByMessageId}
          />
          <ChatComposer
            containerRef={composerRef}
            value={viewModel.newMessage}
            onChange={viewModel.onChangeNewMessage}
            onSend={viewModel.onSend}
            canSend={meta.canSend}
            isSending={status.isSending}
          />
        </section>
      </div>
    </div>
  );
};

interface ConversationHeaderProps {
  conversationTitle: string;
  conversationOptions?: ConversationSummary[];
  pickerValue: string;
  showConversationPicker: boolean;
  onConversationChange?: (convId: string) => void;
  createDialog?: CreateConversationDialogProps;
}

const ConversationHeader = ({
  conversationTitle,
  conversationOptions,
  pickerValue,
  showConversationPicker,
  onConversationChange,
  createDialog,
}: ConversationHeaderProps) => (
  <header className="flex flex-col gap-4 border-b px-4 py-4 sm:px-6 md:flex-row md:items-start md:justify-between">
    <div className="flex flex-1 flex-col gap-3">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">会話</p>
        <h1 className="text-lg font-semibold">{conversationTitle}</h1>
      </div>
      {showConversationPicker ? (
        <>
          <Label htmlFor="student-conversation-picker" className="sr-only">
            会話を選択
          </Label>
          <Select value={pickerValue} onValueChange={(value) => onConversationChange?.(value)}>
            <SelectTrigger id="student-conversation-picker" className="md:w-auto md:min-w-[220px]" aria-label="会話を選択">
            <SelectValue placeholder="会話を選択" />
            </SelectTrigger>
            <SelectContent>
              {conversationOptions?.map((option) => (
                <SelectItem key={option.convId} value={option.convId}>
                  {option.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      ) : null}
    </div>
    <div className="flex items-center justify-between gap-3 md:flex-col md:items-end md:justify-start">
      {createDialog ? (
        <Dialog open={createDialog.isOpen} onOpenChange={(open) => (open ? createDialog.onOpen() : createDialog.onClose())}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={!createDialog.mentorOptions.length && !createDialog.isOpen}
            >
              新しい会話を開始
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新しい会話を作成</DialogTitle>
              <DialogDescription>会話タイトルとメンターを選択してください。</DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                createDialog.onSubmit();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="student-new-conversation-title">会話タイトル</Label>
                <Input
                  id="student-new-conversation-title"
                  value={createDialog.title}
                  onChange={(event) => createDialog.onChangeTitle(event.target.value)}
                  placeholder="例：CS 基礎トレーニング"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-new-conversation-mentor">メンター</Label>
                <Select
                  value={createDialog.selectedMentorId ?? undefined}
                  onValueChange={(value) => createDialog.onChangeMentor(value)}
                >
                  <SelectTrigger id="student-new-conversation-mentor">
                    <SelectValue placeholder="メンターを選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {createDialog.mentorOptions.map((option) => (
                      <SelectItem key={option.mentorId} value={option.mentorId}>
                        {option.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={createDialog.onClose}
                  disabled={createDialog.isSubmitting}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  disabled={createDialog.isSubmitting || !createDialog.selectedMentorId}
                >
                  {createDialog.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  作成
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
      <Avatar className="h-9 w-9">
        <AvatarFallback className="bg-primary/10 text-primary">NH</AvatarFallback>
      </Avatar>
    </div>
  </header>
);

interface StudentChatMessageListProps {
  containerRef: RefObject<HTMLDivElement>;
  bottomRef?: RefObject<HTMLDivElement>;
  messages: StudentChatViewModel["messages"];
  feedbackByMessageId: Record<string, StudentChatViewModel["mentorFeedbacks"]>;
}

const StudentChatMessageList = ({ containerRef, bottomRef, messages, feedbackByMessageId }: StudentChatMessageListProps) => (
  <div ref={containerRef} className="flex-1">
    <ScrollArea className="h-full pl-2 py-3 sm:pl-4">
      <div className="flex flex-col">
        {messages.map((message, index) => {
          const prev = index > 0 ? messages[index - 1] : null;
          const isTurnChange = !prev || prev.sender !== message.sender;
          const marginClass = index === 0 ? "" : isTurnChange ? "mt-6" : "mt-3";
          return (
            <div key={message.id} className={marginClass}>
              <StudentChatMessageBubble
                message={message}
                feedbacks={feedbackByMessageId[message.id] ?? []}
              />
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  </div>
);

interface StudentChatMessageBubbleProps {
  message: StudentChatViewModel["messages"][number];
  feedbacks: StudentChatViewModel["mentorFeedbacks"];
}

const StudentChatMessageBubble = ({ message, feedbacks }: StudentChatMessageBubbleProps) => {
  const isStudent = message.sender === "student";
  const hasFeedback = feedbacks.length > 0;
  const [isAIFeedbackOpen, setAIFeedbackOpen] = useState(false);
  return (
    <div className={`flex items-end ${isStudent ? "gap-0" : "gap-2 sm:gap-3"} ${isStudent ? "justify-end" : "justify-start"}`}>
      {!isStudent ? (
        <Avatar className="hidden h-9 w-9 sm:inline-flex">
          <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
        </Avatar>
      ) : null}
      <div className={`flex w-full flex-col gap-2 ${isStudent ? "items-end" : "items-start pr-4"}`}>
        <Card
          className={`${
            isStudent
              ? `bg-primary text-primary-foreground w-fit sm:max-w-[70%] ml-auto mr-2`
              : `bg-muted/60 w-fit sm:max-w-[70%] mr-4`
          }`}
          style={hasFeedback ? { boxShadow: "0 0 0 2px rgba(59,130,246,0.55)" } : undefined}
        >
          <CardContent className="space-y-2 p-4">
            {message.sender === "ai" && message.status !== "DONE" ? (
              <div
                className="space-y-3"
                aria-live="polite"
                role="status"
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> AI が回答中です… <TypingDots />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[92%]" />
                  <Skeleton className="h-4 w-[86%]" />
                  <Skeleton className="h-4 w-[64%]" />
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
            )}
            <div className={`flex items-center ${isStudent ? "justify-end" : "justify-between"} text-xs text-muted-foreground/80`}>
              <span>
                {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              {message.sender === "ai" && feedbacks.length ? (
                <button
                  type="button"
                  onClick={() => setAIFeedbackOpen((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-primary hover:bg-primary/10 focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  aria-expanded={isAIFeedbackOpen}
                  title="フィードバックを確認"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> フィードバック {feedbacks.length}件
                </button>
              ) : null}
            </div>
          </CardContent>
        </Card>
        
        {!isStudent && feedbacks.length ? (
          <div className="w-full">
            {isAIFeedbackOpen ? (
              <div className="flex w-full justify-start">
                <div className="w-auto">
                  <Card className="w-fit sm:max-w-[70%] mr-4 border-dashed bg-muted/30">
                    <CardContent className="space-y-3 p-4 text-base">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MessageCircle className="h-4 w-4" />
                        <span>メンターからのフィードバック</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{feedbacks[0]?.authorName}</span>
                          <span>{feedbacks[0]?.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <p className="leading-relaxed">{feedbacks[0]?.content}</p>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {feedbacks[0]?.status}
                        </Badge>
                      </div>
                      {feedbacks.length > 1 ? (
                        <Collapsible>
                          <CollapsibleTrigger className="text-xs text-primary underline">
                            さらに表示（{feedbacks.length - 1}）
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2 space-y-2">
                            {feedbacks.slice(1).map((fb) => (
                              <div key={`${fb.authorId}-${fb.timestamp.toISOString()}`} className="rounded-md border bg-background p-3">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>{fb.authorName}</span>
                                  <span>{fb.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                </div>
                                <p className="mt-1 leading-relaxed">{fb.content}</p>
                                <Badge variant="secondary" className="mt-1 text-xs capitalize">
                                  {fb.status}
                                </Badge>
                              </div>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      ) : null}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {isStudent && feedbacks.length ? (
          <div className="w-full">
            <div className="flex w-full justify-start">
              <div className="w-full sm:max-w-[70%] mr-4">
                <FeedbackToggle feedbacks={feedbacks} fullRow />
              </div>
            </div>
          </div>
        ) : null}
      </div>
      {isStudent ? null : null}
    </div>
  );
};

interface ChatComposerProps {
  containerRef?: RefObject<HTMLDivElement>;
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  canSend: boolean;
  isSending: boolean;
}

const ChatComposer = ({ containerRef, value, onChange, onSend, canSend, isSending }: ChatComposerProps) => (
  <div ref={containerRef} className="border-t bg-background pl-4 py-3 sm:pl-6">
    <form
      className="flex flex-col gap-2 items-end"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSend) return;
        onSend();
      }}
    >
      <div className="w-full sm:max-w-[70%]">
        <Textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (canSend && !isSending) onSend();
            }
          }}
          placeholder="質問を入力してください…"
          className="min-h-12 w-full"
          rows={2}
          disabled={isSending}
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">Enterで送信、Shift+Enterで改行</p>
          <Button type="submit" disabled={!canSend} className="rounded-full px-6">
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "送信"}
          </Button>
        </div>
      </div>
    </form>
  </div>
);

export default StudentChatView;

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 ml-1" aria-hidden="true">
      <span
        className="inline-block size-2.5 rounded-full bg-primary opacity-60"
        style={{ animation: "typingDot 1s ease-in-out infinite", animationDelay: "0ms" }}
      />
      <span
        className="inline-block size-2.5 rounded-full bg-primary opacity-60"
        style={{ animation: "typingDot 1s ease-in-out infinite", animationDelay: "200ms" }}
      />
      <span
        className="inline-block size-2.5 rounded-full bg-primary opacity-60"
        style={{ animation: "typingDot 1s ease-in-out infinite", animationDelay: "400ms" }}
      />
      <style jsx>{`
        @keyframes typingDot {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.6;
          }
          30% {
            transform: translateY(-3px);
            opacity: 1;
          }
        }
      `}</style>
    </span>
  );
}

function FeedbackToggle({ feedbacks, inline = false, iconOnly = true, fullRow = false }: { feedbacks: StudentChatViewModel["mentorFeedbacks"]; inline?: boolean; iconOnly?: boolean; fullRow?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        {fullRow ? (
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-md px-2 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            aria-expanded={open}
          >
            <span className="inline-flex items-center gap-2">
              <MessageCircle className="h-4 w-4" /> フィードバック {feedbacks.length}件
            </span>
            <Eye className="h-4 w-4" />
          </button>
        ) : iconOnly ? (
          <Button variant="ghost" size="icon" aria-label={open ? "閉じる" : "フィードバックを確認"}>
            <Eye className="h-4 w-4" />
            <span className="sr-only">{open ? "閉じる" : "フィードバックを確認"}</span>
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="h-7 px-2">
            {open ? "閉じる" : "確認"}
          </Button>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        {inline ? (
          <div className="space-y-3 text-base">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{feedbacks[0]?.authorName}</span>
                <span>{feedbacks[0]?.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <p className="leading-relaxed">{feedbacks[0]?.content}</p>
              <Badge variant="secondary" className="text-xs capitalize">
                {feedbacks[0]?.status}
              </Badge>
            </div>
            {feedbacks.length > 1 ? (
              <Collapsible>
                <CollapsibleTrigger className="text-xs text-primary underline">
                  さらに表示（{feedbacks.length - 1}）
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {feedbacks.slice(1).map((fb) => (
                  <div key={`${fb.authorId}-${fb.timestamp.toISOString()}`} className="rounded-md border bg-background p-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{fb.authorName}</span>
                        <span>{fb.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p className="mt-1 leading-relaxed">{fb.content}</p>
                      <Badge variant="secondary" className="mt-1 text-xs capitalize">
                        {fb.status}
                      </Badge>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ) : null}
          </div>
        ) : (
          <Card className="border-dashed bg-muted/30">
            <CardContent className="space-y-3 p-4 text-base">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MessageCircle className="h-4 w-4" />
                <span>メンターからのフィードバック</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{feedbacks[0]?.authorName}</span>
                  <span>{feedbacks[0]?.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className="leading-relaxed">{feedbacks[0]?.content}</p>
                <Badge variant="secondary" className="text-xs capitalize">
                  {feedbacks[0]?.status}
                </Badge>
              </div>
              {feedbacks.length > 1 ? (
                <Collapsible>
                  <CollapsibleTrigger className="text-xs text-primary underline">
                    さらに表示（{feedbacks.length - 1}）
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    {feedbacks.slice(1).map((fb) => (
                      <div key={`${fb.authorId}-${fb.timestamp.toISOString()}`} className="rounded-md border bg-background p-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{fb.authorName}</span>
                          <span>{fb.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <p className="mt-1 leading-relaxed">{fb.content}</p>
                        <Badge variant="secondary" className="mt-1 text-xs capitalize">
                          {fb.status}
                        </Badge>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ) : null}
            </CardContent>
          </Card>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
