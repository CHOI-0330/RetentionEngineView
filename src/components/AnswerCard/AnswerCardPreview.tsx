"use client";

import { memo } from "react";
import {
  MapPin,
  Lightbulb,
  AlertTriangle,
  Star,
  FileText,
  Tag,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import type { AnswerCardCandidate } from "../../interfaceAdapters/gateways/api/AnswerCardGateway";

interface AnswerCardPreviewProps {
  candidate: AnswerCardCandidate;
  onUpdate: (data: Partial<AnswerCardCandidate>) => void;
  onSave: () => void;
  onBack: () => void;
  isSaving?: boolean;
}

const SECTION_CONFIG = [
  { key: "situation" as const, label: "状況", icon: MapPin, color: "text-blue-600", bg: "bg-blue-50", borderColor: "border-blue-200" },
  { key: "knowhow" as const, label: "ノウハウ", icon: Lightbulb, color: "text-amber-600", bg: "bg-amber-50", borderColor: "border-amber-200" },
  { key: "precaution" as const, label: "注意点", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", borderColor: "border-red-200" },
  { key: "importance" as const, label: "重要性", icon: Star, color: "text-purple-600", bg: "bg-purple-50", borderColor: "border-purple-200" },
  { key: "example" as const, label: "具体例", icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50", borderColor: "border-emerald-200" },
] as const;

export const AnswerCardPreview = memo(function AnswerCardPreview({
  candidate,
  onUpdate,
  onSave,
  onBack,
  isSaving = false,
}: AnswerCardPreviewProps) {
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          ナレッジカードのプレビュー
        </h3>
        <Button variant="ghost" size="sm" onClick={onBack}>
          戻って編集
        </Button>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto">
        {/* タイトル */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            タイトル
          </label>
          <Input
            value={candidate.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="text-sm"
            disabled={isSaving}
          />
        </div>

        {/* セクション */}
        {SECTION_CONFIG.map(({ key, label, icon: Icon, color, bg, borderColor }) => {
          const value = candidate[key];
          // importance/example は optional なのでスキップ可能
          if (key === "importance" || key === "example") {
            return (
              <div key={key} className={`rounded-lg border ${borderColor} ${bg} p-3 space-y-1.5`}>
                <label className={`text-xs font-medium ${color} flex items-center gap-1.5`}>
                  <Icon className="h-3.5 w-3.5" />
                  {label}（任意）
                </label>
                <Textarea
                  value={value ?? ""}
                  onChange={(e) => onUpdate({ [key]: e.target.value || undefined })}
                  className="text-sm bg-white min-h-[60px] resize-y"
                  rows={2}
                  disabled={isSaving}
                  placeholder={`${label}を入力（空白で省略）`}
                />
              </div>
            );
          }

          return (
            <div key={key} className={`rounded-lg border ${borderColor} ${bg} p-3 space-y-1.5`}>
              <label className={`text-xs font-medium ${color} flex items-center gap-1.5`}>
                <Icon className="h-3.5 w-3.5" />
                {label}
              </label>
              <Textarea
                value={value}
                onChange={(e) => onUpdate({ [key]: e.target.value })}
                className="text-sm bg-white min-h-[80px] resize-y"
                rows={3}
                disabled={isSaving}
              />
            </div>
          );
        })}

        {/* タグ */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5" />
            タグ
          </label>
          <div className="flex flex-wrap gap-1.5">
            {candidate.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* 信頼度 */}
        <div className="text-xs text-muted-foreground">
          信頼度: {Math.round(candidate.confidence * 100)}%
        </div>
      </div>

      {/* 保存ボタン */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onBack} disabled={isSaving}>
          やり直す
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving || !candidate.title.trim() || !candidate.knowhow.trim()}
          className="bg-green-600 hover:bg-green-700"
        >
          {isSaving ? "保存中..." : "ナレッジとして保存"}
        </Button>
      </div>
    </div>
  );
});
