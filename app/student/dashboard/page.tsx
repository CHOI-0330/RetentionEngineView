"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../../src/components/SessionProvider";
import { Card, CardContent } from "../../../src/components/ui/card";
import { Badge } from "../../../src/components/ui/badge";
import { Button } from "../../../src/components/ui/button";
import { Loader2 } from "lucide-react";
import { apiFetch } from "../../../src/lib/apiClient";
import { Input } from "../../../src/components/ui/input";
import { Label } from "../../../src/components/ui/label";

interface ConversationListItem {
  conv_id: string;
  title: string;
  created_at: string;
}

interface ConversationRow {
  conv_id: string;
  title: string;
  created_at: string;
}

const StudentDashboardPage = () => {
  const { session, isLoading: isSessionLoading } = useSession();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const userId = session?.userId;
  const router = useRouter();

  useEffect(() => {
    if (!userId) {
      return;
    }
    let isMounted = true;
    const load = async () => {
      setIsFetching(true);
      setError(null);
      try {
        const rows = await apiFetch<ConversationRow[]>(
          `/conversations/newHire?userId=${encodeURIComponent(userId)}`,
          undefined,
          session?.accessToken
        );
        if (isMounted) {
          const mapped = (rows ?? []).map((row) => ({
            conv_id: row.conv_id,
            title: row.title,
            created_at: row.created_at,
          }));
          setConversations(mapped);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "会話の取得に失敗しました。");
        }
      } finally {
        if (isMounted) {
          setIsFetching(false);
        }
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [session?.accessToken, userId]);

  const heading = useMemo(() => {
    if (!session?.displayName) {
      return "会話一覧";
    }
    return `${session.displayName} さんの会話一覧`;
  }, [session?.displayName]);

  if (isSessionLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">セッションを確認しています...</span>
      </div>
    );
  }

  if (!userId) {
    return <div className="text-sm text-muted-foreground">ログイン情報が確認できません。再度サインインしてください。</div>;
  }

  const refetchConversations = async () => {
    if (!userId) return;
    setIsFetching(true);
    try {
      const rows = await apiFetch<ConversationRow[]>(
        `/conversations/newHire?userId=${encodeURIComponent(userId)}`,
        undefined,
        session?.accessToken
      );
      setConversations(
        (rows ?? []).map((row) => ({
          conv_id: row.conv_id,
          title: row.title,
          created_at: row.created_at,
        }))
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "会話の取得に失敗しました。");
    } finally {
      setIsFetching(false);
    }
  };

  const handleCreateConversation = async (titleInput?: string) => {
    if (!userId) {
      setError("ログイン情報が確認できません。再度サインインしてください。");
      return;
    }
    const title = `${titleInput ?? newTitle ?? ""}`.trim() || "新しい会話";
    setIsCreating(true);
    setError(null);
    try {
      await apiFetch<{ conv_id: string }>(
        "/conversations/newHire",
        {
          method: "POST",
          body: JSON.stringify({
            userId,
            title,
            role: session?.role,
            displayName: session?.displayName ?? userId,
            email: (session as any)?.email ?? "",
          }),
        },
        session?.accessToken
      );
      setNewTitle("");
      await refetchConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "会話の作成に失敗しました。");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">New Hire Dashboard</p>
        <h1 className="text-2xl font-semibold">{heading}</h1>
        <p className="text-sm text-muted-foreground">ご自身の会話履歴を一覧で確認できます。</p>
      </header>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="rounded-md border p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1 space-y-2">
            <Label className="text-sm font-medium">新しい会話タイトル</Label>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="例: オンボーディング相談"
              autoComplete="off"
            />
          </div>
          <Button
            className="sm:w-40"
            disabled={isCreating}
            onClick={() => {
              void handleCreateConversation();
            }}
          >
            {isCreating ? "作成中..." : "会話を作成"}
          </Button>
        </div>
      </div>

      {isFetching ? (
        <div className="flex h-48 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          読み込み中です...
        </div>
      ) : conversations.length === 0 ? (
        <div className="rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground">まだ会話がありません。</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {conversations.map((conversation) => (
            <Card key={conversation.conv_id}>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold">{conversation.title}</h2>
                  <Badge variant="secondary">ACTIVE</Badge>
                </div>
                <dl className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">作成日</dt>
                    <dd className="font-medium">
                      {new Date(conversation.created_at).toLocaleString(undefined, {
                        hour12: false,
                      })}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">会話ID</dt>
                    <dd className="font-mono text-xs">{conversation.conv_id}</dd>
                  </div>
                </dl>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => router.push(`/student?convId=${encodeURIComponent(conversation.conv_id)}`)}
                >
                  会話を開く
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
};

export default StudentDashboardPage;
