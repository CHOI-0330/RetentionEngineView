"use client";

import { useState, useCallback } from "react";
import { Sparkles, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import {
  KnowledgeGateway,
  type ExtractionRange,
  type KnowledgeCandidate,
  type SaveKnowledgeResponse,
} from "../../interfaceAdapters/gateways/api/KnowledgeGateway";

// ============================================
// 型定義
// ============================================

interface KnowledgeExtractionDialogProps {
  conversationId: string;
  accessToken?: string;
  messageCount?: number;
  disabled?: boolean;
}

type ExtractionState =
  | { status: "idle" }
  | { status: "extracting" }
  | { status: "preview"; candidates: KnowledgeCandidate[] }
  | { status: "saving" }
  | { status: "success"; result: SaveKnowledgeResponse }
  | { status: "error"; message: string };

type RangeOption = "all" | "recent";

// ============================================
// カテゴリバッジの色
// ============================================

const categoryColors: Record<string, string> = {
  "対応方法": "bg-blue-100 text-blue-800",
  "業界用語": "bg-purple-100 text-purple-800",
  "業務知識": "bg-green-100 text-green-800",
};

// ============================================
// コンポーネント
// ============================================

export function KnowledgeExtractionDialog({
  conversationId,
  accessToken,
  messageCount = 0,
  disabled = false,
}: KnowledgeExtractionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rangeOption, setRangeOption] = useState<RangeOption>("all");
  const [extractionState, setExtractionState] = useState<ExtractionState>({
    status: "idle",
  });
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const handleExtract = useCallback(async () => {
    setExtractionState({ status: "extracting" });

    try {
      const gateway = new KnowledgeGateway({ accessToken });

      const range: ExtractionRange = rangeOption === "recent" ? "recent" : "all";

      const result = await gateway.extractKnowledgePreview({
        conversationId,
        range,
      });

      const candidates = result.candidates ?? [];

      if (candidates.length === 0) {
        setExtractionState({
          status: "preview",
          candidates: [],
        });
      } else {
        // 全候補を初期選択
        setSelectedIndices(new Set(candidates.map((_, i) => i)));
        setExtractionState({
          status: "preview",
          candidates,
        });
      }
    } catch (error) {
      setExtractionState({
        status: "error",
        message: error instanceof Error ? error.message : "抽出に失敗しました",
      });
    }
  }, [conversationId, accessToken, rangeOption]);

  const handleSave = useCallback(async () => {
    if (extractionState.status !== "preview") return;

    const selectedItems = extractionState.candidates.filter((_, i) =>
      selectedIndices.has(i)
    );

    if (selectedItems.length === 0) return;

    setExtractionState({ status: "saving" });

    try {
      const gateway = new KnowledgeGateway({ accessToken });
      const result = await gateway.saveKnowledge({
        conversationId,
        items: selectedItems,
      });

      setExtractionState({ status: "success", result });
    } catch (error) {
      setExtractionState({
        status: "error",
        message: error instanceof Error ? error.message : "保存に失敗しました",
      });
    }
  }, [extractionState, selectedIndices, conversationId, accessToken]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => {
      setExtractionState({ status: "idle" });
      setRangeOption("all");
      setSelectedIndices(new Set());
    }, 200);
  }, []);

  const toggleIndex = useCallback((index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(
    (candidates: KnowledgeCandidate[]) => {
      setSelectedIndices((prev) => {
        if (prev.size === candidates.length) {
          return new Set();
        }
        return new Set(candidates.map((_, i) => i));
      });
    },
    []
  );

  const renderContent = () => {
    switch (extractionState.status) {
      case "idle":
        return (
          <RangeSelectionContent
            rangeOption={rangeOption}
            setRangeOption={setRangeOption}
            messageCount={messageCount}
          />
        );
      case "extracting":
        return <ExtractingContent />;
      case "preview":
        return (
          <PreviewContent
            candidates={extractionState.candidates}
            selectedIndices={selectedIndices}
            onToggle={toggleIndex}
            onToggleAll={() => toggleAll(extractionState.candidates)}
          />
        );
      case "saving":
        return <SavingContent />;
      case "success":
        return <SuccessContent result={extractionState.result} />;
      case "error":
        return <ErrorContent message={extractionState.message} />;
    }
  };

  const renderFooter = () => {
    switch (extractionState.status) {
      case "idle":
        return (
          <>
            <Button variant="ghost" onClick={handleClose}>
              キャンセル
            </Button>
            <Button onClick={handleExtract} disabled={messageCount === 0}>
              抽出する
            </Button>
          </>
        );
      case "extracting":
      case "saving":
        return null;
      case "preview": {
        const count = selectedIndices.size;
        return (
          <>
            <Button variant="ghost" onClick={handleClose}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={count === 0}>
              選択した項目を保存（{count}件）
            </Button>
          </>
        );
      }
      case "success":
      case "error":
        return (
          <Button onClick={handleClose}>
            閉じる
          </Button>
        );
    }
  };

  const dialogTitle = () => {
    switch (extractionState.status) {
      case "preview":
        return "抽出結果の確認";
      case "success":
        return "保存完了";
      default:
        return "知識を抽出";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={disabled || messageCount === 0}
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          知識を抽出
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{dialogTitle()}</DialogTitle>
          <DialogDescription>
            {extractionState.status === "idle" &&
              "この会話からチームに共有すべきナレッジを抽出します。"}
            {extractionState.status === "preview" &&
              "保存する項目を選択してください。"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">{renderContent()}</div>

        <DialogFooter className="gap-2 sm:gap-0">
          {renderFooter()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// サブコンポーネント
// ============================================

function RangeSelectionContent({
  rangeOption,
  setRangeOption,
  messageCount,
}: {
  rangeOption: RangeOption;
  setRangeOption: (value: RangeOption) => void;
  messageCount: number;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">抽出範囲</Label>
        <p className="text-xs text-muted-foreground mt-1">
          現在の会話: {messageCount}件のメッセージ
        </p>
      </div>

      <RadioGroup
        value={rangeOption}
        onValueChange={(value) => setRangeOption(value as RangeOption)}
        className="space-y-3"
      >
        <div className="flex items-center space-x-3">
          <RadioGroupItem value="all" id="all" />
          <Label htmlFor="all" className="cursor-pointer">
            すべての会話
            <span className="text-xs text-muted-foreground ml-2">
              （{messageCount}件）
            </span>
          </Label>
        </div>
        <div className="flex items-center space-x-3">
          <RadioGroupItem value="recent" id="recent" />
          <Label htmlFor="recent" className="cursor-pointer">
            直近20件のやり取り
            <span className="text-xs text-muted-foreground ml-2">
              （最新のメッセージから）
            </span>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}

function ExtractingContent() {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-4 text-sm text-muted-foreground">
        AIが会話を分析しています...
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        しばらくお待ちください
      </p>
    </div>
  );
}

function SavingContent() {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-4 text-sm text-muted-foreground">
        選択した項目を保存しています...
      </p>
    </div>
  );
}

function PreviewContent({
  candidates,
  selectedIndices,
  onToggle,
  onToggleAll,
}: {
  candidates: KnowledgeCandidate[];
  selectedIndices: Set<number>;
  onToggle: (index: number) => void;
  onToggleAll: () => void;
}) {
  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">
          抽出できるナレッジが見つかりませんでした
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          会話に社内固有の情報が含まれていない可能性があります
        </p>
      </div>
    );
  }

  const allSelected = selectedIndices.size === candidates.length;

  return (
    <div className="space-y-3">
      {/* すべて選択 / 解除 */}
      <div className="flex items-center gap-2 pb-2 border-b">
        <Checkbox
          id="select-all"
          checked={allSelected}
          onCheckedChange={onToggleAll}
        />
        <Label htmlFor="select-all" className="text-sm cursor-pointer">
          すべて選択（{candidates.length}件）
        </Label>
      </div>

      {/* 候補一覧 */}
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {candidates.map((candidate, index) => {
          const colorClass =
            categoryColors[candidate.category] ?? "bg-gray-100 text-gray-800";
          const isSelected = selectedIndices.has(index);

          return (
            <label
              key={index}
              className={`flex gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                isSelected
                  ? "border-primary/50 bg-primary/5"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggle(index)}
                className="mt-0.5"
              />
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={colorClass}>
                    {candidate.category}
                  </Badge>
                  {candidate.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs text-muted-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <p className="text-sm leading-relaxed line-clamp-3">
                  {candidate.content}
                </p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function SuccessContent({ result }: { result: SaveKnowledgeResponse }) {
  const { saved, duplicates } = result;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle className="h-5 w-5" />
        <span className="text-sm font-medium">
          {saved.length}件のナレッジを保存しました
        </span>
      </div>

      {saved.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {saved.map((item) => {
            const colorClass =
              categoryColors[item.category] ?? "bg-gray-100 text-gray-800";
            return (
              <div key={item.id} className="rounded-lg border p-3 space-y-1.5">
                <Badge variant="secondary" className={colorClass}>
                  {item.category}
                </Badge>
                <p className="text-sm line-clamp-2">{item.content}</p>
              </div>
            );
          })}
        </div>
      )}

      {duplicates.length > 0 && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5" />
          {duplicates.length}件は既存の知識と重複（スキップ）
        </div>
      )}
    </div>
  );
}

function ErrorContent({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6">
      <AlertCircle className="h-8 w-8 text-destructive" />
      <p className="mt-4 text-sm text-destructive font-medium">
        処理に失敗しました
      </p>
      <p className="text-xs text-muted-foreground mt-1">{message}</p>
    </div>
  );
}

export default KnowledgeExtractionDialog;
