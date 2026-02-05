"use client";

import { useState } from "react";
import { Eye, Tag, User, Calendar, MessageSquare } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import type { QCListItem } from "../../interfaceAdapters/gateways/api/QuestionCardGateway";

// ============================================
// 型定義
// ============================================

interface QuestionCardDetailDialogProps {
  item: QCListItem | null;
  onClose: () => void;
}

// ============================================
// 定数
// ============================================

const statusConfig = {
  open: { label: "未回答", color: "bg-purple-100 text-purple-800" },
  resolved: { label: "回答済み", color: "bg-green-100 text-green-800" },
} as const;

// ============================================
// コンポーネント
// ============================================

export function QuestionCardDetailDialog({
  item,
  onClose,
}: QuestionCardDetailDialogProps) {
  if (!item) return null;

  const statusCfg = statusConfig[item.status] ?? statusConfig.open;
  const date = new Date(item.createdAt);
  const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;

  return (
    <Dialog
      open={item !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant="secondary" className={statusCfg.color}>
              {statusCfg.label}
            </Badge>
            <span className="text-base">{item.title}</span>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {dateStr}
            </span>
            {!item.isAnonymous && item.creatorName && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {item.creatorName}
              </span>
            )}
            {item.isAnonymous && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <User className="h-3 w-3" />
                匿名
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-5">
          {/* 背景 */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              背景・状況
            </h4>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {item.background}
            </p>
          </div>

          {/* 質問内容 */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              質問内容
            </h4>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {item.questionBody}
              </p>
            </div>
          </div>

          {/* タグ */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded"
                >
                  <Tag className="h-2.5 w-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* フッター */}
          <div className="flex items-center pt-2 border-t text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {item.viewCount}回閲覧
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
