/**
 * MessageBubble コンポーネント
 *
 * レガシースタイルの個別メッセージ表示（フィードバック機能付き）
 */

import { memo, useEffect, useState } from "react";
import { Loader2, MessageCircle, Search, Globe, FileText } from "lucide-react";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import MarkdownRendererView from "../../components/MarkdownRenderer";
import type { Feedback } from "../../domain/core";
import type { MessageViewModel } from "../../interfaceAdapters/services/StudentChatService";
import type { FeedbackActions } from "./types";

interface MessageBubbleProps {
  message: MessageViewModel;
  authorName?: string;
  feedback?: FeedbackActions;
  authorNames?: Record<string, string>;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  authorName,
  feedback,
  authorNames = {},
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isStreaming = message.status === "partial" || message.status === "draft";

  // フィードバック展開状態
  const [showFeedback, setShowFeedback] = useState(false);

  // フィードバック関連データ
  const msgId = message.msgId;
  const feedbackList = feedback?.feedbacks[msgId] ?? [];
  const isLoadingFeedback = feedback?.isLoading(msgId) ?? false;
  const isSubmitting = feedback?.isSubmitting(msgId) ?? false;
  const inputValue = feedback?.getInput(msgId) ?? "";

  // フィードバック展開時にデータ読み込み
  useEffect(() => {
    if (showFeedback && feedbackList.length === 0 && !isLoadingFeedback && feedback) {
      void feedback.loadFeedbacks(msgId);
    }
  }, [showFeedback, feedbackList.length, isLoadingFeedback, feedback, msgId]);

  // フィードバック送信ハンドラ
  const handleSubmitFeedback = async () => {
    if (feedback && inputValue.trim()) {
      await feedback.submitFeedback(msgId);
    }
  };

  const hasFeedback = feedbackList.length > 0;

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex max-w-[85%] flex-col ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <div className="flex items-end gap-2">
          {!isUser && (
            <Avatar className="h-8 w-8 border bg-primary/5">
              <AvatarFallback className="text-[10px] text-primary">
                AI
              </AvatarFallback>
            </Avatar>
          )}

          <div
            className={`relative rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm ${
              isUser
                ? "bg-primary text-primary-foreground rounded-tr-sm"
                : "bg-muted/50 text-foreground rounded-tl-sm"
            } ${hasFeedback ? "ring-2 ring-blue-400/50 ring-offset-2" : ""}`}
          >
            {!isUser && isStreaming ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>生成中...</span>
              </div>
            ) : (
              <>
                {!isUser ? (
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

        {/* タイムスタンプとアクションボタン */}
        <div
          className={`mt-1 flex items-center gap-2 px-1 text-[10px] text-muted-foreground ${
            isUser ? "flex-row-reverse" : "flex-row"
          }`}
        >
          <span>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {/* フィードバックボタン（AI応答のみ） */}
          {!isUser && feedback && !isStreaming && message.content && (
            <button
              onClick={() => setShowFeedback(!showFeedback)}
              className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-blue-600 hover:bg-blue-100 transition-colors"
            >
              <MessageCircle className="h-3 w-3" />
              <span className="font-medium">
                フィードバック ({feedbackList.length})
              </span>
            </button>
          )}
        </div>

        {/* フィードバック表示 */}
        {showFeedback && !isUser && feedback && (
          <div className="mt-3 w-full pl-10">
            <div className="relative rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs text-blue-600">
                <MessageCircle className="h-3.5 w-3.5" />
                <span className="font-semibold">フィードバック</span>
              </div>

              {/* ローディング */}
              {isLoadingFeedback && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>読み込み中...</span>
                </div>
              )}

              {/* フィードバック一覧 */}
              {!isLoadingFeedback && feedbackList.length > 0 && (
                <div className="space-y-3 mb-3">
                  {feedbackList.map((fb: Feedback, i: number) => (
                    <div
                      key={fb.fbId}
                      className={`${
                        i > 0 ? "pt-3 border-t border-blue-100" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                        <span className="font-medium text-foreground">
                          {authorNames[fb.authorId] ?? fb.authorRole}
                        </span>
                        <span>
                          {new Date(fb.createdAt).toLocaleString("ja-JP", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                        {fb.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* フィードバックがない場合 */}
              {!isLoadingFeedback && feedbackList.length === 0 && (
                <p className="text-sm text-muted-foreground mb-3">
                  フィードバックはまだありません
                </p>
              )}

              {/* フィードバック入力 */}
              <div className="flex gap-2">
                <Textarea
                  value={inputValue}
                  onChange={(e) => feedback.setInput(msgId, e.target.value)}
                  placeholder="フィードバックを入力..."
                  className="min-h-[60px] text-sm resize-none"
                  disabled={isSubmitting}
                />
                <Button
                  size="sm"
                  onClick={handleSubmitFeedback}
                  disabled={isSubmitting || !inputValue.trim()}
                  className="shrink-0 self-end"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "送信"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
