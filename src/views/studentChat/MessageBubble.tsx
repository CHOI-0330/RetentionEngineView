/**
 * MessageBubble コンポーネント
 *
 * レガシースタイルの個別メッセージ表示（フィードバック機能付き）
 */

import { memo, useEffect, useState, lazy, Suspense } from "react";
import {
  Loader2,
  MessageCircle,
  Globe,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import MarkdownRendererView from "../../components/MarkdownRenderer";

// Dynamic Import: SourceDetailModal (モーダルは必要時のみロード)
const SourceDetailModal = lazy(() =>
  import("../../components/SourceDetailModal").then((m) => ({
    default: m.SourceDetailModal,
  }))
);
import type { Feedback, WebSource, FileSearchSource } from "../../domain/core";
import type { MessageViewModel } from "../../interfaceAdapters/services/StudentChatService";
import type { FeedbackActions } from "./types";

interface MessageBubbleProps {
  message: MessageViewModel;
  authorName?: string;
  feedback?: FeedbackActions;
  authorNames?: Record<string, string>;
  canWriteFeedback?: boolean; // フィードバック入力可否（MEINTORのみtrue）
}

export const MessageBubble = memo(function MessageBubble({
  message,
  authorName,
  feedback,
  authorNames = {},
  canWriteFeedback = false,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isStreaming =
    message.status === "partial" || message.status === "draft";

  // フィードバック展開状態
  const [showFeedback, setShowFeedback] = useState(false);

  // ソース詳細モーダル状態
  const [selectedSource, setSelectedSource] = useState<FileSearchSource | null>(
    null
  );
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);

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
    if (
      showFeedback &&
      feedbackList.length === 0 &&
      !isLoadingFeedback &&
      feedback
    ) {
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
          {/* フィードバックボタン（AI応答のみ）
              - MENTOR: 常に表示（入力可能）
              - NEW_HIRE: フィードバックがある場合のみ表示（閲覧専用）
          */}
          {!isUser &&
            feedback &&
            !isStreaming &&
            message.content &&
            (canWriteFeedback || hasFeedback) && (
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

        {/* ソース表示 */}
        {!isUser && hasSources && !isStreaming && message.content && (
          <div className="mt-3 w-full pl-10">
            <div className="rounded-lg border bg-card p-3">
              {/* ヘッダー */}
              <div className="mb-2.5 flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                <span className="font-medium">参照ソース</span>
                <span className="text-[10px]">
                  (
                  {(sources?.fileSearch?.length ?? 0) +
                    (sources?.webSearch?.length ?? 0)}
                  件)
                </span>
              </div>

              {/* ファイルソース */}
              {hasFileSources && (
                <div className="flex flex-wrap gap-1.5">
                  {sources!.fileSearch!.map(
                    (source: FileSearchSource | string, i: number) => {
                      const fileName =
                        typeof source === "string" ? source : source.fileName;
                      const chunkCount =
                        typeof source === "string" ? 0 : source.chunks.length;
                      const fileSource: FileSearchSource =
                        typeof source === "string"
                          ? { fileName: source, chunks: [] }
                          : source;

                      return (
                        <button
                          key={`file-${i}`}
                          onClick={() => {
                            setSelectedSource(fileSource);
                            setIsSourceModalOpen(true);
                          }}
                          className="group inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-[11px] text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span className="max-w-[180px] truncate">
                            {fileName}
                          </span>
                          {chunkCount > 0 && (
                            <span className="rounded bg-primary/10 px-1 py-0.5 text-[9px] font-medium text-primary">
                              {chunkCount}
                            </span>
                          )}
                        </button>
                      );
                    }
                  )}
                </div>
              )}

              {/* ウェブソース */}
              {hasWebSources && (
                <div className={hasFileSources ? "mt-2.5 pt-2.5 border-t" : ""}>
                  <div className="space-y-1.5">
                    {sources!.webSearch!.map((source: WebSource, i: number) => {
                      // URLのホスト名を安全に取得
                      let hostname = "";
                      try {
                        if (source.url && source.url.startsWith("http")) {
                          hostname = new URL(source.url).hostname;
                        } else {
                          hostname = source.url || "不明なURL";
                        }
                      } catch (e) {
                        console.warn("Invalid URL:", source.url, e);
                        hostname = "不明なURL";
                      }
                      
                      return (
                        <a
                          key={`web-${i}`}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-2 rounded-md border bg-muted/50 px-2 py-1.5 transition-colors hover:bg-muted"
                        >
                          <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-medium text-foreground/80 group-hover:text-foreground">
                              {source.title || "ウェブページ"}
                            </p>
                            <p className="truncate text-[10px] text-muted-foreground">
                              {hostname}
                            </p>
                          </div>
                          <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
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

              {/* フィードバック入力（MENTORのみ表示） */}
              {canWriteFeedback && (
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
              )}
            </div>
          </div>
        )}

        {/* ソース詳細モーダル (Dynamic Import) */}
        {isSourceModalOpen && (
          <Suspense fallback={null}>
            <SourceDetailModal
              open={isSourceModalOpen}
              onOpenChange={setIsSourceModalOpen}
              source={selectedSource}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
});
