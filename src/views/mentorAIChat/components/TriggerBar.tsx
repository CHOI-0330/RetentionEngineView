/**
 * TriggerBar コンポーネント
 *
 * 暗黙知トリガー検出数を表示する薄型バー
 * - ブランドカラー背景 + 白テキスト
 * - 32-36px高さ
 * - スライドダウンアニメーションで登場
 * - 保存完了メッセージ表示後にスライドアップで退場
 *
 * Story 2-10: V2自動ヒアリングKC完了通知対応
 * - hasReadyKC=true時: ヒアリング完了KCの保存/無視ボタン表示
 */

import { memo } from "react";
import { Sparkles, CheckCircle, X } from "lucide-react";
import { Button } from "../../../components/ui/button";

interface TriggerBarProps {
  /** V1: 未保存トリガー数 */
  unsavedCount: number;
  /** 保存完了メッセージ */
  savedMessage: string | null;
  /** V1: 確認ボタンクリック */
  onReviewClick: () => void;
  /** V2: ヒアリング完了KCがあるか */
  hasReadyKC?: boolean;
  /** V2: ヒアリングラウンド数（1-3） */
  hearingRound?: number;
  /** V2: KC確認/レビュークリック（モーダル表示用） */
  onReviewSessionKC?: () => void;
  /** V2: 無視クリック */
  onDismissSession?: () => void;
}

export const TriggerBar = memo(function TriggerBar({
  unsavedCount,
  savedMessage,
  onReviewClick,
  hasReadyKC = false,
  hearingRound,
  onReviewSessionKC,
  onDismissSession,
}: TriggerBarProps) {
  // V2ヒアリング完了KC優先、次にV1トリガー、最後に保存メッセージ
  const isVisible = hasReadyKC || unsavedCount > 0 || savedMessage !== null;

  // V2: ヒアリング完了KC通知
  if (hasReadyKC) {
    return (
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isVisible ? "max-h-9 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex h-9 items-center justify-between bg-amber-500 px-4 text-white">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>
              <span className="font-bold">💡 暗黙知カード</span>が準備できました
              {hearingRound && hearingRound > 1 && (
                <span className="ml-1 text-xs opacity-80">
                  ({hearingRound}回のヒアリング完了)
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="h-6 px-3 text-xs font-medium bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={onReviewSessionKC}
            >
              <CheckCircle className="mr-1 h-3 w-3" />
              確認する
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-white/80 hover:text-white hover:bg-white/10"
              onClick={onDismissSession}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // V1: トリガー検出通知 / 保存完了メッセージ
  return (
    <div
      className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isVisible ? "max-h-9 opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <div className="flex h-9 items-center justify-between bg-primary px-4 text-primary-foreground">
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="h-3.5 w-3.5" />
          {savedMessage ? (
            <span className="font-medium">{savedMessage}</span>
          ) : (
            <span>
              <span className="font-bold">{unsavedCount}件</span>の暗黙知が検出されました
            </span>
          )}
        </div>
        {!savedMessage && unsavedCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            className="h-6 px-3 text-xs font-medium"
            onClick={onReviewClick}
          >
            確認する
          </Button>
        )}
      </div>
    </div>
  );
});
