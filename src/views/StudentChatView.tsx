import type {
  StudentChatPresenterInteractions,
  StudentChatPresenterMeta,
  StudentChatPresenterStatus,
  StudentChatViewModel,
} from "../interfaceAdapters/presenters/useStudentChatPresenter";
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

  return (
    <div className="flex h-[70vh] flex-col overflow-hidden rounded-2xl border bg-card">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex flex-1 items-start gap-4">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Conversation</p>
            <h1 className="text-lg font-semibold">{conversationTitle}</h1>
            {showConversationPicker ? (
              <select
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={pickerValue}
                onChange={(event) => onConversationChange?.(event.target.value)}
              >
                {/* 여러 대화가 있을 때 바로 전환할 수 있도록 간단한 셀렉트를 제공합니다. */}
                {conversationOptions?.map((option) => (
                  <option key={option.convId} value={option.convId}>
                    {option.title}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          {createDialog ? (
            <Dialog
              open={createDialog.isOpen}
              onOpenChange={(open) => (open ? createDialog.onOpen() : createDialog.onClose())}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!createDialog.mentorOptions.length && !createDialog.isOpen}
                >
                  새 대화 시작
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>새 대화 만들기</DialogTitle>
                  <DialogDescription>대화 제목과 멘토를 선택해 새 대화를 시작하세요.</DialogDescription>
                </DialogHeader>
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    createDialog.onSubmit();
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="student-new-conversation-title">대화 제목</Label>
                    <Input
                      id="student-new-conversation-title"
                      value={createDialog.title}
                      onChange={(event) => createDialog.onChangeTitle(event.target.value)}
                      placeholder="예: CS 기본 교육"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="student-new-conversation-mentor">멘토</Label>
                    <Select
                      value={createDialog.selectedMentorId ?? undefined}
                      onValueChange={(value) => createDialog.onChangeMentor(value)}
                    >
                      <SelectTrigger id="student-new-conversation-mentor">
                        <SelectValue placeholder="멘토를 선택하세요" />
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
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={createDialog.onClose}
                      disabled={createDialog.isSubmitting}
                    >
                      취소
                    </Button>
                    <Button
                      type="submit"
                      disabled={createDialog.isSubmitting || !createDialog.selectedMentorId}
                    >
                      {createDialog.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      만들기
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary/10 text-primary">NH</AvatarFallback>
        </Avatar>
      </header>

      {status.error ? (
        <div className="border-b border-dashed border-destructive/40 bg-destructive/5 px-6 py-3 text-sm text-destructive">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {status.error.message}
            </span>
            <Button size="sm" variant="ghost" onClick={interactions.clearError}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-1 gap-4 overflow-hidden px-6 py-4">
        <section className="flex h-full w-full flex-col overflow-hidden rounded-xl border bg-background/60">
          <div className="flex items-center justify-between border-b px-4 py-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full">チャット</Badge>
              {status.isStreaming ? (
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
              <Button variant="ghost" size="sm" onClick={interactions.cancelAssistantStream} disabled={!status.isStreaming}>
                ストリーム中止
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 px-4 py-3">
            <div className="space-y-4">
              {viewModel.messages.map((message) => {
                const feedbacks = feedbackByMessageId[message.id] ?? [];
                const isStudent = message.sender === "student";
                return (
                  <div key={message.id} className={`flex gap-3 ${isStudent ? "justify-end" : "justify-start"}`}>
                    {!isStudent ? (
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
                      </Avatar>
                    ) : null}

                    <div className={`max-w-[70%] space-y-2 ${isStudent ? "items-end" : "items-start"}`}>
                      <Card className={isStudent ? "bg-primary text-primary-foreground" : "bg-muted/60"}>
                        <CardContent className="space-y-2 p-4">
                          <p className="leading-relaxed">{message.content}</p>
                          <span className="block text-xs text-muted-foreground/80">
                            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </CardContent>
                      </Card>

                      {feedbacks.length ? (
                        <Card className="border-dashed bg-muted/30">
                          <CardContent className="space-y-2 p-3 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MessageCircle className="h-4 w-4" />
                              <span>メンターからのフィードバック</span>
                            </div>
                            {feedbacks.map((feedback) => (
                              <div key={feedback.id} className="space-y-1">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>{feedback.authorName}</span>
                                  <span>{feedback.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                </div>
                                <p className="text-sm leading-relaxed">{feedback.content}</p>
                                <Badge variant="secondary" className="text-xs capitalize">
                                  {feedback.status}
                                </Badge>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      ) : null}
                    </div>

                    {isStudent ? (
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary">NH</AvatarFallback>
                      </Avatar>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="border-t bg-background px-4 py-3">
            <form
              className="flex items-center gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!meta.canSend) {
                  return;
                }
                viewModel.onSend();
              }}
            >
              <Input
                value={viewModel.newMessage}
                onChange={(event) => viewModel.onChangeNewMessage(event.target.value)}
                placeholder="質問を入力してください…"
                className="flex-1 rounded-full bg-background"
                disabled={status.isSending}
              />
              <Button type="submit" disabled={!meta.canSend} className="rounded-full px-6">
                {status.isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "送信"}
              </Button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};

export default StudentChatView;
