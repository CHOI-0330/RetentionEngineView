import { NextResponse, type NextRequest } from "next/server";

import { mapFeedbackRow, mapMessageRow, type FeedbackRow, type MessageRow } from "../../../../src/interfaceAdapters/gateways/supabase/types";
import type { User } from "../../../../src/domain/core";
import { createAdminSupabaseClient } from "../../../../src/lib/supabaseClient";
type StudentChatAction =
  | "createUserMessage"
  | "beginAssistantMessage"
  | "finalizeAssistantMessage"
  | "cancelAssistantMessage"
  | "listConversationMessages"
  | "listFeedbacks"
  | "createFeedback"
  | "createConversation"
  | "deleteConversation";

// DTOs for backend REST responses
type ConversationDto = {
  conv_id: string;
  title: string;
  created_at: string;
};

type MessageDto = {
  msg_id: string;
  conv_id: string;
  role: string;
  content: string;
  created_at: string;
};

type FeedbackDto = {
  fb_id: string;
  target_msg_id: string;
  author_id: string;
  author_role: string;
  content: string;
  created_at: string;
  updated_at?: string | null;
};

class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const MAX_MESSAGE_LENGTH = 4000;
const BACKEND_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const getAdminClient = createAdminSupabaseClient;

const resolveAccessToken = (request: NextRequest): string | null => {
  const headerToken = request.headers.get("authorization");
  const accessTokenFromHeader = headerToken?.toLowerCase().startsWith("bearer ")
    ? headerToken.slice(7).trim()
    : null;
  const cookieAccessToken = request.cookies.get("auth_access_token")?.value ?? null;
  const supabaseCookie = request.cookies.getAll().find((cookie) => cookie.name.includes("-auth-token"));
  let supabaseAccessToken: string | null = null;
  if (supabaseCookie) {
    try {
      const parsed = JSON.parse(supabaseCookie.value);
      supabaseAccessToken = typeof parsed?.access_token === "string" ? parsed.access_token : null;
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
    return {
      accessToken,
      user: {
        userId,
        role: (profile as { role: User["role"] }).role,
        displayName: (profile as { display_name?: string }).display_name ?? "",
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    throw new HttpError(401, message);
  }
};

const logRequest = (label: string, payload: unknown) => {
  console.log(`[student-chat][${label}]`, payload);
};

const callBackend = async <T>(path: string, init?: RequestInit, accessToken?: string): Promise<T> => {
  if (!BACKEND_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  }
  const response = await fetch(`${BACKEND_BASE_URL}/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
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

const mapApiMessageRow = (row: MessageDto): MessageRow => ({
  msg_id: row.msg_id,
  conv_id: row.conv_id,
  role: row.role as MessageRow["role"],
  content: row.content,
  status: (row.role as MessageRow["role"]) === "ASSISTANT" ? "DONE" : null,
  created_at: row.created_at,
});

const mapApiFeedbackRow = (row: FeedbackDto): FeedbackRow => ({
  fb_id: row.fb_id,
  target_msg_id: row.target_msg_id,
  author_id: row.author_id,
  author_role: row.author_role as FeedbackRow["author_role"],
  content: row.content,
  visibility: null,
  created_at: row.created_at,
  updated_at: row.updated_at ?? null,
});

const mapApiConversationRow = (row: ConversationDto): {
  convId: string;
  ownerId: string;
  title: string;
  state: "ACTIVE";
  createdAt: string;
  lastActiveAt: string;
  archivedAt: undefined;
} => ({
  convId: row.conv_id,
  ownerId: "",
  title: row.title,
  state: "ACTIVE",
  createdAt: row.created_at,
  lastActiveAt: row.created_at,
  archivedAt: undefined,
});

// Backend calls aligned with NestJS controller method names for readability.
const getConversationListByNewHire = (userId: string, accessToken: string) =>
  callBackend<{ data?: ConversationDto[] } | ConversationDto[]>(
    `/conversations/newHire?userId=${encodeURIComponent(userId)}`,
    undefined,
    accessToken
  );

const createConversationForNewHire = (input: { userId: string; title: string; role: User["role"]; displayName: string }, accessToken: string) =>
  callBackend<{ data?: { conv_id: string; title: string; created_at: string } } | { conv_id: string; title: string; created_at: string }>(
    "/conversations/newHire",
    {
      method: "POST",
      body: JSON.stringify({
        userId: input.userId,
        title: input.title,
        role: input.role,
        displayName: input.displayName,
        email: "",
      }),
    },
    accessToken
  );

const deleteConversationForNewHire = (input: { userId: string; convId: string }, accessToken: string) =>
  callBackend<void>(
    `/conversations/newHire?userId=${encodeURIComponent(input.userId)}&convId=${encodeURIComponent(input.convId)}`,
    {
      method: "DELETE",
    },
    accessToken
  );

const getMessages = (convId: string, accessToken: string) =>
  callBackend<{ data: MessageDto[] }>(
    `/messages?convId=${encodeURIComponent(convId)}`,
    undefined,
    accessToken
  );

const createMessage = (input: { convId: string; role: string; content: string }, accessToken: string) =>
  callBackend<{ data: MessageDto }>(
    "/messages",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    accessToken
  );

const getFeedbackByMessage = (messageId: string, accessToken: string) =>
  callBackend<{ data: FeedbackDto[] }>(
    `/feedback?messageId=${encodeURIComponent(messageId)}`,
    undefined,
    accessToken
  );

const createFeedback = (input: { messageId: string; authorId: string; content: string }, accessToken: string) =>
  callBackend<{
    data: FeedbackDto;
  }>(
    "/feedback",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    accessToken
  );

export async function POST(request: NextRequest) {
  const { action, payload } = (await request.json()) as {
    action: StudentChatAction;
    payload: unknown;
  };

  try {
    const { accessToken, user } = await requireAuth(request);
    logRequest("POST", { action, userId: user.userId });
    switch (action) {
      case "createUserMessage": {
        const input = (payload ?? {}) as { convId?: string; content?: string };
        if (!input.convId || typeof input.convId !== "string") {
          throw new HttpError(400, "convId is required.");
        }
        const content = typeof input.content === "string" ? input.content : "";
        const trimmedContent = content.trim();
        if (!trimmedContent) {
          throw new HttpError(400, "Message content must not be empty.");
        }
        if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
          throw new HttpError(400, "Message content exceeds the allowed length.");
        }

        const backendResult = await createMessage(
          {
            convId: input.convId,
            role: "NEW_HIRE",
            content: trimmedContent,
          },
          accessToken
        );
        const mapped = mapMessageRow(mapApiMessageRow(backendResult.data));
        return NextResponse.json({ data: mapped });
      }
      case "beginAssistantMessage": {
        return NextResponse.json({ error: "Not implemented without Supabase." }, { status: 501 });
      }
      case "finalizeAssistantMessage": {
        const input = (payload ?? {}) as { convId?: string; content?: string };
        if (!input.convId || typeof input.convId !== "string") {
          throw new HttpError(400, "convId is required.");
        }
        const content = typeof input.content === "string" ? input.content : "";
        const trimmedContent = content.trim();
        if (!trimmedContent) {
          throw new HttpError(400, "Message content must not be empty.");
        }
        // AI応答は長さ制限なし（Web検索結果など長い応答を許可）

        const backendResult = await createMessage(
          {
            convId: input.convId,
            role: "ASSISTANT",
            content: trimmedContent,
          },
          accessToken
        );
        const mapped = mapMessageRow(mapApiMessageRow(backendResult.data));
        return NextResponse.json({ data: mapped });
      }
      case "cancelAssistantMessage": {
        return NextResponse.json({ error: "Not implemented without Supabase." }, { status: 501 });
      }
      case "listConversationMessages": {
        const input = (payload ?? {}) as { convId?: string; cursor?: string; limit?: number };
        if (!input.convId || typeof input.convId !== "string") {
          throw new HttpError(400, "convId is required.");
        }
        const pageSize = Math.min(Math.max(input.limit ?? 50, 1), 100);
        const backendMessages = await getMessages(input.convId, accessToken);
        const rows = (backendMessages.data ?? []).map(mapApiMessageRow).sort((a, b) => a.created_at.localeCompare(b.created_at) || a.msg_id.localeCompare(b.msg_id));

        let filtered = rows;
        if (input.cursor) {
          const cursorIndex = rows.findIndex((row) => row.msg_id === input.cursor);
          if (cursorIndex === -1) {
            throw new HttpError(404, "Cursor message not found.");
          }
          filtered = rows.slice(0, cursorIndex);
        }

        const paged = filtered.slice(-pageSize);
        const nextCursor = filtered.length > paged.length ? paged[0]?.msg_id : undefined;

        const items = paged.map(mapMessageRow);
        return NextResponse.json({ data: { items, nextCursor } });
      }
      case "listFeedbacks": {
        const input = (payload ?? {}) as { msgId?: string; cursor?: string; limit?: number };
        if (!input.msgId || typeof input.msgId !== "string") {
          throw new HttpError(400, "msgId is required.");
        }
        const pageSize = Math.min(Math.max(input.limit ?? 50, 1), 100);
        const backendFeedbacks = await getFeedbackByMessage(input.msgId, accessToken);
        const sorted = (backendFeedbacks.data ?? [])
          .map(mapApiFeedbackRow)
          .sort((a, b) => {
            if (a.created_at === b.created_at) {
              return b.fb_id.localeCompare(a.fb_id);
            }
            return b.created_at.localeCompare(a.created_at);
          });

        let filtered = sorted;
        if (input.cursor) {
          const cursorIndex = sorted.findIndex((row) => row.fb_id === input.cursor);
          if (cursorIndex === -1) {
            throw new HttpError(404, "Cursor feedback not found.");
          }
          filtered = sorted.slice(cursorIndex + 1);
        }

        const paged = filtered.slice(0, pageSize);
        const nextCursor = paged.length === pageSize ? paged[paged.length - 1]?.fb_id : undefined;

        const items = paged.map(mapFeedbackRow);
        const authorIds = Array.from(new Set(items.map((feedback) => feedback.authorId)));
        return NextResponse.json({
          data: {
            items,
            nextCursor,
            authorNames: Object.fromEntries(authorIds.map((id) => [id, id] as const)),
          },
        });
      }
      case "createFeedback": {
        const input = (payload ?? {}) as { targetMsgId?: string; content?: string };
        if (!input.targetMsgId || typeof input.targetMsgId !== "string") {
          throw new HttpError(400, "targetMsgId is required.");
        }
        const content = typeof input.content === "string" ? input.content : "";
        if (!content.trim()) {
          throw new HttpError(400, "Feedback content must not be empty.");
        }
        const response = await createFeedback(
          {
            messageId: input.targetMsgId,
            authorId: user.userId,
            content,
          },
          accessToken
        );
        const mapped = mapFeedbackRow(mapApiFeedbackRow(response.data));
        return NextResponse.json({ data: mapped });
      }
      case "createConversation": {
        const input = (payload ?? {}) as { title?: string };
        const title = (input.title ?? "").trim() || "新しい会話";
        const created = await createConversationForNewHire(
          {
            userId: user.userId,
            title,
            role: user.role,
            displayName: user.displayName,
          },
          accessToken
        );
        const createdRow = (created as any)?.data ?? created;
        const mapped = mapApiConversationRow(createdRow as { conv_id: string; title: string; created_at: string });
        mapped.ownerId = user.userId;
        return NextResponse.json({ data: mapped });
      }
      case "deleteConversation": {
        const input = (payload ?? {}) as { convId?: string };
        if (!input.convId || typeof input.convId !== "string") {
          throw new HttpError(400, "convId is required.");
        }
        await deleteConversationForNewHire(
          {
            userId: user.userId,
            convId: input.convId,
          },
          accessToken
        );
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
  } catch (error) {
    console.error("[student-chat][POST][error]", error);
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestedConvId = searchParams.get("convId") ?? undefined;

  try {
    const { accessToken, user: authUser } = await requireAuth(request);
    logRequest("GET", { convId: requestedConvId, userId: authUser.userId });
    const convListResponse = await getConversationListByNewHire(authUser.userId, accessToken);

    type ConversationRow = { conv_id: string; title: string; created_at: string };
    const convRows: ConversationRow[] = Array.isArray((convListResponse as any)?.data)
      ? ((convListResponse as any).data as ConversationRow[])
      : Array.isArray(convListResponse)
        ? (convListResponse as ConversationRow[])
        : [];

    const conversations = convRows.map((row: ConversationRow) => {
      const mapped = mapApiConversationRow(row);
      mapped.ownerId = authUser.userId;
      return mapped;
    });

    if (!conversations.length) {
      return NextResponse.json({
        data: {
          conversation: null,
          currentUser: {
            userId: authUser.userId,
            role: authUser.role,
            displayName: authUser.displayName,
            email: "",
            createdAt: "",
            disabledAt: undefined,
          },
          initialMessages: [],
          initialFeedbacks: {},
          authorNames: {},
          mentorAssignments: [],
          availableConversations: [],
          availableMentors: [],
        },
      });
    }

    let selectedConversation = conversations[0];
    if (requestedConvId) {
      const matched = conversations.find((conv) => conv.convId === requestedConvId);
      if (matched) {
        selectedConversation = matched;
      }
    }

    const messagesResponse = await getMessages(selectedConversation.convId, accessToken);
    const initialMessages = (messagesResponse.data ?? [])
      .map(mapApiMessageRow)
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.msg_id.localeCompare(b.msg_id))
      .map(mapMessageRow);

    const feedbackByMessageId: Record<string, ReturnType<typeof mapFeedbackRow>[]> = {};
    const authorIds = new Set<string>();

    for (const msg of initialMessages) {
      const feedbackResponse = await getFeedbackByMessage(msg.msgId, accessToken);
      const mapped = (feedbackResponse.data ?? []).map(mapApiFeedbackRow).map(mapFeedbackRow);
      if (mapped.length) {
        feedbackByMessageId[msg.msgId] = mapped;
        mapped.forEach((item) => authorIds.add(item.authorId));
      }
    }

    return NextResponse.json({
      data: {
        conversation: selectedConversation,
        currentUser: {
          userId: authUser.userId,
          role: authUser.role,
          displayName: authUser.displayName,
          email: "",
          createdAt: "",
          disabledAt: undefined,
        },
        initialMessages,
        initialFeedbacks: feedbackByMessageId,
        authorNames: Object.fromEntries(Array.from(authorIds).map((id) => [id, id] as const)),
        mentorAssignments: [],
        availableConversations: conversations.map((conv) => ({
          convId: conv.convId,
          title: conv.title,
          lastActiveAt: conv.lastActiveAt,
        })),
        availableMentors: [],
      },
    });
  } catch (error) {
    console.error("[student-chat][GET][error]", error);
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

export const runtime = "nodejs";
