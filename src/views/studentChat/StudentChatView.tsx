/**
 * StudentChatView V2
 *
 * 新アーキテクチャ：レガシーUIスタイルを維持
 */

import { memo, useRef, useEffect, useState } from "react";
import { AlertTriangle, Loader2, ChevronUp } from "lucide-react";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { MessageList } from "./MessageList";
import { ChatComposerLegacy } from "./ChatComposerLegacy";
import type { StudentChatViewProps } from "./types";

export const StudentChatView = memo(function StudentChatView({
  viewModel,
  newMessage,
  status,
  actions,
  requireWebSearch,
  onRequireWebSearchChange,
  feedback,
}: StudentChatViewProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [newConversationTitle, setNewConversationTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // 新しいメッセージが追加されたらスクロール
  useEffect(() => {
    const viewport = scrollAreaRef.current;
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
    }
  }, [viewModel.messages.length, status.isAwaitingAssistant]);

  // 会話作成ハンドラ
  const handleCreateConversation = async () => {
    if (!newConversationTitle.trim()) return;
    setIsCreating(true);
    try {
      await actions.createConversation(newConversationTitle.trim());
      setNewConversationTitle("");
      setCreateDialogOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  const showConversationPicker = viewModel.conversations.length > 1;
  const selectedConvId = viewModel.conversation?.convId ?? "";

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden bg-background">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <a
                href="/student/dashboard"
                className="inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/70"
              >
                <span className="text-lg leading-none">←</span>
                <span>戻る</span>
              </a>
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                {viewModel.conversation?.title ?? "チャット"}
              </h1>
            </div>
            {showConversationPicker && (
              <div className="mt-1">
                <Select
                  value={selectedConvId}
                  onValueChange={(value) => void actions.selectConversation(value)}
                >
                  <SelectTrigger className="h-7 w-[200px] border-none bg-transparent p-0 text-xs text-muted-foreground shadow-none focus:ring-0 hover:text-foreground">
                    <SelectValue placeholder="会話を切り替え" />
                  </SelectTrigger>
                  <SelectContent>
                    {viewModel.conversations.map((conv) => (
                      <SelectItem
                        key={conv.convId}
                        value={conv.convId}
                        className="text-xs"
                      >
                        {conv.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {viewModel.conversation && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
              onClick={() => {
                if (viewModel.conversation) {
                  void actions.deleteConversation(viewModel.conversation.convId);
                }
              }}
            >
              会話を削除
            </Button>
          )}
          <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
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
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleCreateConversation();
                }}
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    会話のタイトル
                  </label>
                  <Input
                    value={newConversationTitle}
                    onChange={(e) => setNewConversationTitle(e.target.value)}
                    placeholder="例：Reactの基礎学習"
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setCreateDialogOpen(false)}
                  >
                    キャンセル
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    作成する
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Avatar className="h-8 w-8 border">
            <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
              自分
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* エラー表示 */}
      {status.error && (
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
            onClick={actions.clearError}
            className="h-auto p-1 hover:bg-destructive/20"
          >
            閉じる
          </Button>
        </div>
      )}

      {/* メッセージエリア */}
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col">
          {/* ステータスバー */}
          <div className="flex items-center justify-between border-b bg-muted/20 px-6 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {status.isAwaitingAssistant && (
                <span className="flex items-center gap-1.5 text-primary text-sm font-medium">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  AIが回答を準備しています...
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-3 text-[11px] text-muted-foreground hover:bg-background"
              onClick={() => void actions.reload()}
              aria-label="リロード"
            >
              <ChevronUp className="h-3 w-3 mr-1" />
              リロード
            </Button>
          </div>

          {/* メッセージリスト */}
          <div ref={scrollAreaRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <div className="mx-auto max-w-3xl">
              <MessageList
                messages={viewModel.messages}
                authorNames={viewModel.authorNames}
                isAwaitingAssistant={status.isAwaitingAssistant}
                feedback={feedback}
              />
              <div ref={bottomRef} className="h-px" />
            </div>
          </div>
        </div>
      </div>

      {/* 入力フォーム */}
      <ChatComposerLegacy
        value={newMessage}
        onChange={actions.setNewMessage}
        onSend={() => void actions.sendMessage()}
        canSend={!status.isSending && !status.isAwaitingAssistant && newMessage.trim().length > 0}
        isSending={status.isSending}
        requireWebSearch={requireWebSearch}
        onRequireWebSearchChange={onRequireWebSearchChange}
      />
    </div>
  );
});

export default StudentChatView;
