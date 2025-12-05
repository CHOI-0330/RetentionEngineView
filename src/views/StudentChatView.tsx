import type {
  StudentChatPresenterInteractions,
  StudentChatPresenterMeta,
  StudentChatPresenterStatus,
  StudentChatViewModel,
  WebSearchConfirmation,
} from "../interfaceAdapters/presenters/useStudentChatPresenter";
import type { SearchSettings } from "../interfaceAdapters/gateways/api/StudentChatGateway";
import { memo, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import {
  AlertTriangle,
  Loader2,
  MessageCircle,
  Search,
  Globe,
  FileText,
  ChevronDown,
  ChevronUp,
  Settings2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import MarkdownRendererView from "../components/MarkdownRenderer";

interface ConversationSummary {
  convId: string;
  title: string;
  lastActiveAt: string;
}

interface CreateConversationDialogProps {
  isOpen: boolean;
  title: string;
  isSubmitting: boolean;
  onOpen: () => void;
  onClose: () => void;
  onChangeTitle: (value: string) => void;
  onSubmit: () => void;
}

interface StudentChatViewProps {
  conversationTitle: string;
  conversationOptions?: ConversationSummary[];
  selectedConversationId?: string;
  onConversationChange?: (convId: string) => void;
  createDialog?: CreateConversationDialogProps;
  onDeleteConversation?: () => void;
  viewModel: StudentChatViewModel;
  status: StudentChatPresenterStatus;
  meta: StudentChatPresenterMeta;
  interactions: StudentChatPresenterInteractions;
  // Hybrid RAG 設定
  searchSettings: SearchSettings;
  pendingWebSearchConfirmation: WebSearchConfirmation | null;
}

const LONG_WAIT_THRESHOLD_MS = 30000;

const StudentChatView = ({
  conversationTitle,
  conversationOptions,
  selectedConversationId,
  onConversationChange,
  createDialog,
  onDeleteConversation,
  viewModel,
  status,
  meta,
  interactions,
  searchSettings,
  pendingWebSearchConfirmation,
}: StudentChatViewProps) => {
  const feedbackByMessageId = useMemo(
    () =>
      viewModel.mentorFeedbacks.reduce<
        Record<string, StudentChatViewModel["mentorFeedbacks"]>
      >((acc, feedback) => {
        acc[feedback.messageId] = [...(acc[feedback.messageId] ?? []), feedback];
        return acc;
      }, {}),
    [viewModel.mentorFeedbacks]
  );

  const showConversationPicker =
    Boolean(onConversationChange) && (conversationOptions?.length ?? 0) > 1;
  const pickerValue =
    selectedConversationId ?? conversationOptions?.[0]?.convId ?? "";

  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const [isAssistantThinkingLong, setIsAssistantThinkingLong] = useState(false);

  useEffect(() => {
    if (meta.isHistoryLoading) return;
    const anchor = bottomRef.current;
    const viewport = scrollAreaRef.current?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    );
    if (!anchor) return;

    const smoothToBottom = () => {
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      }
      anchor.scrollIntoView({ behavior: "smooth", block: "end" });
    };

    smoothToBottom();
    // Small delay to ensure content is rendered
    const timeoutId = setTimeout(smoothToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [
    viewModel.messages.length,
    status.isAwaitingAssistant,
    meta.isHistoryLoading,
  ]);

  useEffect(() => {
    if (!status.isAwaitingAssistant) {
      setIsAssistantThinkingLong(false);
      return;
    }
    const timerId = window.setTimeout(
      () => setIsAssistantThinkingLong(true),
      LONG_WAIT_THRESHOLD_MS
    );
    return () => clearTimeout(timerId);
  }, [status.isAwaitingAssistant]);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-background">
      <ConversationHeader
        conversationTitle={conversationTitle}
        conversationOptions={conversationOptions}
        pickerValue={pickerValue}
        showConversationPicker={showConversationPicker}
        onConversationChange={onConversationChange}
        createDialog={createDialog}
        onDeleteConversation={onDeleteConversation}
      />

      {status.error ? (
        <div
          className="flex items-center justify-between bg-destructive/10 px-6 py-3 text-sm text-destructive"
          aria-live="polite"
          role="status"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {status.error.message}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={interactions.clearError}
            className="h-auto p-1 hover:bg-destructive/20"
          >
            閉じる
          </Button>
        </div>
      ) : null}

      <div className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b bg-muted/20 px-6 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {status.isAwaitingAssistant ? (
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-primary text-sm font-medium">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                    AIが回答を準備しています...
                  </span>
                  {isAssistantThinkingLong ? (
                    <span className="text-[11px] text-muted-foreground">
                      AIが頑張って考察してます。長文を準備中ですので、もう少しお待ちください。
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-3 text-[11px] text-muted-foreground hover:bg-background"
              onClick={interactions.requestOlderMessages}
              disabled={!meta.hasMoreHistory || meta.isHistoryLoading}
              aria-label="過去メッセージを読み込む"
            >
              {meta.isHistoryLoading ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <ChevronUp className="h-3 w-3 mr-1" />
              )}
              過去を読み込む
            </Button>
          </div>

          <StudentChatMessageList
            containerRef={scrollAreaRef}
            bottomRef={bottomRef}
            messages={viewModel.messages}
            feedbackByMessageId={feedbackByMessageId}
          />
        </div>
      </div>

      <ChatComposer
        containerRef={composerRef}
        value={viewModel.newMessage}
        onChange={viewModel.onChangeNewMessage}
        onSend={viewModel.onSend}
        canSend={meta.canSend}
        isSending={status.isSending}
        searchSettings={searchSettings}
        onSearchSettingsChange={interactions.setSearchSettings}
      />

      {/* ウェブ検索確認ボタン（チャット内に表示） */}
      {pendingWebSearchConfirmation && (
        <WebSearchConfirmationButtons
          labels={pendingWebSearchConfirmation.labels}
          onConfirm={interactions.confirmWebSearch}
          onCancel={interactions.cancelWebSearch}
        />
      )}
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
  onDeleteConversation?: () => void;
}

const ConversationHeader = ({
  conversationTitle,
  conversationOptions,
  pickerValue,
  showConversationPicker,
  onConversationChange,
  createDialog,
  onDeleteConversation,
}: ConversationHeaderProps) => (
  <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div className="flex items-center gap-4">
      <div className="flex flex-col">
        <div className="flex items-center gap-3">
          <a
            href="/student/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/70 transition-colors"
          >
            <span className="text-lg leading-none">←</span>
            <span>戻る</span>
          </a>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            {conversationTitle}
          </h1>
        </div>
        {showConversationPicker && (
          <div className="mt-1">
            <Select
              value={pickerValue}
              onValueChange={(value) => onConversationChange?.(value)}
            >
              <SelectTrigger className="h-7 w-[200px] border-none bg-transparent p-0 text-xs text-muted-foreground shadow-none focus:ring-0 hover:text-foreground">
                <SelectValue placeholder="会話を切り替え" />
              </SelectTrigger>
              <SelectContent>
                {conversationOptions?.map((option) => (
                  <SelectItem
                    key={option.convId}
                    value={option.convId}
                    className="text-xs"
                  >
                    {option.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>

    <div className="flex items-center gap-3">
      {onDeleteConversation ? (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
          onClick={onDeleteConversation}
        >
          会話を削除
        </Button>
      ) : null}
      {createDialog ? (
        <Dialog
          open={createDialog.isOpen}
          onOpenChange={(open) =>
            open ? createDialog.onOpen() : createDialog.onClose()
          }
        >
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              新規会話
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新しい会話を作成</DialogTitle>
              <DialogDescription>
                テーマを決めて、AIと学習を始めましょう。
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4 mt-4"
              onSubmit={(event) => {
                event.preventDefault();
                createDialog.onSubmit();
              }}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  会話のタイトル
                </label>
                <Input
                  value={createDialog.title}
                  onChange={(e) => createDialog.onChangeTitle(e.target.value)}
                  placeholder="例：Reactの基礎学習"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={createDialog.onClose}
                >
                  キャンセル
                </Button>
                <Button type="submit" disabled={createDialog.isSubmitting}>
                  {createDialog.isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  作成する
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
      <Avatar className="h-8 w-8 border">
        <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
          ME
        </AvatarFallback>
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

const StudentChatMessageList = ({
  containerRef,
  bottomRef,
  messages,
  feedbackByMessageId,
}: StudentChatMessageListProps) => (
  <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {messages.map((message, index) => {
        const prev = index > 0 ? messages[index - 1] : null;
        const isTurnChange = !prev || prev.sender !== message.sender;
        return (
          <div key={message.id} className={isTurnChange ? "mt-4" : ""}>
            <StudentChatMessageBubble
              message={message}
              feedbacks={feedbackByMessageId[message.id] ?? []}
            />
          </div>
        );
      })}
      <div ref={bottomRef} className="h-px" />
    </div>
  </div>
);

interface StudentChatMessageBubbleProps {
  message: StudentChatViewModel["messages"][number];
  feedbacks: StudentChatViewModel["mentorFeedbacks"];
}

const StudentChatMessageBubble = memo(function StudentChatMessageBubble({
  message,
  feedbacks,
}: StudentChatMessageBubbleProps) {
  const isStudent = message.sender === "student";
  const hasFeedback = feedbacks.length > 0;
  const [isAIFeedbackOpen, setAIFeedbackOpen] = useState(false);
  const [isSourcesOpen, setSourcesOpen] = useState(false);

  const hasSources =
    message.sources &&
    ((message.sources.fileSearch && message.sources.fileSearch.length > 0) ||
      (message.sources.webSearch && message.sources.webSearch.length > 0));

  return (
    <div
      className={`flex w-full ${isStudent ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`flex max-w-[85%] flex-col ${
          isStudent ? "items-end" : "items-start"
        }`}
      >
        <div className="flex items-end gap-2">
          {!isStudent && (
            <Avatar className="h-8 w-8 border bg-primary/5">
              <AvatarFallback className="text-[10px] text-primary">
                AI
              </AvatarFallback>
            </Avatar>
          )}

          <div
            className={`relative rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm ${
              isStudent
                ? "bg-primary text-primary-foreground rounded-tr-sm"
                : "bg-muted/50 text-foreground rounded-tl-sm"
            } ${hasFeedback ? "ring-2 ring-blue-400/50 ring-offset-2" : ""}`}
          >
            {message.sender === "ai" && message.status !== "DONE" ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>生成中...</span>
              </div>
            ) : (
              <>
                {message.format === "markdown" ? (
                  <MarkdownRendererView
                    content={message.content}
                    className="space-y-2 break-words [&>pre]:mt-2 [&>pre]:bg-background/60 [&>pre]:text-xs [&>pre]:text-foreground"
                  />
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </>
            )}
          </div>
        </div>

        <div
          className={`mt-1 flex items-center gap-2 px-1 text-[10px] text-muted-foreground ${
            isStudent ? "flex-row-reverse" : "flex-row"
          }`}
        >
          <span>
            {message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {/* ソース表示ボタン */}
          {!isStudent && hasSources && (
            <button
              onClick={() => setSourcesOpen(!isSourcesOpen)}
              className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-600 hover:bg-emerald-100 transition-colors"
            >
              <Search className="h-3 w-3" />
              <span className="font-medium">出典</span>
            </button>
          )}
          {!isStudent && feedbacks.length > 0 && (
            <button
              onClick={() => setAIFeedbackOpen(!isAIFeedbackOpen)}
              className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-blue-600 hover:bg-blue-100 transition-colors"
            >
              <MessageCircle className="h-3 w-3" />
              <span className="font-medium">
                フィードバック ({feedbacks.length})
              </span>
            </button>
          )}
        </div>

        {/* ソース表示 */}
        {!isStudent && isSourcesOpen && hasSources && (
          <div className="mt-3 w-full pl-10">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs text-emerald-700">
                <Search className="h-3.5 w-3.5" />
                <span className="font-semibold">回答の出典</span>
              </div>

              {/* FileSearchソース */}
              {message.sources?.fileSearch &&
                message.sources.fileSearch.length > 0 && (
                  <div className="mb-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium mb-1">
                      <FileText className="h-3 w-3" />
                      <span>社内ドキュメント</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {message.sources.fileSearch.map((source, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-md bg-white/80 px-2 py-0.5 text-[10px] text-emerald-700 border border-emerald-200"
                        >
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* WebSearchソース */}
              {message.sources?.webSearch &&
                message.sources.webSearch.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-medium mb-1">
                      <Globe className="h-3 w-3" />
                      <span>ウェブ検索</span>
                    </div>
                    <div className="space-y-1">
                      {message.sources.webSearch.map((source, idx) => (
                        <a
                          key={idx}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-md bg-white/80 px-2 py-1.5 text-[11px] border border-blue-200 hover:bg-blue-50 transition-colors"
                        >
                          <span className="text-blue-700 font-medium">
                            {source.title}
                          </span>
                          {source.snippet && (
                            <p className="text-muted-foreground mt-0.5 line-clamp-2">
                              {source.snippet}
                            </p>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Feedback Display */}
        {((!isStudent && isAIFeedbackOpen) ||
          (isStudent && feedbacks.length > 0)) && (
          <div className={`mt-3 w-full ${isStudent ? "pr-1" : "pl-10"}`}>
            <div className="relative rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs text-blue-600">
                <MessageCircle className="h-3.5 w-3.5" />
                <span className="font-semibold">
                  メンターからのフィードバック
                </span>
              </div>
              {feedbacks.map((fb, i) => (
                <div
                  key={fb.id}
                  className={`${
                    i > 0 ? "mt-3 pt-3 border-t border-blue-100" : ""
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span className="font-medium text-foreground">
                      {fb.authorName}
                    </span>
                    <span>{fb.timestamp.toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                    {fb.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

interface ChatComposerProps {
  containerRef?: RefObject<HTMLDivElement>;
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  canSend: boolean;
  isSending: boolean;
  searchSettings: SearchSettings;
  onSearchSettingsChange: (settings: Partial<SearchSettings>) => void;
}

const ChatComposer = ({
  containerRef,
  value,
  onChange,
  onSend,
  canSend,
  isSending,
  searchSettings,
  onSearchSettingsChange,
}: ChatComposerProps) => {
  const [isComposing, setIsComposing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleSend = () => {
    if (canSend && !isSending && value.trim()) {
      onSend();
    }
  };

  return (
    <div
      ref={containerRef}
      className="border-t bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="mx-auto max-w-3xl">
        {/* 検索設定トグルバー */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* FileSearch トグル */}
            <button
              type="button"
              onClick={() =>
                onSearchSettingsChange({
                  enableFileSearch: !searchSettings.enableFileSearch,
                })
              }
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                searchSettings.enableFileSearch
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <FileText className="h-3 w-3" />
              社内検索
              {searchSettings.enableFileSearch ? " ON" : " OFF"}
            </button>

            {/* WebSearch トグル */}
            <button
              type="button"
              onClick={() =>
                onSearchSettingsChange({
                  allowWebSearch: !searchSettings.allowWebSearch,
                })
              }
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                searchSettings.allowWebSearch
                  ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Globe className="h-3 w-3" />
              ウェブ検索
              {searchSettings.allowWebSearch ? " 許可" : " OFF"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted transition-colors"
          >
            <Settings2 className="h-3 w-3" />
            <ChevronDown
              className={`h-3 w-3 transition-transform ${
                showSettings ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {/* 検索設定説明 (折りたたみ領域) */}
        {showSettings && (
          <div className="mb-3 rounded-lg border bg-muted/30 p-3 text-[11px] text-muted-foreground">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <FileText className="h-3.5 w-3.5 mt-0.5 text-emerald-600" />
                <div>
                  <span className="font-medium text-foreground">社内検索:</span>{" "}
                  アップロードされた社内ドキュメントから回答を検索します。
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Globe className="h-3.5 w-3.5 mt-0.5 text-blue-600" />
                <div>
                  <span className="font-medium text-foreground">
                    ウェブ検索:
                  </span>{" "}
                  社内ドキュメントで回答が見つからない場合、ウェブ検索を許可します（確認あり）。
                </div>
              </div>
            </div>
          </div>
        )}

        <form
          className="relative flex items-end gap-2 rounded-xl border bg-background p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onKeyDown={(e) => {
              const isEnter = e.key === "Enter";
              const modifierPressed = e.metaKey || e.ctrlKey;
              if (isComposing || e.nativeEvent.isComposing) return;

              if (isEnter && modifierPressed) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="メッセージを入力..."
            className="min-h-[44px] w-full resize-none border-none bg-transparent px-3 py-2.5 text-sm focus-visible:ring-0"
            rows={1}
            style={{ height: "auto", maxHeight: "200px" }}
            disabled={isSending}
          />
          <Button
            type="submit"
            disabled={!canSend || !value.trim()}
            size="icon"
            className="h-9 w-9 shrink-0 rounded-lg mb-0.5 mr-0.5"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            )}
            <span className="sr-only">送信</span>
          </Button>
        </form>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          ⌘+Enter / Ctrl+Enterで送信・Shift+Enterで改行
        </p>

        <p className="mt-1 text-center text-[10px] text-muted-foreground">
          AIは不正確な情報を生成する可能性があります。重要な情報は確認してください。
        </p>
      </div>
    </div>
  );
};

export default StudentChatView;

/**
 * ウェブ検索確認ボタン（チャット内に表示）
 * - 方向キーで選択切り替え
 * - Enterで選択確定
 */
interface WebSearchConfirmationButtonsProps {
  labels?: {
    confirm: string;
    cancel: string;
  };
  onConfirm: () => void;
  onCancel: () => void;
}

function WebSearchConfirmationButtons({
  labels,
  onConfirm,
  onCancel,
}: WebSearchConfirmationButtonsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0); // 0 = confirm, 1 = cancel
  const containerRef = useRef<HTMLDivElement>(null);

  const confirmLabel = labels?.confirm ?? "はい";
  const cancelLabel = labels?.cancel ?? "いいえ";

  // 方向キーとEnterのキーボードナビゲーション
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(0);
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedIndex === 0) {
          onConfirm();
        } else {
          onCancel();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, onConfirm, onCancel]);

  // フォーカス管理
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="border-t bg-gradient-to-r from-blue-50/50 to-background px-4 py-3 focus:outline-none"
    >
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-center gap-3">
          <span className="text-sm text-muted-foreground mr-2">
            <Globe className="inline h-4 w-4 mr-1 text-blue-500" />
            ウェブ検索を実行しますか？
          </span>
          <Button
            variant={selectedIndex === 0 ? "default" : "outline"}
            size="sm"
            onClick={onConfirm}
            onMouseEnter={() => setSelectedIndex(0)}
            className={`gap-1.5 transition-all ${
              selectedIndex === 0 ? "ring-2 ring-primary ring-offset-2" : ""
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            {confirmLabel}
          </Button>
          <Button
            variant={selectedIndex === 1 ? "secondary" : "ghost"}
            size="sm"
            onClick={onCancel}
            onMouseEnter={() => setSelectedIndex(1)}
            className={`transition-all ${
              selectedIndex === 1
                ? "ring-2 ring-muted-foreground/50 ring-offset-2"
                : ""
            }`}
          >
            {cancelLabel}
          </Button>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          ← → キーで選択 • Enter で確定 • Esc でキャンセル
        </p>
      </div>
    </div>
  );
}
