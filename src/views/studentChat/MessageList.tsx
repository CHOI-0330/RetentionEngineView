/**
 * MessageList コンポーネント
 *
 * レガシースタイルのメッセージ一覧表示
 */

import { memo } from "react";
import { Loader2, Globe } from "lucide-react";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { MessageBubble } from "./MessageBubble";
import type { MessageViewModel } from "../../interfaceAdapters/services/StudentChatService";
import type { FeedbackActions, WebSearchPendingState } from "./types";

interface MessageListProps {
  messages: MessageViewModel[];
  authorNames?: Record<string, string>;
  isAwaitingAssistant?: boolean;
  feedback?: FeedbackActions;
  webSearchPending?: WebSearchPendingState | null;
  onConfirmWebSearch?: () => void;
  onCancelWebSearch?: () => void;
  canWriteFeedback?: boolean; // フィードバック入力可否
  isLoadingOlder?: boolean; // 過去メッセージ読み込み中
  hasOlderMessages?: boolean; // さらに過去のメッセージがあるか
}

export const MessageList = memo(function MessageList({
  messages,
  authorNames = {},
  isAwaitingAssistant = false,
  feedback,
  webSearchPending,
  onConfirmWebSearch,
  onCancelWebSearch,
  canWriteFeedback = false,
  isLoadingOlder = false,
  hasOlderMessages = true,
}: MessageListProps) {
  if (messages.length === 0 && !isAwaitingAssistant) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground py-12">
        <p>メッセージがありません。質問を入力してください。</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 過去メッセージ読み込み中インジケータ */}
      {isLoadingOlder && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            過去のメッセージを読み込み中...
          </span>
        </div>
      )}

      {/* 会話の始まり表示 */}
      {!hasOlderMessages && messages.length > 0 && !isLoadingOlder && (
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2">
            <span className="text-xs text-muted-foreground">
              会話の始まりです
            </span>
          </div>
        </div>
      )}

      {messages.map((msg, index) => {
        const prev = index > 0 ? messages[index - 1] : null;
        const isTurnChange = !prev || prev.role !== msg.role;
        return (
          <div key={msg.msgId} className={isTurnChange ? "mt-4" : ""}>
            <MessageBubble
              message={msg}
              authorName={authorNames[msg.msgId]}
              feedback={feedback}
              authorNames={authorNames}
              canWriteFeedback={canWriteFeedback}
            />
          </div>
        );
      })}

      {/* ウェブ検索確認メッセージ */}
      {webSearchPending && (
        <div className="flex w-full justify-start mt-4">
          <div className="flex max-w-[85%] flex-col items-start">
            <div className="flex items-end gap-2">
              <Avatar className="h-8 w-8 border bg-primary/5">
                <AvatarFallback className="text-[10px] text-primary">
                  AI
                </AvatarFallback>
              </Avatar>
              <div className="relative rounded-2xl rounded-tl-sm bg-muted/50 px-5 py-4 text-sm leading-relaxed shadow-sm">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-2">
                    <Globe className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-foreground">{webSearchPending.reason}</p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={onConfirmWebSearch}
                      className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                    >
                      {webSearchPending.labels.confirm}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onCancelWebSearch}
                      className="h-8 text-xs"
                    >
                      {webSearchPending.labels.cancel}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* アシスタント応答待ちインジケータ */}
      {isAwaitingAssistant && (
        <div className="flex w-full justify-start mt-4">
          <div className="flex max-w-[85%] flex-col items-start">
            <div className="flex items-end gap-2">
              <Avatar className="h-8 w-8 border bg-primary/5">
                <AvatarFallback className="text-[10px] text-primary">
                  AI
                </AvatarFallback>
              </Avatar>
              <div className="relative rounded-2xl rounded-tl-sm bg-muted/50 px-5 py-3.5 text-sm leading-relaxed shadow-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>生成中...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
