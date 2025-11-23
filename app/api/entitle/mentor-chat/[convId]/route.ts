import { NextResponse, type NextRequest } from "next/server";

import { SupabaseAuthGateway } from "../../../../../src/interfaceAdapters/gateways/supabase/authGateway";
import type { Feedback, Message, User } from "../../../../../src/domain/core";

const BACKEND_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.LLM_BACKEND_BASE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

const authGateway = new SupabaseAuthGateway();

type MessageDto = { msg_id: string; conv_id: string; role: Message["role"]; content: string; created_at: string };
type FeedbackDto = {
  fb_id: string;
  target_msg_id: string;
  author_id: string;
  author_role: Feedback["authorRole"];
  content: string;
  created_at: string;
};

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
    throw new Error(text || `Backend request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
};

const ensureMentorAuth = async (request: NextRequest) => {
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
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }

  let authUser: { userId: string; role: User["role"] };
  try {
    authUser = await authGateway.getUserFromAccessToken(accessToken);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return { error: NextResponse.json({ error: message }, { status: 401 }) } as const;
  }

  if (authUser.role !== "MENTOR") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
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
    const auth = await ensureMentorAuth(request);
    if ("error" in auth) {
      return auth.error;
    }
    const { authUser, accessToken } = auth;

    const convList = await callBackend<{ conv_id: string; title: string; created_at: string; owner_name?: string }[]>(
      `/conversations/mentor?mentorId=${encodeURIComponent(authUser.userId)}`,
      undefined,
      accessToken
    );
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

    const messagesResponse = await callBackend<{ data: MessageDto[] }>(
      `/messages/mentor?mentorId=${encodeURIComponent(authUser.userId)}&convId=${encodeURIComponent(convId)}`,
      undefined,
      accessToken
    );
    const messages = (messagesResponse.data ?? []).map(mapMessageDto);

    const feedbackByMessageId: Record<string, Feedback[]> = {};
    const authorNames: Record<string, string> = {};

    await Promise.all(
      messages.map(async (message) => {
        const fbRes = await callBackend<{ data: FeedbackDto[] }>(
          `/feedback?messageId=${encodeURIComponent(message.msgId)}`,
          undefined,
          accessToken
        );
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
    const auth = await ensureMentorAuth(request);
    if ("error" in auth) {
      return auth.error;
    }
    const { authUser, accessToken } = auth;

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

    // 메시지가 멘토에게 접근 가능한지 확인
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

    // 기존 멘토 피드백 존재 여부 확인 (백엔드에는 업데이트 엔드포인트가 없어 중복 작성 방지만 수행)
    const feedbackRes = await callBackend<{ data: FeedbackDto[] }>(
      `/feedback?messageId=${encodeURIComponent(targetMessage.msgId)}`,
      undefined,
      accessToken
    );
    const existingFeedback = (feedbackRes.data ?? []).find((fb) => fb.author_id === authUser.userId);
    if (existingFeedback) {
      return NextResponse.json({ error: "既にこのメッセージへフィードバック済みです。" }, { status: 400 });
    }

    const createRes = await callBackend<{ data: FeedbackDto }>(
      "/feedback",
      {
        method: "POST",
        body: JSON.stringify({
          messageId: targetMessage.msgId,
          authorId: authUser.userId,
          content,
        }),
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
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
