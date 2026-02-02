import { NextResponse, type NextRequest } from "next/server";

import { createAdminSupabaseClient } from "../../../../src/lib/supabaseClient";
import type { User } from "../../../../src/domain/core";

type MentorAiChatAction =
  | "listConversations"
  | "createConversation"
  | "deleteConversation"
  | "listMessages"
  | "createUserMessage"
  | "beginAssistantMessage"
  | "finalizeAssistantMessage";

// DTOs for backend REST responses
type ConversationDto = {
  conv_id: string;
  title: string;
  created_at: string;
  type?: string;
};

type MessageDto = {
  msg_id: string;
  conv_id: string;
  role: string;
  content: string;
  created_at: string;
};

class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const MAX_MESSAGE_LENGTH = 4000;
const BACKEND_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

const getAdminClient = createAdminSupabaseClient;

const resolveAccessToken = (request: NextRequest): string | null => {
  const headerToken = request.headers.get("authorization");
  const accessTokenFromHeader = headerToken?.toLowerCase().startsWith("bearer ")
    ? headerToken.slice(7).trim()
    : null;
  const cookieAccessToken =
    request.cookies.get("auth_access_token")?.value ?? null;
  const supabaseCookie = request.cookies
    .getAll()
    .find((cookie) => cookie.name.includes("-auth-token"));
  let supabaseAccessToken: string | null = null;
  if (supabaseCookie) {
    try {
      const parsed = JSON.parse(supabaseCookie.value);
      supabaseAccessToken =
        typeof parsed?.access_token === "string" ? parsed.access_token : null;
    } catch {
      supabaseAccessToken = null;
    }
  }
  return accessTokenFromHeader ?? cookieAccessToken ?? supabaseAccessToken;
};

const requireAuth = async (request: NextRequest) => {
  const accessToken = resolveAccessToken(request);
  if (!accessToken) {
    throw new HttpError(401, "Unauthorized");
  }
  try {
    const adminClient = getAdminClient();
    const { data, error } = await adminClient.auth.getUser(accessToken);
    if (error || !data.user) {
      throw error ?? new Error("Unauthorized");
    }
    const userId = data.user.id;
    const { data: profile, error: profileError } = await adminClient
      .from("user")
      .select("role, display_name")
      .eq("user_id", userId)
      .single();
    if (profileError || !profile) {
      throw profileError ?? new Error("User profile not found.");
    }
    const role = (profile as { role: User["role"] }).role;
    if (role !== "MENTOR" && role !== "ADMIN") {
      throw new HttpError(403, "Mentor role required.");
    }
    return {
      accessToken,
      user: {
        userId,
        role,
        displayName: (profile as { display_name?: string }).display_name ?? "",
      },
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    const message = error instanceof Error ? error.message : "Unauthorized";
    throw new HttpError(401, message);
  }
};

const logRequest = (label: string, payload: unknown) => {
  console.log(`[mentor-ai-chat][${label}]`, payload);
};

const callBackend = async <T>(
  path: string,
  init?: RequestInit,
  accessToken?: string,
): Promise<T> => {
  const response = await fetch(
    `${BACKEND_BASE_URL}/${path.replace(/^\//, "")}`,
    {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(init?.headers ?? {}),
      },
    },
  );
  const raw = await response.text();
  if (!response.ok) {
    throw new HttpError(response.status, raw || "Backend request failed.");
  }
  if (!raw) {
    return {} as T;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new HttpError(response.status, raw || "Backend response parse failed.");
  }
};

// ============================================
// Backend API呼び出し
// ============================================

const getMentorAiConversations = (userId: string, accessToken: string) =>
  callBackend<ConversationDto[] | { data?: ConversationDto[] }>(
    `/conversations/mentor/ai?mentorId=${encodeURIComponent(userId)}`,
    undefined,
    accessToken,
  );

const createMentorAiConversation = (
  input: { userId: string; title: string },
  accessToken: string,
) =>
  callBackend<ConversationDto | { data?: ConversationDto }>(
    "/conversations/mentor/ai",
    {
      method: "POST",
      body: JSON.stringify({ mentorId: input.userId, title: input.title }),
    },
    accessToken,
  );

const deleteMentorAiConversation = (
  input: { userId: string; convId: string },
  accessToken: string,
) =>
  callBackend<void>(
    `/conversations/mentor/ai?mentorId=${encodeURIComponent(input.userId)}&convId=${encodeURIComponent(input.convId)}`,
    { method: "DELETE" },
    accessToken,
  );

const getMessages = (convId: string, accessToken: string) =>
  callBackend<{ data: MessageDto[] } | MessageDto[]>(
    `/messages?convId=${encodeURIComponent(convId)}`,
    undefined,
    accessToken,
  );

const getMessagesPaginated = (
  convId: string,
  options: { cursor?: string; limit?: number },
  accessToken: string,
) => {
  const params = new URLSearchParams();
  params.set("convId", convId);
  if (options.cursor) params.set("cursor", options.cursor);
  if (options.limit) params.set("limit", String(options.limit));
  return callBackend<{
    items: MessageDto[];
    nextCursor?: string;
    hasMore: boolean;
  }>(`/messages/paginated?${params.toString()}`, undefined, accessToken);
};

const createMessage = (
  input: { convId: string; role: string; content: string },
  accessToken: string,
) =>
  callBackend<{ data: MessageDto } | MessageDto>(
    "/messages",
    { method: "POST", body: JSON.stringify(input) },
    accessToken,
  );

// ============================================
// マッピング
// ============================================

const mapConversation = (row: ConversationDto) => ({
  convId: row.conv_id,
  ownerId: "",
  title: row.title,
  state: "ACTIVE" as const,
  type: "mentor_ai_chat" as const,
  createdAt: row.created_at,
  lastActiveAt: row.created_at,
  archivedAt: undefined,
});

const mapMessage = (row: MessageDto) => ({
  msgId: row.msg_id,
  convId: row.conv_id,
  role: row.role as "MENTOR" | "ASSISTANT",
  content: row.content,
  status: (row.role === "ASSISTANT" ? "DONE" : null) as "DONE" | null,
  createdAt: row.created_at,
});

// ============================================
// Route Handler
// ============================================

export async function POST(request: NextRequest) {
  const { action, payload } = (await request.json()) as {
    action: MentorAiChatAction;
    payload: unknown;
  };

  try {
    const { accessToken, user } = await requireAuth(request);
    logRequest("POST", { action, userId: user.userId });

    switch (action) {
      case "listConversations": {
        const raw = await getMentorAiConversations(user.userId, accessToken);
        const rows: ConversationDto[] = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as { data?: ConversationDto[] })?.data)
            ? (raw as { data: ConversationDto[] }).data
            : [];
        const conversations = rows.map((row) => {
          const mapped = mapConversation(row);
          mapped.ownerId = user.userId;
          return mapped;
        });
        return NextResponse.json({ data: conversations });
      }

      case "createConversation": {
        const input = (payload ?? {}) as { title?: string };
        const title = (input.title ?? "").trim() || "新しい会話";
        const raw = await createMentorAiConversation(
          { userId: user.userId, title },
          accessToken,
        );
        const row = ((raw as { data?: ConversationDto })?.data ?? raw) as ConversationDto;
        const mapped = mapConversation(row);
        mapped.ownerId = user.userId;
        return NextResponse.json({ data: mapped });
      }

      case "deleteConversation": {
        const input = (payload ?? {}) as { convId?: string };
        if (!input.convId || typeof input.convId !== "string") {
          throw new HttpError(400, "convId is required.");
        }
        await deleteMentorAiConversation(
          { userId: user.userId, convId: input.convId },
          accessToken,
        );
        return NextResponse.json({ ok: true });
      }

      case "listMessages": {
        const input = (payload ?? {}) as {
          convId?: string;
          cursor?: string;
          limit?: number;
        };
        if (!input.convId || typeof input.convId !== "string") {
          throw new HttpError(400, "convId is required.");
        }
        const pageSize = Math.min(Math.max(input.limit ?? 30, 1), 100);

        if (input.cursor) {
          // ページネーションモード
          const result = await getMessagesPaginated(
            input.convId,
            { cursor: input.cursor, limit: pageSize },
            accessToken,
          );
          const items = result.items.map(mapMessage);
          return NextResponse.json({
            data: { items, nextCursor: result.nextCursor },
          });
        }

        // 初回ロード
        const raw = await getMessages(input.convId, accessToken);
        const messageRows: MessageDto[] = Array.isArray(raw)
          ? raw
          : (raw as { data: MessageDto[] })?.data ?? [];
        const items = messageRows
          .map(mapMessage)
          .sort(
            (a, b) =>
              a.createdAt.localeCompare(b.createdAt) ||
              a.msgId.localeCompare(b.msgId),
          );
        return NextResponse.json({ data: { items } });
      }

      case "createUserMessage": {
        const input = (payload ?? {}) as {
          convId?: string;
          authorId?: string;
          content?: string;
        };
        if (!input.convId || typeof input.convId !== "string") {
          throw new HttpError(400, "convId is required.");
        }
        const content = typeof input.content === "string" ? input.content : "";
        const trimmed = content.trim();
        if (!trimmed) {
          throw new HttpError(400, "Message content must not be empty.");
        }
        if (trimmed.length > MAX_MESSAGE_LENGTH) {
          throw new HttpError(400, "Message content exceeds the allowed length.");
        }

        const raw = await createMessage(
          { convId: input.convId, role: "MENTOR", content: trimmed },
          accessToken,
        );
        const row = ((raw as { data?: MessageDto })?.data ?? raw) as MessageDto;
        return NextResponse.json({ data: mapMessage(row) });
      }

      case "beginAssistantMessage": {
        // クライアント側で生成する（サーバー不要）
        return NextResponse.json(
          { error: "beginAssistantMessage is handled client-side." },
          { status: 501 },
        );
      }

      case "finalizeAssistantMessage": {
        const input = (payload ?? {}) as {
          convId?: string;
          content?: string;
          sources?: unknown;
        };
        if (!input.convId || typeof input.convId !== "string") {
          throw new HttpError(400, "convId is required.");
        }
        const content = typeof input.content === "string" ? input.content : "";
        const trimmed = content.trim();
        if (!trimmed) {
          throw new HttpError(400, "Message content must not be empty.");
        }

        const raw = await createMessage(
          { convId: input.convId, role: "ASSISTANT", content: trimmed },
          accessToken,
        );
        const row = ((raw as { data?: MessageDto })?.data ?? raw) as MessageDto;
        return NextResponse.json({ data: mapMessage(row) });
      }

      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
  } catch (error) {
    console.error("[mentor-ai-chat][POST][error]", error);
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
