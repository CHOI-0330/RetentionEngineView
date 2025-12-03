"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../../src/components/SessionProvider";
import { Card, CardContent } from "../../../src/components/ui/card";
import { Badge } from "../../../src/components/ui/badge";
import { Button } from "../../../src/components/ui/button";
import {
  Loader2,
  MessageSquarePlus,
  MessageCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Input } from "../../../src/components/ui/input";
import { Label } from "../../../src/components/ui/label";
import { cn } from "../../../src/components/ui/utils";

interface ConversationListItem {
  conv_id: string;
  title: string;
  created_at: string;
}

const StudentDashboardPage = () => {
  const { session, isLoading: isSessionLoading, interactions } = useSession();
  const [conversations, setConversations] = useState<ConversationListItem[]>(
    []
  );
  const [isFetching, setIsFetching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [didTrySessionRefresh, setDidTrySessionRefresh] = useState(false);
  const userId = session?.userId;
  const router = useRouter();

  useEffect(() => {
    if (!session && !isSessionLoading && !didTrySessionRefresh) {
      setDidTrySessionRefresh(true);
      void interactions.refetchSession();
    }
  }, [didTrySessionRefresh, interactions, isSessionLoading, session]);

  const parseApiResponse = useCallback(async (response: Response) => {
    const raw = await response.text();
    let json: any = null;
    if (raw) {
      try {
        json = JSON.parse(raw);
      } catch {
        json = null;
      }
    }
    if (!response.ok) {
      throw new Error(json?.error ?? json?.message ?? raw ?? "Unexpected error");
    }
    return json;
  }, []);

  const fetchConversationList = useCallback(async (): Promise<ConversationListItem[]> => {
    if (!userId) {
      throw new Error("ログインしてください。");
    }
    const response = await fetch("/api/entitle/student-chat", {
      cache: "no-store",
      credentials: "include",
      headers: {
        ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      },
    });
    const payload = await parseApiResponse(response);
    const available = (payload?.data?.availableConversations ?? []) as {
      convId: string;
      title: string;
      lastActiveAt: string;
    }[];
    return available.map((conv) => ({
      conv_id: conv.convId,
      title: conv.title,
      created_at: conv.lastActiveAt,
    }));
  }, [parseApiResponse, session?.accessToken, userId]);

  const createConversationRequest = useCallback(
    async (title: string) => {
      const response = await fetch("/api/entitle/student-chat", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
        },
        body: JSON.stringify({
          action: "createConversation",
          payload: { title },
        }),
      });
      await parseApiResponse(response);
    },
    [parseApiResponse, session?.accessToken]
  );

  useEffect(() => {
    if (!userId) {
      return;
    }
    let isMounted = true;
    const load = async () => {
      setIsFetching(true);
      setError(null);
      try {
        const rows = await fetchConversationList();
        if (isMounted) {
          setConversations(rows);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "会話の取得に失敗しました。"
          );
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
  }, [fetchConversationList, userId]);

  const heading = useMemo(() => {
    if (!session?.displayName) {
      return "Welcome Back";
    }
    return `Welcome back, ${session.displayName}`;
  }, [session?.displayName]);

  if (isSessionLoading || (!session && !didTrySessionRefresh)) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <Loader2 className="relative h-8 w-8 animate-spin text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground animate-pulse">
            Loading session...
          </span>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg text-muted-foreground">
            ログイン情報が確認できません。
          </p>
          <Button onClick={() => window.location.reload()}>
            再度サインイン
          </Button>
        </div>
      </div>
    );
  }

  const refetchConversations = async () => {
    if (!userId) return;
    setIsFetching(true);
    try {
      const rows = await fetchConversationList();
      setConversations(rows);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "会話の取得に失敗しました。"
      );
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
      await createConversationRequest(title);
      setNewTitle("");
      await refetchConversations();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "会話の作成に失敗しました。"
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main className="min-h-screen pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
        <div className="container px-4 sm:px-6 relative z-10">
          <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary backdrop-blur-sm">
              <Sparkles className="mr-1 h-3 w-3" />
              New Hire Dashboard
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              {heading}
              <span className="block text-gradient mt-2">Ready to learn?</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              AIメンターとの会話を通じて、新しいスキルや知識を身につけましょう。過去の会話履歴を確認したり、新しいトピックについて相談できます。
            </p>
          </div>
        </div>

        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 -z-10 h-[500px] w-[500px] bg-primary/5 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 -z-10 h-[300px] w-[300px] bg-secondary/20 blur-[80px] rounded-full -translate-x-1/3 translate-y-1/4" />
      </section>

      <div className="container px-4 sm:px-6 space-y-12">
        {error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive animate-in fade-in zoom-in-95">
            {error}
          </div>
        ) : null}

        {/* Create New Section */}
        <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1 space-y-3">
              <Label className="text-base font-medium flex items-center gap-2">
                <MessageSquarePlus className="h-4 w-4 text-primary" />
                新しい会話を始める
              </Label>
              <div className="relative">
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例: オンボーディングの進め方について"
                  autoComplete="off"
                  className="h-12 text-base bg-background border-input focus:ring-2 transition-all pl-4"
                />
              </div>
            </div>
            <Button
              className="h-12 px-8 text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              disabled={isCreating}
              onClick={() => {
                void handleCreateConversation();
              }}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  作成中...
                </>
              ) : (
                <>
                  会話を作成 <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Conversations Grid */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">
              Recent Conversations
            </h2>
            <Badge
              variant="outline"
              className="px-3 py-1 bg-background/50 backdrop-blur-sm"
            >
              {conversations.length} conversations
            </Badge>
          </div>

          {isFetching ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-48 rounded-xl border bg-card/50 animate-pulse"
                />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/30 px-4 py-16 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <MessageCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">まだ会話がありません</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                新しいトピックについてAIメンターと会話を始めてみましょう。
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {conversations.map((conversation, index) => (
                <Card
                  key={conversation.conv_id}
                  className="group relative overflow-hidden border bg-card hover:shadow-md transition-all duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                        <MessageCircle className="h-5 w-5" />
                      </div>
                      <Badge
                        variant="secondary"
                        className="bg-secondary/50 backdrop-blur-sm text-xs font-normal"
                      >
                        ACTIVE
                      </Badge>
                    </div>

                    <h3 className="text-lg font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                      {conversation.title}
                    </h3>

                    <div className="mt-auto pt-4 flex items-center justify-between text-xs text-muted-foreground border-t border-border/30">
                      <span>
                        {new Date(conversation.created_at).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </span>
                      <span className="font-mono opacity-50">
                        ID: {conversation.conv_id.slice(0, 4)}...
                      </span>
                    </div>

                    <div className="absolute inset-0 pointer-events-none border-2 border-primary/0 group-hover:border-primary/10 rounded-xl transition-all duration-300" />

                    <Button
                      variant="ghost"
                      className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                      onClick={() =>
                        router.push(
                          `/student?convId=${encodeURIComponent(
                            conversation.conv_id
                          )}`
                        )
                      }
                    >
                      <span className="sr-only">Open conversation</span>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default StudentDashboardPage;
