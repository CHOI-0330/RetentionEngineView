/**
 * MessageBubble コンポーネント
 *
 * レガシースタイルの個別メッセージ表示（フィードバック機能付き）
 */

import { memo, useEffect, useState } from "react";
import { Loader2, MessageCircle, Globe, FileText, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import MarkdownRendererView from "../../components/MarkdownRenderer";
import type { Feedback, WebSource } from "../../domain/core";
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

  // ソース関連
  const sources = message.sources;
  const hasWebSources = sources?.webSearch && sources.webSearch.length > 0;
  const hasFileSources = sources?.fileSearch && sources.fileSearch.length > 0;
  const hasSources = hasWebSources || hasFileSources;

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

        {/* ソース表示（常に表示） - Modern Design with Clickable Icons */}
        {!isUser && hasSources && !isStreaming && message.content && (
          <div className="mt-3 w-full pl-10">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50 via-white to-slate-50/40 p-4 shadow-sm backdrop-blur-sm">
              {/* Header with Source Count Badge */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md">
                    <span className="text-sm">📚</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">
                    参照ソース
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {hasWebSources && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100/80 px-2.5 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-blue-200/50">
                      <Globe className="h-3 w-3" />
                      {sources!.webSearch!.length}
                    </span>
                  )}
                  {hasFileSources && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/80 px-2.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200/50">
                      <FileText className="h-3 w-3" />
                      {sources!.fileSearch!.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Web Sources - Compact Card Design */}
              {hasWebSources && (
                <div className="space-y-2">
                  {sources!.webSearch!.map((source: WebSource, i: number) => (
                    <div
                      key={`web-${i}`}
                      className="group relative overflow-hidden rounded-xl border border-slate-200/60 bg-white p-3 shadow-sm transition-all duration-300 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5"
                    >
                      {/* Gradient Accent Line */}
                      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                      <div className="flex items-start gap-3">
                        {/* Clickable Globe Icon */}
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md transition-all duration-300 hover:scale-110 hover:shadow-lg hover:from-blue-600 hover:to-indigo-700 active:scale-95"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Globe className="h-4.5 w-4.5 text-white" />
                        </a>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 min-w-0"
                            >
                              <h4 className="font-semibold text-sm text-slate-800 line-clamp-1 transition-colors duration-200 group-hover:text-blue-700">
                                {source.title || "ウェブページ"}
                              </h4>
                            </a>
                            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-all duration-200 group-hover:text-blue-600 group-hover:scale-110" />
                          </div>

                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                              {new URL(source.url).hostname}
                            </span>
                          </div>

                          {source.snippet && (
                            <p className="mt-2 text-xs leading-relaxed text-slate-600 line-clamp-2">
                              {source.snippet}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* File Sources - Badge Style with Clickable Icons */}
              {hasFileSources && (
                <div className={hasWebSources ? "mt-3 pt-3 border-t border-slate-200/60" : ""}>
                  <div className="mb-2.5 flex items-center gap-2 text-[11px] font-medium text-slate-600">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-amber-400 to-orange-500">
                      <FileText className="h-3 w-3 text-white" />
                    </div>
                    <span>社内ドキュメント</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {sources!.fileSearch!.map((fileName: string, i: number) => (
                      <button
                        key={`file-${i}`}
                        className="group inline-flex items-center gap-2 rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50/40 px-3 py-2 text-xs font-medium text-amber-900 shadow-sm transition-all duration-300 hover:border-amber-300 hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm transition-transform duration-300 group-hover:scale-110">
                          <FileText className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="max-w-[200px] truncate">
                          {fileName}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Decorative Background Pattern */}
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-blue-100/20 to-purple-100/20 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-gradient-to-tr from-indigo-100/20 to-pink-100/20 blur-2xl" />
            </div>
          </div>
        )}

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
