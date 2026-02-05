"use client";

import { memo } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import type { QuestionCardCandidate } from "../../interfaceAdapters/gateways/api/QuestionCardGateway";

interface QuestionCardPreviewProps {
  candidates: QuestionCardCandidate[];
  onUpdate: (index: number, data: Partial<QuestionCardCandidate>) => void;
  onRemove: (index: number) => void;
  onSave: () => void;
  onBack: () => void;
  isSaving?: boolean;
}

export const QuestionCardPreview = memo(function QuestionCardPreview({
  candidates,
  onUpdate,
  onRemove,
  onSave,
  onBack,
  isSaving = false,
}: QuestionCardPreviewProps) {
  if (candidates.length === 0) return null;

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          質問カードのプレビュー ({candidates.length}件)
        </h3>
        <Button variant="ghost" size="sm" onClick={onBack}>
          戻って編集
        </Button>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto">
        {candidates.map((card, index) => (
          <div
            key={index}
            className="relative rounded-lg border border-purple-200 bg-purple-50/50 p-4 space-y-3"
          >
            {/* 削除ボタン */}
            {candidates.length > 1 && (
              <button
                onClick={() => onRemove(index)}
                className="absolute top-2 right-2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {/* タイトル */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                タイトル
              </label>
              <Input
                value={card.title}
                onChange={(e) =>
                  onUpdate(index, { title: e.target.value })
                }
                className="text-sm bg-white"
                disabled={isSaving}
              />
            </div>

            {/* 背景 */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                背景・状況
              </label>
              <Textarea
                value={card.background}
                onChange={(e) =>
                  onUpdate(index, { background: e.target.value })
                }
                className="text-sm bg-white min-h-[100px] resize-y"
                rows={4}
                disabled={isSaving}
              />
            </div>

            {/* 質問 */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                具体的な質問
              </label>
              <Textarea
                value={card.questionBody}
                onChange={(e) =>
                  onUpdate(index, { questionBody: e.target.value })
                }
                className="text-sm bg-white min-h-[100px] resize-y"
                rows={4}
                disabled={isSaving}
              />
            </div>

            {/* タグ */}
            {card.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {card.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* 匿名設定 */}
            <div className="flex items-center justify-between pt-2 border-t border-purple-200">
              <button
                onClick={() =>
                  onUpdate(index, { isAnonymous: !card.isAnonymous })
                }
                disabled={isSaving}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {card.isAnonymous ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    <span>匿名で投稿</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    <span>名前を公開</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 保存ボタン */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onBack} disabled={isSaving}>
          やり直す
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving || candidates.length === 0}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {isSaving ? "保存中..." : `質問を送信する (${candidates.length}件)`}
        </Button>
      </div>
    </div>
  );
});
