"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Eye,
  Tag,
  User,
  Calendar,
  MessageSquare,
  PenLine,
  Loader2,
  ArrowLeft,
  MapPin,
  Lightbulb,
  AlertTriangle,
  Star,
  FileText,
  ThumbsUp,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import type { QCListItem } from "../../interfaceAdapters/gateways/api/QuestionCardGateway";
import {
  AnswerCardGateway,
  type ACListItem,
} from "../../interfaceAdapters/gateways/api/AnswerCardGateway";
import { AnswerCardChatPanel } from "../../components/AnswerCard/AnswerCardChatPanel";

// ============================================
// 型定義
// ============================================

interface QuestionCardDetailDialogProps {
  item: QCListItem | null;
  onClose: () => void;
  accessToken?: string;
  onRefresh?: () => void;
  userRole?: string;
}

// ============================================
// 定数
// ============================================

const statusConfig = {
  open: { label: "未回答", color: "bg-purple-100 text-purple-800" },
  resolved: { label: "回答済み", color: "bg-green-100 text-green-800" },
} as const;

// KC コンテンツパーサー
interface ParsedContent {
  situation: string;
  knowhow: string;
  precaution: string;
  importance: string;
  example: string;
}

function parseKCContent(content: string): ParsedContent {
  const result: ParsedContent = { situation: "", knowhow: "", precaution: "", importance: "", example: "" };
  const sections = content.split(/^##\s+/m).filter(Boolean);
  for (const section of sections) {
    const lines = section.split("\n");
    const heading = (lines[0] ?? "").trim().toLowerCase();
    const body = lines.slice(1).join("\n").trim();
    if (heading.includes("状況") || heading.includes("situation")) {
      result.situation = body;
    } else if (heading.includes("ノウハウ") || heading.includes("knowhow") || heading.includes("知見")) {
      result.knowhow = body;
    } else if (heading.includes("注意点") || heading.includes("precaution") || heading.includes("注意")) {
      result.precaution = body;
    } else if (heading.includes("重要性") || heading.includes("importance")) {
      result.importance = body;
    } else if (heading.includes("具体例") || heading.includes("example")) {
      result.example = body;
    }
  }
  return result;
}

const SECTION_CONFIG = [
  { key: "situation" as const, label: "状況", icon: MapPin, color: "text-blue-600", bg: "bg-blue-50" },
  { key: "knowhow" as const, label: "ノウハウ", icon: Lightbulb, color: "text-amber-600", bg: "bg-amber-50" },
  { key: "precaution" as const, label: "注意点", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
  { key: "importance" as const, label: "重要性", icon: Star, color: "text-purple-600", bg: "bg-purple-50" },
  { key: "example" as const, label: "具体例", icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50" },
] as const;

// ============================================
// コンポーネント
// ============================================

export function QuestionCardDetailDialog({
  item,
  onClose,
  accessToken,
  onRefresh,
  userRole,
}: QuestionCardDetailDialogProps) {
  const [showAnswerPanel, setShowAnswerPanel] = useState(false);
  const [answers, setAnswers] = useState<ACListItem[]>([]);
  const [isLoadingAnswers, setIsLoadingAnswers] = useState(false);

  // 回答一覧を取得
  useEffect(() => {
    if (!item) {
      setAnswers([]);
      return;
    }

    const fetchAnswers = async () => {
      setIsLoadingAnswers(true);
      try {
        const gateway = new AnswerCardGateway({ accessToken });
        const response = await gateway.getAnswersByQuestionCard(item.id);
        setAnswers(response.items);
      } catch {
        // エラーは静かに処理
        setAnswers([]);
      } finally {
        setIsLoadingAnswers(false);
      }
    };

    fetchAnswers();
  }, [item?.id, accessToken]);

  if (!item) return null;

  const statusCfg = statusConfig[item.status] ?? statusConfig.open;
  const date = new Date(item.createdAt);
  const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;

  const handleAnswerPanelClose = () => {
    setShowAnswerPanel(false);
    // 回答作成後に一覧を更新
    if (item) {
      const gateway = new AnswerCardGateway({ accessToken });
      gateway.getAnswersByQuestionCard(item.id).then((response) => {
        setAnswers(response.items);
      });
    }
    onRefresh?.();
  };

  return (
    <>
      {/* 通常の質問詳細ダイアログ */}
      <Dialog
        open={item !== null && !showAnswerPanel}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
          <QuestionDetailContent
            item={item}
            answers={answers}
            isLoadingAnswers={isLoadingAnswers}
            userRole={userRole}
            onCreateAnswer={() => setShowAnswerPanel(true)}
          />
        </DialogContent>
      </Dialog>

      {/* 回答作成: フルスクリーン2カラムレイアウト */}
      {showAnswerPanel && userRole !== "NEW_HIRE" && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
          <div className="flex h-full flex-col md:flex-row">
            {/* 左カラム: 質問詳細 */}
            <div className="hidden md:flex md:w-1/2 flex-col border-r">
              <div className="flex items-center gap-3 border-b px-6 py-3 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAnswerPanelClose}
                  className="gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  戻る
                </Button>
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="secondary" className={statusCfg.color}>
                    {statusCfg.label}
                  </Badge>
                  <span className="text-sm font-medium truncate">
                    {item.title}
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <QuestionDetailContent
                  item={item}
                  answers={answers}
                  isLoadingAnswers={isLoadingAnswers}
                />
              </div>
            </div>
            {/* 右カラム: 回答作成パネル */}
            <div className="flex-1 md:w-1/2 h-full">
              <AnswerCardChatPanel
                onClose={handleAnswerPanelClose}
                questionCardId={item.id}
                questionTitle={item.title}
                questionBody={item.questionBody}
                questionBackground={item.background}
                accessToken={accessToken}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================
// サブコンポーネント
// ============================================

function QuestionDetailContent({
  item,
  answers,
  isLoadingAnswers,
  userRole,
  onCreateAnswer,
}: {
  item: QCListItem;
  answers: ACListItem[];
  isLoadingAnswers: boolean;
  userRole?: string;
  onCreateAnswer?: () => void;
}) {
  return (
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

      {/* 回答セクション */}
      <div className="space-y-3 pt-2 border-t">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <PenLine className="h-3.5 w-3.5" />
            回答 ({answers.length}件)
          </h4>
          {onCreateAnswer && userRole !== "NEW_HIRE" && (
            <Button
              size="sm"
              onClick={onCreateAnswer}
              className="bg-green-600 hover:bg-green-700"
            >
              <PenLine className="h-3.5 w-3.5 mr-1.5" />
              回答を作成
            </Button>
          )}
        </div>

        {/* 回答一覧 */}
        {isLoadingAnswers ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : answers.length > 0 ? (
          <div className="space-y-3">
            {answers.map((answer) => (
              <AnswerKCCard key={answer.id} answer={answer} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            まだ回答がありません
          </p>
        )}
      </div>

      {/* フッター */}
      <div className="flex items-center pt-2 border-t text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" />
          {item.viewCount}回閲覧
        </span>
      </div>
    </div>
  );
}

/** KC形式の回答表示カード */
function AnswerKCCard({ answer }: { answer: ACListItem }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(answer.createdAt);
  const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;

  const parsed = useMemo(() => parseKCContent(answer.content), [answer.content]);
  const hasSections = parsed.situation || parsed.knowhow || parsed.precaution;

  return (
    <div className="rounded-lg border border-green-200 bg-green-50/30 p-3 space-y-2">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h5 className="text-sm font-semibold">{answer.title}</h5>
          {answer.confidence !== null && (
            <span className="text-xs text-muted-foreground">
              {Math.round(answer.confidence * 100)}%
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{dateStr}</span>
      </div>

      {/* KC セクション表示 */}
      {hasSections ? (
        <div className={`space-y-2 ${!expanded ? "max-h-[120px] overflow-hidden relative" : ""}`}>
          {SECTION_CONFIG.map(({ key, label, icon: Icon, color, bg }) => {
            const value = parsed[key];
            if (!value) return null;
            return (
              <div key={key} className={`rounded-md ${bg} p-2`}>
                <div className={`flex items-center gap-1 text-xs font-medium ${color} mb-0.5`}>
                  <Icon className="h-3 w-3" />
                  {label}
                </div>
                <p className="text-xs leading-relaxed whitespace-pre-wrap">{value}</p>
              </div>
            );
          })}
          {!expanded && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-green-50/80 to-transparent" />
          )}
        </div>
      ) : (
        <p className={`text-sm leading-relaxed whitespace-pre-wrap ${!expanded ? "line-clamp-3" : ""}`}>
          {answer.content}
        </p>
      )}

      {/* タグ */}
      {answer.tags && answer.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {answer.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* フッター */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-green-600 hover:text-green-700"
        >
          {expanded ? "折りたたむ" : "もっと見る"}
        </button>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Eye className="h-3 w-3" />
            {answer.viewCount}
          </span>
          <span className="flex items-center gap-0.5">
            <ThumbsUp className="h-3 w-3" />
            {answer.usefulCount}
          </span>
        </div>
      </div>
    </div>
  );
}
