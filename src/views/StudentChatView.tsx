import type {
  StudentChatPresenterInteractions,
  StudentChatPresenterMeta,
  StudentChatPresenterStatus,
  StudentChatViewModel,
} from "../interfaceAdapters/presenters/useStudentChatPresenter";
import { useEffect, useRef, type RefObject } from "react";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import { AlertTriangle, Loader2, MessageCircle } from "lucide-react";
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

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector<HTMLElement>("[data-radix-scroll-area-viewport]");
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
    }
  }, [viewModel.messages, status.isAwaitingAssistant]);

  return (
    <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-2xl border bg-card">
      <ConversationHeader
        conversationTitle={conversationTitle}
        conversationOptions={conversationOptions}
        pickerValue={pickerValue}
        showConversationPicker={showConversationPicker}
        onConversationChange={onConversationChange}
        createDialog={createDialog}
      />
      {status.error ? (
        <div className="border-b border-dashed border-destructive/40 bg-destructive/5 px-6 py-3 text-sm text-destructive">
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

      <div className="flex flex-1 flex-col gap-4 overflow-hidden px-4 py-4 sm:px-6 sm:py-6">
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
            messages={viewModel.messages}
            feedbackByMessageId={feedbackByMessageId}
          />
          <ChatComposer
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
        <select
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm md:w-auto md:min-w-[220px]"
          value={pickerValue}
          onChange={(event) => onConversationChange?.(event.target.value)}
        >
          {conversationOptions?.map((option) => (
            <option key={option.convId} value={option.convId}>
              {option.title}
            </option>
          ))}
        </select>
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
  messages: StudentChatViewModel["messages"];
  feedbackByMessageId: Record<string, StudentChatViewModel["mentorFeedbacks"]>;
}

const StudentChatMessageList = ({ containerRef, messages, feedbackByMessageId }: StudentChatMessageListProps) => (
  <div ref={containerRef} className="flex-1">
    <ScrollArea className="h-full px-3 py-3 sm:px-4">
      <div className="space-y-4">
        {messages.map((message) => (
          <StudentChatMessageBubble
            key={message.id}
            message={message}
            feedbacks={feedbackByMessageId[message.id] ?? []}
          />
        ))}
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
  return (
    <div className={`flex items-end gap-3 ${isStudent ? "justify-end" : "justify-start"}`}>
      {!isStudent ? (
        <Avatar className="hidden h-9 w-9 sm:inline-flex">
          <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
        </Avatar>
      ) : null}
      <div className={`flex w-full flex-col gap-2 ${isStudent ? "items-end" : "items-start"}`}>
            <Card className={`${isStudent ? "bg-primary text-primary-foreground" : "bg-muted/60"} w-full max-w-full sm:max-w-[70%]`}>
          <CardContent className="space-y-2 p-4">
            {message.sender === "ai" && message.status !== "DONE" ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> 回答を生成しています...
              </div>
            ) : (
              <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
            )}
            <span className="block text-xs text-muted-foreground/80">
              {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </CardContent>
        </Card>
        {feedbacks.length ? (
          <Card className="w-full max-w-full border-dashed bg-muted/30 sm:max-w-[70%]">
            <CardContent className="space-y-2 p-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MessageCircle className="h-4 w-4" />
                <span>メンターからのフィードバック</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{feedbacks[0]?.authorName}</span>
                  <span>{feedbacks[0]?.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className="text-sm leading-relaxed">{feedbacks[0]?.content}</p>
                <Badge variant="secondary" className="text-xs capitalize">
                  {feedbacks[0]?.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
      {isStudent ? (
        <Avatar className="hidden h-9 w-9 sm:inline-flex">
          <AvatarFallback className="bg-primary/10 text-primary">NH</AvatarFallback>
        </Avatar>
      ) : null}
    </div>
  );
};

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  canSend: boolean;
  isSending: boolean;
}

const ChatComposer = ({ value, onChange, onSend, canSend, isSending }: ChatComposerProps) => (
  <div className="border-t bg-background px-4 py-3">
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSend) {
          return;
        }
        onSend();
      }}
    >
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="質問を入力してください…"
        className="flex-1 rounded-full bg-background"
        disabled={isSending}
      />
      <Button
        type="submit"
        disabled={!canSend}
        className="rounded-full px-6"
      >
        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "送信"}
      </Button>
    </form>
  </div>
);

export default StudentChatView;
