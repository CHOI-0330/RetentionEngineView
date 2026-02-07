"use client";

import { memo, useRef, useEffect } from "react";
import { X, Loader2, CheckCircle2, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import MarkdownRendererView from "../MarkdownRenderer";
import { AnswerCardChatComposer } from "./AnswerCardChatComposer";
import { AnswerCardPreview } from "./AnswerCardPreview";
import {
  useAnswerCardChatPresenter,
  type ACChatMessageVM,
} from "../../interfaceAdapters/presenters/useAnswerCardChatPresenter";

interface AnswerCardChatPanelProps {
  onClose: () => void;
  questionCardId: string;
  questionTitle: string;
  questionBody: string;
  questionBackground?: string;
  accessToken?: string;
}

export const AnswerCardChatPanel = memo(function AnswerCardChatPanel({
  onClose,
  questionCardId,
  questionTitle,
  questionBody,
  questionBackground,
  accessToken,
}: AnswerCardChatPanelProps) {
  const { viewModel, actions } = useAnswerCardChatPresenter({
    accessToken,
    questionCardId,
    questionTitle,
    questionBody,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMsgContent =
    viewModel.messages[viewModel.messages.length - 1]?.content;

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
      <div className="flex h-full flex-col">
        <PanelHeader onClose={handleClose} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
          <h3 className="text-lg font-semibold">ナレッジカードとして保存しました</h3>
          <p className="text-sm text-muted-foreground text-center">
            ナレッジライブラリにも自動的に表示されます。
          </p>
          <Button onClick={handleClose} className="mt-2">
            閉じる
          </Button>
        </div>
      </div>
    );
  }

  // プレビューフェーズ
  if (viewModel.phase === "previewing" || viewModel.phase === "saving") {
    return (
      <div className="flex h-full flex-col">
        <PanelHeader onClose={handleClose} />
        <div className="flex-1 overflow-y-auto">
          {viewModel.candidate && (
            <AnswerCardPreview
              candidate={viewModel.candidate}
              onUpdate={actions.updateCandidate}
              onSave={actions.saveCard}
              onBack={actions.backToChat}
              isSaving={viewModel.isSaving}
            />
          )}
        </div>
      </div>
    );
  }

  // チャットフェーズ
  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        onClose={handleClose}
        subtitle="AIがナレッジカード形式に構造化します"
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {/* 質問カードのコンテキスト */}
        <div className="mb-4 rounded-lg border bg-purple-50/50 p-3">
          <p className="text-[10px] font-medium text-purple-600 mb-1 flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            質問カード
          </p>
          <p className="text-sm font-medium text-foreground mb-1">
            {questionTitle}
          </p>
          {questionBackground && (
            <p className="text-xs text-muted-foreground mb-1 line-clamp-2">
              {questionBackground}
            </p>
          )}
          <p className="text-xs text-foreground/80">{questionBody}</p>
        </div>

        {/* ガイドメッセージ（初回のみ） */}
        {viewModel.messages.length === 0 && !viewModel.isStreaming && (
          <div className="flex gap-2 mb-4">
            <Avatar className="h-7 w-7 border bg-green-50 shrink-0">
              <AvatarFallback className="text-[9px] text-green-600">
                AI
              </AvatarFallback>
            </Avatar>
            <div className="rounded-2xl rounded-tl-sm bg-green-50 px-4 py-2.5 text-sm text-foreground">
              この質問に対するあなたの回答を教えてください。
              AIがナレッジカード形式（状況・ノウハウ・注意点）に構造化します。
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
      <AnswerCardChatComposer
        onSend={actions.sendMessage}
        disabled={false}
        isStreaming={viewModel.isStreaming}
      />
    </div>
  );
});

// --- サブコンポーネント ---

function PanelHeader({
  onClose,
  subtitle,
}: {
  onClose: () => void;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold truncate">回答カードを作成</h2>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {subtitle}
          </p>
        )}
      </div>
      <button
        onClick={onClose}
        className="rounded-full p-1.5 hover:bg-muted transition-colors shrink-0 ml-2"
        aria-label="パネルを閉じる"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function ChatMessage({ message }: { message: ACChatMessageVM }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {!isUser && (
        <Avatar className="h-7 w-7 border bg-green-50 shrink-0">
          <AvatarFallback className="text-[9px] text-green-600">
            AI
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={`rounded-2xl px-4 py-2.5 text-sm max-w-[85%] ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-green-50 text-foreground rounded-tl-sm"
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
