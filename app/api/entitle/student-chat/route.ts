import { NextResponse, type NextRequest } from "next/server";

import { SupabaseAuthGateway } from "../../../../src/interfaceAdapters/gateways/supabase/authGateway";
import { mapFeedbackRow, mapMessageRow, type FeedbackRow, type MessageRow } from "../../../../src/interfaceAdapters/gateways/supabase/types";
type StudentChatAction =
  | "createUserMessage"
  | "beginAssistantMessage"
  | "finalizeAssistantMessage"
  | "cancelAssistantMessage"
  | "listConversationMessages"
  | "listFeedbacks"
  | "createFeedback"
  | "createConversation";

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
const BACKEND_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.LLM_BACKEND_BASE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

const authGateway = new SupabaseAuthGateway();

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
    const user = await authGateway.getUserFromAccessToken(accessToken);
    return { accessToken, user };
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
    throw new Error("LLM_BACKEND_BASE_URL is not configured.");
  }
  const response = await fetch(`${BACKEND_BASE_URL}/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new HttpError(response.status, body || "Backend request failed.");
  }
  return (await response.json()) as T;
};

const mapApiMessageRow = (row: { msg_id: string; conv_id: string; role: string; content: string; created_at: string }): MessageRow => ({
  msg_id: row.msg_id,
  conv_id: row.conv_id,
  role: row.role as MessageRow["role"],
  content: row.content,
  status: (row.role as MessageRow["role"]) === "ASSISTANT" ? "DONE" : null,
  created_at: row.created_at,
});

const mapApiFeedbackRow = (row: {
  fb_id: string;
  target_msg_id: string;
  author_id: string;
  author_role: string;
  content: string;
  created_at: string;
  updated_at?: string | null;
}): FeedbackRow => ({
  fb_id: row.fb_id,
  target_msg_id: row.target_msg_id,
  author_id: row.author_id,
  author_role: row.author_role as FeedbackRow["author_role"],
  content: row.content,
  visibility: null,
  created_at: row.created_at,
  updated_at: row.updated_at ?? null,
});

const mapApiConversationRow = (row: { conv_id: string; title: string; created_at: string }): {
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

        const backendResult = await callBackend<{ data: { msg_id: string; conv_id: string; role: string; content: string; created_at: string } }>("/messages", {
          method: "POST",
          body: JSON.stringify({
            convId: input.convId,
            role: "NEW_HIRE",
            content: trimmedContent,
          }),
        }, accessToken);
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
        if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
          throw new HttpError(400, "Message content exceeds the allowed length.");
        }

        const backendResult = await callBackend<{ data: { msg_id: string; conv_id: string; role: string; content: string; created_at: string } }>("/messages", {
          method: "POST",
          body: JSON.stringify({
            convId: input.convId,
            role: "ASSISTANT",
            content: trimmedContent,
          }),
        }, accessToken);
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
        const backendMessages = await callBackend<{ data: { msg_id: string; conv_id: string; role: string; content: string; created_at: string }[] }>(
          `/messages?convId=${encodeURIComponent(input.convId)}`,
          undefined,
          accessToken
        );
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
        const backendFeedbacks = await callBackend<{ data: { fb_id: string; target_msg_id: string; author_id: string; author_role: string; content: string; created_at: string; updated_at?: string | null }[] }>(
          `/feedback?messageId=${encodeURIComponent(input.msgId)}`,
          undefined,
          accessToken
        );
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
        const response = await callBackend<{
          data: {
            fb_id: string;
            target_msg_id: string;
            author_id: string;
            author_role: string;
            content: string;
            created_at: string;
            updated_at?: string | null;
          };
        }>(
          "/feedback",
          {
            method: "POST",
            body: JSON.stringify({
              messageId: input.targetMsgId,
              authorId: user.userId,
              content,
            }),
          },
          accessToken
        );
        const mapped = mapFeedbackRow(mapApiFeedbackRow(response.data));
        return NextResponse.json({ data: mapped });
      }
      case "createConversation": {
        const input = (payload ?? {}) as { title?: string };
        const title = (input.title ?? "").trim() || "新しい会話";
        const profile = await authGateway.getUserProfile(user.userId);
        const created = await callBackend<{ data?: { conv_id: string; title: string; created_at: string } } | { conv_id: string; title: string; created_at: string }>(
          "/conversations/newHire",
          {
            method: "POST",
            body: JSON.stringify({
              userId: user.userId,
              title,
              role: profile.role,
              displayName: profile.displayName,
              email: "",
            }),
          },
          accessToken
        );
        const createdRow = (created as any)?.data ?? created;
        const mapped = mapApiConversationRow(createdRow as { conv_id: string; title: string; created_at: string });
        mapped.ownerId = user.userId;
        return NextResponse.json({ data: mapped });
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
    const profile = await authGateway.getUserProfile(authUser.userId);
    const convListResponse = await callBackend<{ data?: { conv_id: string; title: string; created_at: string }[] } | { conv_id: string; title: string; created_at: string }[]>(
      `/conversations/newHire?userId=${encodeURIComponent(authUser.userId)}`,
      undefined,
      accessToken
    );

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
            role: profile.role,
            displayName: profile.displayName,
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

    const messagesResponse = await callBackend<{ data: { msg_id: string; conv_id: string; role: string; content: string; created_at: string }[] }>(
      `/messages?convId=${encodeURIComponent(selectedConversation.convId)}`,
      undefined,
      accessToken
    );
    const initialMessages = (messagesResponse.data ?? [])
      .map(mapApiMessageRow)
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.msg_id.localeCompare(b.msg_id))
      .map(mapMessageRow);

    const feedbackByMessageId: Record<string, ReturnType<typeof mapFeedbackRow>[]> = {};
    const authorIds = new Set<string>();

    for (const msg of initialMessages) {
      const feedbackResponse = await callBackend<{ data: { fb_id: string; target_msg_id: string; author_id: string; author_role: string; content: string; created_at: string; updated_at?: string | null }[] }>(
        `/feedback?messageId=${encodeURIComponent(msg.msgId)}`,
        undefined,
        accessToken
      );
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
          role: profile.role,
          displayName: profile.displayName,
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
