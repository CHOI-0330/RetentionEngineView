/**
 * ConversationSidebar コンポーネント
 *
 * メンターAIチャットの会話一覧サイドバー
 */

import { memo, useState } from "react";
import { Loader2, Plus, Trash2, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import type { MentorAiConversationViewModel } from "../../../interfaceAdapters/services/MentorAiChatService";

interface ConversationSidebarProps {
  conversations: MentorAiConversationViewModel[];
  onSelect: (convId: string) => void;
  onCreate: (title: string) => Promise<void>;
  onDelete: (convId: string) => void;
  isLoading?: boolean;
  /** アクティブ会話の未保存トリガー数 */
  unsavedTriggerCount?: number;
  /** ✨バッジクリック時（一括レビューモーダル表示） */
  onTriggerBadgeClick?: () => void;
}

export const ConversationSidebar = memo(function ConversationSidebar({
  conversations,
  onSelect,
  onCreate,
  onDelete,
  isLoading = false,
  unsavedTriggerCount = 0,
  onTriggerBadgeClick,
}: ConversationSidebarProps) {
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setIsCreating(true);
    try {
      await onCreate(newTitle.trim());
      setNewTitle("");
      setCreateDialogOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = (convId: string) => {
    setDeletingId(convId);
    onDelete(convId);
    // deletingId will be reset on next render when conversations update
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-muted/30">
      {/* サイドバーヘッダー */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">会話一覧</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Plus className="h-4 w-4" />
              <span className="sr-only">新規会話</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新しい会話を作成</DialogTitle>
              <DialogDescription>
                テーマを決めて、AIとの対話を始めましょう。
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4 mt-4"
              onSubmit={(e) => {
                e.preventDefault();
                void handleCreate();
              }}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  会話のタイトル
                </label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例：新入社員の指導方法"
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  キャンセル
                </Button>
                <Button type="submit" disabled={isCreating || !newTitle.trim()}>
                  {isCreating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  作成する
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 会話リスト */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && conversations.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              会話がありません
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 text-xs"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="mr-1 h-3 w-3" />
              最初の会話を作成
            </Button>
          </div>
        ) : (
          <ul className="space-y-0.5 p-2">
            {conversations.map((conv) => (
              <li key={conv.convId}>
                <button
                  type="button"
                  onClick={() => onSelect(conv.convId)}
                  className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    conv.isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-muted/60"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  <span className="flex-1 truncate">{conv.title}</span>
                  {/* 未保存トリガー✨バッジ（アクティブ会話のみ） */}
                  {conv.isActive && unsavedTriggerCount > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTriggerBadgeClick?.();
                      }}
                      className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-amber-600 transition-colors hover:bg-amber-200"
                      aria-label={`${unsavedTriggerCount}件の暗黙知を確認`}
                    >
                      <Sparkles className="h-3 w-3" />
                      <span className="text-[10px] font-bold">{unsavedTriggerCount}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(conv.convId);
                    }}
                    className="hidden shrink-0 rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:block"
                    aria-label={`${conv.title}を削除`}
                  >
                    {deletingId === conv.convId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
});
