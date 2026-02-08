/**
 * TriggerKCReviewModal コンポーネント
 *
 * トリガー検出された暗黙知を確認・保存するモーダル
 * - 単件モード: ✨クリックで1件のみ表示
 * - 一括モード: 上部バー/チャットリストから全件表示（チェックボックス付き）
 */

"use client";

import { memo, useState, useEffect, useCallback } from "react";
import { Loader2, Sparkles, Check } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Checkbox } from "../../../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../components/ui/dialog";
import type { TriggerItem } from "../../../interfaceAdapters/hooks/useTriggerDetection";
import type { KCCandidate } from "../../../interfaceAdapters/gateways/api/KnowledgeGateway";

// ============================================
// 型定義
// ============================================

interface TriggerKCReviewModalProps {
  /** 表示するトリガー群 (null=閉じる) */
  triggers: TriggerItem[] | null;
  /** モード: single=1件, bulk=複数件 */
  mode: "single" | "bulk";
  /** モーダルを閉じる */
  onClose: () => void;
  /** 単件保存 */
  onSaveSingle: (triggerId: string, candidate: KCCandidate) => Promise<void>;
  /** 一括保存 */
  onSaveBulk: (
    items: Array<{ triggerId: string; candidate: KCCandidate }>,
  ) => Promise<void>;
  /** 無視 */
  onDismiss: (triggerId: string) => void;
}

// トリガーからKCCandidateへの初期変換（V2対応）
function triggerToCandidate(trigger: TriggerItem): KCCandidate {
  // V2: initialKCがあればそのまま活用
  if (trigger.initialKC) {
    return {
      title: trigger.initialKC.title || "暗黙知",
      situation: trigger.initialKC.situation || "",
      knowhow: trigger.initialKC.knowhow || "",
      precaution: trigger.initialKC.precaution || "",
      tags: trigger.initialKC.tags?.length ? trigger.initialKC.tags : (trigger.triggerType ? [trigger.triggerType] : []),
      confidence: trigger.confidence,
    };
  }
  // V1フォールバック: excerptから生成
  const excerpt = trigger.excerpt ?? "";
  return {
    title: excerpt.length > 40 ? excerpt.substring(0, 40) + "..." : excerpt || "暗黙知",
    situation: "",
    knowhow: excerpt,
    precaution: "",
    tags: trigger.triggerType ? [trigger.triggerType] : [],
    confidence: trigger.confidence,
  };
}

// トリガー種別の日本語ラベル
function triggerTypeLabel(type: string | null): string {
  if (!type) return "一般";
  const labels: Record<string, string> = {
    experience_sharing: "経験共有",
    lesson_learned: "教訓",
    best_practice: "ベストプラクティス",
    workaround: "回避策",
    cultural_knowledge: "文化的知識",
    process_insight: "プロセス知見",
  };
  return labels[type] ?? type;
}

// ============================================
// メインコンポーネント
// ============================================

export const TriggerKCReviewModal = memo(function TriggerKCReviewModal({
  triggers,
  mode,
  onClose,
  onSaveSingle,
  onSaveBulk,
  onDismiss,
}: TriggerKCReviewModalProps) {
  const isOpen = triggers !== null && triggers.length > 0;

  if (mode === "single" && isOpen) {
    return (
      <SingleReviewModal
        trigger={triggers[0]}
        onClose={onClose}
        onSave={onSaveSingle}
        onDismiss={onDismiss}
      />
    );
  }

  if (mode === "bulk" && isOpen) {
    return (
      <BulkReviewModal
        triggers={triggers}
        onClose={onClose}
        onSaveBulk={onSaveBulk}
        onDismiss={onDismiss}
      />
    );
  }

  return null;
});

// ============================================
// 単件レビューモーダル
// ============================================

function SingleReviewModal({
  trigger,
  onClose,
  onSave,
  onDismiss,
}: {
  trigger: TriggerItem;
  onClose: () => void;
  onSave: (triggerId: string, candidate: KCCandidate) => Promise<void>;
  onDismiss: (triggerId: string) => void;
}) {
  const [form, setForm] = useState<KCCandidate>(() =>
    triggerToCandidate(trigger),
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setForm(triggerToCandidate(trigger));
  }, [trigger]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(trigger.id, form);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDismiss = () => {
    onDismiss(trigger.id);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            暗黙知の確認
          </DialogTitle>
          <DialogDescription>
            会話から検出された暗黙知をナレッジカードとして保存できます。
          </DialogDescription>
        </DialogHeader>

        {/* 原文抜粋 */}
        <div className="rounded-lg border bg-amber-50/50 p-3">
          <p className="text-xs font-medium text-amber-700 mb-1">検出された内容</p>
          <p className="text-sm text-foreground leading-relaxed">
            {trigger.excerpt || "（抜粋なし）"}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              {triggerTypeLabel(trigger.triggerType)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              信頼度: {Math.round(trigger.confidence * 100)}%
            </span>
          </div>
        </div>

        {/* 編集フォーム */}
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">タイトル</label>
            <Input
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="ナレッジのタイトル"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">ノウハウ</label>
            <textarea
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              value={form.knowhow}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, knowhow: e.target.value }))
              }
              placeholder="具体的なノウハウ"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleDismiss} disabled={isSaving}>
            無視する
          </Button>
          <Button onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving && (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            )}
            保存する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// 一括レビューモーダル
// ============================================

function BulkReviewModal({
  triggers,
  onClose,
  onSaveBulk,
  onDismiss,
}: {
  triggers: TriggerItem[];
  onClose: () => void;
  onSaveBulk: (
    items: Array<{ triggerId: string; candidate: KCCandidate }>,
  ) => Promise<void>;
  onDismiss: (triggerId: string) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(triggers.map((t) => t.id)),
  );
  const [isSaving, setIsSaving] = useState(false);

  // triggerが変わったら全選択リセット
  useEffect(() => {
    setSelected(new Set(triggers.map((t) => t.id)));
  }, [triggers]);

  const toggleItem = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const items = triggers
        .filter((t) => selected.has(t.id))
        .map((t) => ({
          triggerId: t.id,
          candidate: triggerToCandidate(t),
        }));

      if (items.length > 0) {
        await onSaveBulk(items);
      }

      // 選択されなかったものは無視
      triggers
        .filter((t) => !selected.has(t.id))
        .forEach((t) => onDismiss(t.id));

      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCount = selected.size;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            暗黙知の一括確認
          </DialogTitle>
          <DialogDescription>
            検出された暗黙知を確認し、保存する項目を選択してください。
          </DialogDescription>
        </DialogHeader>

        {/* トリガー一覧 */}
        <div className="max-h-[50vh] overflow-y-auto space-y-2 py-1">
          {triggers.map((trigger) => {
            const isChecked = selected.has(trigger.id);
            return (
              <label
                key={trigger.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                  isChecked
                    ? "border-primary/30 bg-primary/5"
                    : "border-border hover:bg-muted/30"
                }`}
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => toggleItem(trigger.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-relaxed line-clamp-2">
                    {trigger.excerpt || "（抜粋なし）"}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                      {triggerTypeLabel(trigger.triggerType)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      信頼度: {Math.round(trigger.confidence * 100)}%
                    </span>
                  </div>
                </div>
                {isChecked && (
                  <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                )}
              </label>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            キャンセル
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={isSaving || selectedCount === 0}
          >
            {isSaving && (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            )}
            {selectedCount > 0
              ? `${selectedCount}件を保存`
              : "保存する項目を選択"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
