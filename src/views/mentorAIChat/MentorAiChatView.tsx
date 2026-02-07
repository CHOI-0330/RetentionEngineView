/**
 * MentorAiChatView
 *
 * メンターAIチャット画面
 * studentChat の MessageList / ChatComposerLegacy を再利用
 */

import { memo, useRef, useEffect, useState, useMemo, useCallback } from "react";
import { AlertTriangle, Loader2, ChevronUp, Lightbulb } from "lucide-react";
import { Button } from "../../components/ui/button";
import { MessageList } from "../studentChat/MessageList";
import { ChatComposerLegacy } from "../studentChat/ChatComposerLegacy";
import { ConversationSidebar } from "./components/ConversationSidebar";
import { TriggerBar } from "./components/TriggerBar";
import { TriggerKCReviewModal } from "./components/TriggerKCReviewModal";
import { TacitKnowledgePreview } from "../../components/KnowledgeCard/TacitKnowledgePreview";
import { KCEditModal } from "../../components/KnowledgeCard/KCEditModal";
import type { KCCandidate } from "../../interfaceAdapters/gateways/api/KnowledgeGateway";
import type { MentorAiChatPresenterOutput } from "../../interfaceAdapters/presenters/useMentorAiChatPresenter";
import type { MessageViewModel } from "../../interfaceAdapters/services/StudentChatService";
import type { TriggerItem } from "../../interfaceAdapters/hooks/useTriggerDetection";

// ============================================
// Props型定義
// ============================================

interface MentorAiChatViewProps {
  presenter: MentorAiChatPresenterOutput;
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * ストリーミングステップをユーザーフレンドリーなラベルに変換
 */
function getStepLabel(step: string): string {
  const stepLabels: Record<string, string> = {
    file_search: "ファイルを検索中...",
    web_search: "Webを検索中...",
    synthesis: "回答を生成中...",
    thinking: "考え中...",
    analyzing: "分析中...",
  };
  return stepLabels[step] ?? `${step}...`;
}

// ============================================
// View コンポーネント
// ============================================

export const MentorAiChatView = memo(function MentorAiChatView({
  presenter,
}: MentorAiChatViewProps) {
  const {
    conversations,
    messages,
    activeConversation,
    isLoading,
    error,
    isSending,
    isAwaitingAssistant,
    newMessage,
    streamingStep,
    knowledgeDetection,
    triggerDetection,
    actions,
  } = presenter;

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [editingCandidate, setEditingCandidate] = useState<KCCandidate | null>(
    null,
  );

  // トリガーレビューモーダル状態
  const [reviewTriggers, setReviewTriggers] = useState<TriggerItem[] | null>(
    null,
  );
  const [reviewMode, setReviewMode] = useState<"single" | "bulk">("single");

  // V2セッションKCレビューモーダル状態
  const [sessionKCForReview, setSessionKCForReview] = useState<KCCandidate | null>(
    null,
  );

  // 未保存トリガーのメッセージIDセット（MessageList用）
  // V1: pending状態のトリガー + V2: ヒアリング中または完了のセッション
  const triggerMsgIds = useMemo(() => {
    const ids = new Set<string>();
    // V1トリガー
    for (const t of triggerDetection.triggers) {
      if (t.status === "pending") {
        ids.add(t.userMsgId);
      }
    }
    // V2ヒアリングセッション
    if (triggerDetection.hearingSession?.triggerMsgId) {
      ids.add(triggerDetection.hearingSession.triggerMsgId);
    }
    return ids;
  }, [triggerDetection.triggers, triggerDetection.hearingSession]);

  // ✨クリック（単件モード）
  const handleTriggerClick = useCallback(
    (msgId: string) => {
      const trigger = actions.triggerDetection.getTriggerByMsgId(msgId);
      if (trigger) {
        setReviewTriggers([trigger]);
        setReviewMode("single");
      }
    },
    [actions.triggerDetection],
  );

  // バー「確認する」/ サイドバーバッジクリック（一括モード）
  const handleBulkReview = useCallback(() => {
    const unsaved = triggerDetection.triggers.filter(
      (t) => t.status === "pending",
    );
    if (unsaved.length > 0) {
      setReviewTriggers(unsaved);
      setReviewMode("bulk");
    }
  }, [triggerDetection.triggers]);

  // V2: セッションKCレビューモーダルを開く
  const handleReviewSessionKC = useCallback(() => {
    const candidate = actions.triggerDetection.getSessionKCAsCandidate();
    if (candidate) {
      setSessionKCForReview(candidate);
    }
  }, [actions.triggerDetection]);

  // モーダルを閉じる
  const handleCloseReview = useCallback(() => {
    setReviewTriggers(null);
  }, []);

  // 新しいメッセージが追加されたらスクロール
  useEffect(() => {
    const viewport = scrollAreaRef.current;
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length, isAwaitingAssistant]);

  // MentorAiMessageViewModel → MessageViewModel (構造的に同一)
  const messageViewModels = messages as unknown as MessageViewModel[];

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
      {/* サイドバー */}
      <ConversationSidebar
        conversations={conversations}
        onSelect={(convId) => void actions.selectConversation(convId)}
        onCreate={actions.createConversation}
        onDelete={(convId) => void actions.deleteConversation(convId)}
        isLoading={isLoading}
        unsavedTriggerCount={triggerDetection.unsavedCount}
        onTriggerBadgeClick={handleBulkReview}
      />

      {/* メインコンテンツ */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ヘッダー */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-3">
          <div className="flex items-center gap-3">
            <a
              href="/mentor"
              className="inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/70"
            >
              <span className="text-lg leading-none">&larr;</span>
              <span>戻る</span>
            </a>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              {activeConversation?.title ?? "メンターAIチャット"}
            </h1>
          </div>
        </header>

        {/* エラー表示 */}
        {error && (
          <div
            className="flex items-center justify-between bg-destructive/10 px-6 py-3 text-sm text-destructive"
            aria-live="polite"
            role="status"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {error.message}
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

        {/* トリガー検出バー（V1: リアルタイムトリガー / V2: ヒアリング完了KC） */}
        <TriggerBar
          unsavedCount={triggerDetection.unsavedCount}
          savedMessage={triggerDetection.savedMessage}
          onReviewClick={handleBulkReview}
          hasReadyKC={triggerDetection.hasReadyKC}
          hearingRound={triggerDetection.hearingSession?.hearingRound}
          onReviewSessionKC={handleReviewSessionKC}
          onDismissSession={actions.triggerDetection.dismissSession}
        />

        {/* メッセージエリア */}
        {isLoading && !activeConversation ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !activeConversation ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <p className="text-muted-foreground">
              左のサイドバーから会話を選択するか、新しい会話を作成してください。
            </p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* ステータスバー */}
            <div className="flex items-center justify-between border-b bg-muted/20 px-6 py-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                {isAwaitingAssistant && (
                  <span className="flex items-center gap-1.5 text-primary text-sm font-medium">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                    {streamingStep
                      ? getStepLabel(streamingStep)
                      : "AIが回答を準備しています..."}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-3 text-[11px] text-muted-foreground hover:bg-background"
                  onClick={() =>
                    void actions.knowledgeDetection.detectManually()
                  }
                  disabled={
                    knowledgeDetection.isDetecting || !activeConversation
                  }
                  aria-label="知識を抽出"
                >
                  <Lightbulb className="h-3 w-3 mr-1" />
                  知識を抽出
                </Button>
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
            </div>

            {/* メッセージリスト */}
            <div
              ref={scrollAreaRef}
              className="flex-1 overflow-y-auto px-4 py-6 sm:px-6"
            >
              <div className="mx-auto max-w-3xl">
                <MessageList
                  messages={messageViewModels}
                  isAwaitingAssistant={isAwaitingAssistant}
                  triggerMsgIds={triggerMsgIds}
                  hearingMsgId={triggerDetection.hearingSession?.triggerMsgId}
                  hearingStatus={triggerDetection.hearingSession?.status}
                  onTriggerClick={handleTriggerClick}
                />
                <div ref={bottomRef} className="h-px" />
              </div>
            </div>

            {/* 暗黙知プレビュー */}
            <TacitKnowledgePreview
              candidates={knowledgeDetection.candidates}
              isDetecting={knowledgeDetection.isDetecting}
              onSave={async (candidate) => {
                const idx = knowledgeDetection.candidates.findIndex(
                  (c) => c.title === candidate.title,
                );
                if (idx >= 0) {
                  await actions.knowledgeDetection.saveCandidateAtIndex(idx);
                }
              }}
              onEdit={(candidate) => setEditingCandidate(candidate)}
              onDismiss={actions.knowledgeDetection.dismissCandidate}
            />

            {/* 入力フォーム */}
            <ChatComposerLegacy
              value={newMessage}
              onChange={actions.setNewMessage}
              onSend={() => void actions.sendMessage()}
              canSend={
                !isSending &&
                !isAwaitingAssistant &&
                newMessage.trim().length > 0
              }
              isSending={isSending}
            />
          </div>
        )}

        {/* KC編集モーダル（ラウンドベース検出用） */}
        <KCEditModal
          candidate={editingCandidate}
          onClose={() => setEditingCandidate(null)}
          onSave={async (edited) => {
            await actions.knowledgeDetection.saveEditedCandidate(edited);
          }}
        />

        {/* V2セッションKCレビューモーダル（自動ヒアリング完了KC） */}
        <KCEditModal
          candidate={sessionKCForReview}
          onClose={() => setSessionKCForReview(null)}
          onSave={async (edited) => {
            await actions.triggerDetection.saveSessionKC(edited);
            setSessionKCForReview(null);
          }}
        />

        {/* トリガーKCレビューモーダル（リアルタイム検出用） */}
        <TriggerKCReviewModal
          triggers={reviewTriggers}
          mode={reviewMode}
          onClose={handleCloseReview}
          onSaveSingle={actions.triggerDetection.saveTrigger}
          onSaveBulk={actions.triggerDetection.saveTriggers}
          onDismiss={actions.triggerDetection.dismissTrigger}
        />
      </div>
    </div>
  );
});

export default MentorAiChatView;
