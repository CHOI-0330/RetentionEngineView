"use client";

import { memo, useRef, useEffect } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import MarkdownRendererView from "../MarkdownRenderer";
import { QuestionCardChatComposer } from "./QuestionCardChatComposer";
import { QuestionCardPreview } from "./QuestionCardPreview";
import {
  useQuestionCardChatPresenter,
  type QCChatMessageVM,
} from "../../interfaceAdapters/presenters/useQuestionCardChatPresenter";

interface QuestionCardChatModalProps {
  open: boolean;
  onClose: () => void;
  originalAiMessage: string;
  accessToken?: string;
  sourceConvId?: string;
  sourceMsgId?: string;
}

export const QuestionCardChatModal = memo(function QuestionCardChatModal({
  open,
  onClose,
  originalAiMessage,
  accessToken,
  sourceConvId,
  sourceMsgId,
}: QuestionCardChatModalProps) {
  const { viewModel, actions } = useQuestionCardChatPresenter({
    accessToken,
    originalAiMessage,
    sourceConvId,
    sourceMsgId,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMsgContent =
    viewModel.messages[viewModel.messages.length - 1]?.content;

  // 新しいメッセージが追加されたらスクロール
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [viewModel.messages.length, lastMsgContent]);

  const handleClose = () => {
    actions.reset();
    onClose();
  };

  // 完了フェーズ
  if (viewModel.phase === "done") {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center py-8 gap-4">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <h3 className="text-lg font-semibold">質問カードを送信しました</h3>
            <p className="text-sm text-muted-foreground text-center">
              ナレッジライブラリの「質問」タブから確認できます。
            </p>
            <Button onClick={handleClose} className="mt-2">
              閉じる
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col p-0 gap-0">
        {/* ヘッダー */}
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="text-base">質問カードを作成</DialogTitle>
          {viewModel.phase === "chatting" && (
            <p className="text-xs text-muted-foreground mt-1">
              AIがあなたの質問を整理するお手伝いをします
            </p>
          )}
        </DialogHeader>

        {/* プレビューフェーズ */}
        {viewModel.phase === "previewing" || viewModel.phase === "saving" ? (
          <div className="flex-1 overflow-y-auto">
            <QuestionCardPreview
              candidates={viewModel.candidates}
              onUpdate={actions.updateCandidate}
              onRemove={actions.removeCandidate}
              onSave={actions.saveCards}
              onBack={actions.backToChat}
              isSaving={viewModel.isSaving}
            />
          </div>
        ) : (
          <>
            {/* チャットフェーズ */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
              {/* 元のAI回答コンテキスト */}
              <div className="mb-4 rounded-lg border bg-muted/30 p-3">
                <p className="text-[10px] font-medium text-muted-foreground mb-1">
                  元のAI回答
                </p>
                <p className="text-xs text-foreground/80 line-clamp-3">
                  {originalAiMessage}
                </p>
              </div>

              {/* ガイドメッセージ（初回のみ） */}
              {viewModel.messages.length === 0 && !viewModel.isStreaming && (
                <div className="flex gap-2 mb-4">
                  <Avatar className="h-7 w-7 border bg-purple-50 shrink-0">
                    <AvatarFallback className="text-[9px] text-purple-600">
                      AI
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-2xl rounded-tl-sm bg-purple-50 px-4 py-2.5 text-sm text-foreground">
                    この回答について先輩に聞きたいことはありますか？
                    どんなことでも大丈夫なので、教えてください。
                  </div>
                </div>
              )}

              {/* メッセージ一覧 */}
              <div className="flex flex-col gap-3">
                {viewModel.messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}
              </div>
            </div>

            {/* エラー */}
            {viewModel.error && (
              <div className="px-4 py-2 text-xs text-destructive bg-destructive/10 border-t">
                {viewModel.error}
              </div>
            )}

            {/* 入力欄 */}
            <QuestionCardChatComposer
              onSend={actions.sendMessage}
              disabled={false}
              isStreaming={viewModel.isStreaming}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
});

// --- サブコンポーネント ---

function ChatMessage({ message }: { message: QCChatMessageVM }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {!isUser && (
        <Avatar className="h-7 w-7 border bg-purple-50 shrink-0">
          <AvatarFallback className="text-[9px] text-purple-600">
            AI
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={`rounded-2xl px-4 py-2.5 text-sm max-w-[80%] ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-purple-50 text-foreground rounded-tl-sm"
        }`}
      >
        {!isUser && message.content ? (
          <MarkdownRendererView
            content={message.content}
            className="space-y-1.5 break-words text-sm [&>pre]:text-xs"
          />
        ) : !isUser && !message.content ? (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-xs">考え中...</span>
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}
      </div>
    </div>
  );
}
