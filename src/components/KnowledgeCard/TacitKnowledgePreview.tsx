"use client";

import { useState } from "react";
import { Check, Pencil, X, Lightbulb, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import type { KCCandidate } from "../../interfaceAdapters/gateways/api/KnowledgeGateway";

// ============================================
// 型定義
// ============================================

interface TacitKnowledgePreviewProps {
  candidates: KCCandidate[];
  onSave: (candidate: KCCandidate) => Promise<void>;
  onEdit: (candidate: KCCandidate) => void;
  onDismiss: (index: number) => void;
  isDetecting: boolean;
}

// ============================================
// メインコンポーネント
// ============================================

export function TacitKnowledgePreview({
  candidates,
  onSave,
  onEdit,
  onDismiss,
  isDetecting,
}: TacitKnowledgePreviewProps) {
  if (candidates.length === 0 && !isDetecting) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-3">
      {/* 検出中インジケーター */}
      {isDetecting && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          暗黙知を検出しています...
        </div>
      )}

      {/* KC候補リスト */}
      {candidates.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            暗黙知が検出されました（{candidates.length}件）
          </div>
          {candidates.map((candidate, index) => (
            <KCCandidateCard
              key={`${candidate.title}-${index}`}
              candidate={candidate}
              index={index}
              onSave={onSave}
              onEdit={onEdit}
              onDismiss={onDismiss}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// サブコンポーネント
// ============================================

function KCCandidateCard({
  candidate,
  index,
  onSave,
  onEdit,
  onDismiss,
}: {
  candidate: KCCandidate;
  index: number;
  onSave: (candidate: KCCandidate) => Promise<void>;
  onEdit: (candidate: KCCandidate) => void;
  onDismiss: (index: number) => void;
}) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(candidate);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-lg border bg-amber-50/50 dark:bg-amber-950/10 p-4 space-y-3">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium truncate">{candidate.title}</h4>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              信頼度: {Math.round(candidate.confidence * 100)}%
            </Badge>
            {candidate.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
          onClick={() => onDismiss(index)}
          aria-label="閉じる"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* 内容プレビュー */}
      <div className="space-y-1.5 text-xs text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">状況: </span>
          {candidate.situation}
        </p>
        <p>
          <span className="font-medium text-foreground">ノウハウ: </span>
          {candidate.knowhow}
        </p>
        {candidate.precaution && (
          <p>
            <span className="font-medium text-foreground">注意点: </span>
            {candidate.precaution}
          </p>
        )}
      </div>

      {/* アクションボタン */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={() => void handleSave()}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Check className="mr-1 h-3 w-3" />
          )}
          確認して保存
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onEdit(candidate)}
        >
          <Pencil className="mr-1 h-3 w-3" />
          修正する
        </Button>
      </div>
    </div>
  );
}
