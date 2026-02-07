"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import type { KCCandidate } from "../../interfaceAdapters/gateways/api/KnowledgeGateway";

// ============================================
// 型定義
// ============================================

interface KCEditModalProps {
  candidate: KCCandidate | null;
  onClose: () => void;
  onSave: (edited: KCCandidate) => Promise<void>;
}

// ============================================
// メインコンポーネント
// ============================================

export function KCEditModal({ candidate, onClose, onSave }: KCEditModalProps) {
  const [form, setForm] = useState<KCCandidate | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (candidate) {
      setForm({ ...candidate });
      setTagInput("");
    }
  }, [candidate]);

  if (!form) return null;

  const handleFieldChange = (
    field: keyof Pick<KCCandidate, "title" | "situation" | "knowhow" | "precaution" | "importance" | "example">,
    value: string,
  ) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (!tag || !form) return;
    if (form.tags.includes(tag)) {
      setTagInput("");
      return;
    }
    setForm((prev) => (prev ? { ...prev, tags: [...prev.tags, tag] } : prev));
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    setForm((prev) =>
      prev ? { ...prev, tags: prev.tags.filter((t) => t !== tag) } : prev,
    );
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = async () => {
    if (!form) return;
    setIsSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={candidate !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>ナレッジカードを編集</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* タイトル */}
          <FieldRow label="タイトル">
            <Input
              value={form.title}
              onChange={(e) => handleFieldChange("title", e.target.value)}
              placeholder="タイトルを入力"
            />
          </FieldRow>

          {/* 状況 */}
          <FieldRow label="状況">
            <textarea
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2}
              value={form.situation}
              onChange={(e) => handleFieldChange("situation", e.target.value)}
              placeholder="どのような状況で?"
            />
          </FieldRow>

          {/* ノウハウ */}
          <FieldRow label="ノウハウ">
            <textarea
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              value={form.knowhow}
              onChange={(e) => handleFieldChange("knowhow", e.target.value)}
              placeholder="具体的なノウハウ"
            />
          </FieldRow>

          {/* 注意点 */}
          <FieldRow label="注意点">
            <textarea
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2}
              value={form.precaution}
              onChange={(e) => handleFieldChange("precaution", e.target.value)}
              placeholder="注意すべきこと（任意）"
            />
          </FieldRow>

          {/* 重要性 */}
          <FieldRow label="重要性">
            <textarea
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2}
              value={form.importance ?? ""}
              onChange={(e) => handleFieldChange("importance", e.target.value)}
              placeholder="なぜ重要なのか（任意）"
            />
          </FieldRow>

          {/* 具体例 */}
          <FieldRow label="具体例">
            <textarea
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2}
              value={form.example ?? ""}
              onChange={(e) => handleFieldChange("example", e.target.value)}
              placeholder="具体的な事例（任意）"
            />
          </FieldRow>

          {/* タグ */}
          <FieldRow label="タグ">
            <div className="space-y-2">
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      #{tag} ×
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="タグを入力してEnter"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim()}
                >
                  追加
                </Button>
              </div>
            </div>
          </FieldRow>

          {/* 信頼度（読み取り専用） */}
          <FieldRow label="信頼度">
            <div className="text-sm text-muted-foreground">
              {Math.round(form.confidence * 100)}%
            </div>
          </FieldRow>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            キャンセル
          </Button>
          <Button onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// サブコンポーネント
// ============================================

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}
