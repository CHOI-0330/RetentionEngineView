import { NextResponse, type NextRequest } from "next/server";

import type { Feedback, Message, User } from "../../../../../src/domain/core";
import { createAdminSupabaseClient } from "../../../../../src/lib/supabaseClient";

class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// DTOs for backend REST responses
type MentorConversationDto = {
  conv_id: string;
  title: string;
  created_at: string;
  owner_name?: string;
};

type MessageDto = {
  msg_id: string;
  conv_id: string;
  role: Message["role"];
  content: string;
  created_at: string;
};

type FeedbackDto = {
  fb_id: string;
  target_msg_id: string;
  author_id: string;
  author_role: Feedback["authorRole"];
  content: string;
  created_at: string;
};

const BACKEND_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const getAdminClient = createAdminSupabaseClient;

const mapMessageDto = (row: MessageDto): Message => ({
  msgId: row.msg_id,
  convId: row.conv_id,
  role: row.role,
  content: row.content,
  status: undefined,
  createdAt: row.created_at,
});

const mapFeedbackDto = (row: FeedbackDto): Feedback => ({
  fbId: row.fb_id,
  targetMsgId: row.target_msg_id,
  authorId: row.author_id,
  authorRole: row.author_role,
  content: row.content,
  visibility: undefined,
  createdAt: row.created_at,
  updatedAt: undefined,
});

const callBackend = async <T>(path: string, init?: RequestInit, accessToken?: string): Promise<T> => {
  const response = await fetch(`${BACKEND_BASE_URL}/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new HttpError(response.status, text || "Backend request failed.");
  }
  return (await response.json()) as T;
};

// Match NestJS controller method names for clarity.
const getMentorConversationList = (mentorId: string, accessToken: string) =>
  callBackend<MentorConversationDto[]>(
    `/conversations/mentor?mentorId=${encodeURIComponent(mentorId)}`,
    undefined,
    accessToken
  );

const getMessagesForMentor = (mentorId: string, convId: string, accessToken: string) =>
  callBackend<{ data: MessageDto[] }>(
    `/messages/mentor?mentorId=${encodeURIComponent(mentorId)}&convId=${encodeURIComponent(convId)}`,
    undefined,
    accessToken
  );

const getFeedbackByMessage = (messageId: string, accessToken: string) =>
  callBackend<{ data: FeedbackDto[] }>(
    `/feedback?messageId=${encodeURIComponent(messageId)}`,
    undefined,
    accessToken
  );

const createFeedback = (input: { messageId: string; authorId: string; content: string }, accessToken: string) =>
  callBackend<{ data: FeedbackDto }>(
    "/feedback",
    {
      method: "POST",
      body: JSON.stringify({
        messageId: input.messageId,
        authorId: input.authorId,
        content: input.content,
      }),
    },
    accessToken
  );

const resolveAccessToken = (request: NextRequest): string | null => {
  const headerToken = request.headers.get("authorization");
  const accessTokenFromHeader = headerToken?.toLowerCase().startsWith("bearer ")
    ? headerToken.slice(7).trim()
    : null;
  const cookieAccessToken = request.cookies.get("auth_access_token")?.value;
  // Support Supabase auth cookie shape: sb-<project-ref>-auth-token
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

  const accessToken = accessTokenFromHeader ?? cookieAccessToken ?? supabaseAccessToken;
  if (!accessToken) {
    return null;
  }
  return accessToken;
};

const requireMentorAuth = async (request: NextRequest) => {
  const accessToken = resolveAccessToken(request);
  if (!accessToken) {
    throw new HttpError(401, "Unauthorized");
  }

  let authUser: { userId: string; role: User["role"]; displayName?: string };
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
      throw profileError ?? new HttpError(401, "User profile not found.");
    }
    authUser = {
      userId,
      role: (profile as { role: User["role"] }).role,
      displayName: (profile as { display_name?: string }).display_name ?? "",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    throw new HttpError(401, message);
  }

  if (authUser.role !== "MENTOR") {
    throw new HttpError(403, "Forbidden");
  }

  return { authUser, accessToken } as const;
};

export async function GET(
  request: NextRequest,
  { params }: { params: { convId: string } }
) {
  const convId = params.convId;

  if (!convId) {
    return NextResponse.json({ error: "convId is required." }, { status: 400 });
  }

  try {
    const { authUser, accessToken } = await requireMentorAuth(request);

    const convList = await getMentorConversationList(authUser.userId, accessToken);
    const targetConv = convList.find((entry) => entry.conv_id === convId);
    if (!targetConv) {
      return NextResponse.json({ error: "Conversation not found or not assigned." }, { status: 404 });
    }

    const conversation = {
      convId: targetConv.conv_id,
      ownerId: "",
      title: targetConv.title,
      state: "ACTIVE",
      createdAt: targetConv.created_at,
      lastActiveAt: targetConv.created_at,
      archivedAt: undefined,
    };

    const messagesResponse = await getMessagesForMentor(authUser.userId, convId, accessToken);
    const messages = (messagesResponse.data ?? []).map(mapMessageDto);

    const feedbackByMessageId: Record<string, Feedback[]> = {};
    const authorNames: Record<string, string> = {};

    await Promise.all(
      messages.map(async (message) => {
        const fbRes = await getFeedbackByMessage(message.msgId, accessToken);
        const mapped = (fbRes.data ?? []).map(mapFeedbackDto);
        if (mapped.length) {
          feedbackByMessageId[message.msgId] = mapped;
          mapped.forEach((item) => {
            authorNames[item.authorId] = authorNames[item.authorId] ?? item.authorId;
          });
        }
      })
    );

    const mentor: User = {
      userId: authUser.userId,
      role: "MENTOR",
      displayName: authUser.userId,
      email: "",
      createdAt: "",
    };

    const student: User = {
      userId: "",
      role: "NEW_HIRE",
      displayName: targetConv.owner_name ?? "Unknown user",
      email: "",
      createdAt: "",
    };

    return NextResponse.json({
      data: {
        conversation,
        student,
        mentor,
        messages,
        feedbackByMessageId,
        authorNames,
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { convId: string } }
) {
  const convId = params.convId;

  if (!convId) {
    return NextResponse.json({ error: "convId is required." }, { status: 400 });
  }

  try {
    const { authUser, accessToken } = await requireMentorAuth(request);

    let body: { messageId?: string; content?: string };
    try {
      body = (await request.json()) as { messageId?: string; content?: string };
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (!body.messageId || typeof body.messageId !== "string") {
      return NextResponse.json({ error: "messageId is required." }, { status: 400 });
    }
    const content = typeof body.content === "string" ? body.content : "";

    // メッセージがメンターにアクセス可能か確認
    const messagesResponse = await callBackend<{ data: MessageDto[] }>(
      `/messages/mentor?mentorId=${encodeURIComponent(authUser.userId)}&convId=${encodeURIComponent(convId)}`,
      undefined,
      accessToken
    );
    const messages = (messagesResponse.data ?? []).map(mapMessageDto);
    const targetMessage = messages.find((m) => m.msgId === body.messageId);
    if (!targetMessage) {
      return NextResponse.json({ error: "Message not found or not accessible." }, { status: 404 });
    }

    // 既存メンターフィードバック存在有無確認（バックエンドには更新エンドポイントがないため重複作成防止のみ実行）
    const feedbackRes = await callBackend<{ data: FeedbackDto[] }>(
      `/feedback?messageId=${encodeURIComponent(targetMessage.msgId)}`,
      undefined,
      accessToken
    );
    const existingFeedback = (feedbackRes.data ?? []).find((fb) => fb.author_id === authUser.userId);
    if (existingFeedback) {
      return NextResponse.json({ error: "既にこのメッセージへフィードバック済みです。" }, { status: 400 });
    }

    const createRes = await createFeedback(
      {
        messageId: targetMessage.msgId,
        authorId: authUser.userId,
        content,
      },
      accessToken
    );
    const feedback = mapFeedbackDto(createRes.data);

    return NextResponse.json(
      {
        data: {
          feedback,
          authorName: authUser.userId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
