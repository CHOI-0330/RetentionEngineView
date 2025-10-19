import { NextResponse, type NextRequest } from "next/server";

import {
  SupabaseFeedbackGateway,
  SupabaseFeedbackLookupGateway,
  SupabaseMentorAssignmentGateway,
  SupabaseMessageGateway,
} from "../../../../../src/interfaceAdapters/gateways/supabase";
import { SupabaseAuthGateway } from "../../../../../src/interfaceAdapters/gateways/supabase/authGateway";
import { createServerSupabaseClient } from "../../../../../src/lib/supabaseClient";
import {
  mapConversationRow,
  mapFeedbackRow,
  mapMessageRow,
  mapUserRow,
  type ConversationRow,
  type FeedbackRow,
  type MessageRow,
  type UserRow,
} from "../../../../../src/interfaceAdapters/gateways/supabase/types";
import {
  createFeedbackUseCase,
  validateFeedbackRulesUseCase,
  validateFeedbackUpdateUseCase,
} from "../../../../../src/application/entitle/useCases";

interface MentorRequestContext {
  authUser: { userId: string; role: "NEW_HIRE" | "MENTOR" | "ADMIN" };
  conversation: ReturnType<typeof mapConversationRow>;
  student: ReturnType<typeof mapUserRow>;
  mentor: ReturnType<typeof mapUserRow>;
  assignments: Awaited<
    ReturnType<SupabaseMentorAssignmentGateway["listActiveAssignments"]>
  >;
}

const authGateway = new SupabaseAuthGateway();
const mentorAssignmentGateway = new SupabaseMentorAssignmentGateway();
const messageGateway = new SupabaseMessageGateway();
const feedbackGateway = new SupabaseFeedbackGateway();
const feedbackLookupGateway = new SupabaseFeedbackLookupGateway();
const client = createServerSupabaseClient();

const resolveMentorRequest = async (
  request: NextRequest,
  convId: string
): Promise<NextResponse | MentorRequestContext> => {
  const accessToken = request.cookies.get("auth_access_token")?.value;
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let authUser: { userId: string; role: "NEW_HIRE" | "MENTOR" | "ADMIN" };
  try {
    authUser = await authGateway.getUserFromAccessToken(accessToken);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  if (authUser.role !== "MENTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    { data: conversationRow, error: conversationError },
    { data: mentorRow, error: mentorError },
  ] = await Promise.all([
    client.from("conversation").select().eq("conv_id", convId).single(),
    client.from("user").select().eq("user_id", authUser.userId).single(),
  ]);

  if (conversationError || !conversationRow) {
    return NextResponse.json(
      { error: "Conversation not found." },
      { status: 404 }
    );
  }
  if (mentorError || !mentorRow) {
    return NextResponse.json({ error: "Mentor not found." }, { status: 404 });
  }

  const conversation = mapConversationRow(conversationRow as ConversationRow);

  const assignments = await mentorAssignmentGateway.listActiveAssignments({
    mentorId: authUser.userId,
  });
  const isAssigned = assignments.some(
    (assignment) =>
      assignment.newhireId === conversation.ownerId &&
      assignment.revokedAt == null
  );
  if (!isAssigned) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: studentRow, error: studentError } = await client
    .from("user")
    .select()
    .eq("user_id", conversation.ownerId)
    .single();
  if (studentError || !studentRow) {
    return NextResponse.json({ error: "Student not found." }, { status: 404 });
  }

  return {
    authUser,
    conversation,
    student: mapUserRow(studentRow as UserRow),
    mentor: mapUserRow(mentorRow as UserRow),
    assignments,
  };
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
    const context = await resolveMentorRequest(request, convId);
    if (context instanceof NextResponse) {
      return context;
    }

    const { conversation, student, mentor } = context;

    const messagesResponse = await messageGateway.listConversationMessages({
      convId,
    });
    const messages = messagesResponse.items;

    const messageIds = messages.map((message) => message.msgId);
    const { data: feedbackRows, error: feedbackError } = messageIds.length
      ? await client.from("feedback").select().in("target_msg_id", messageIds)
      : { data: [] as unknown[], error: null };
    if (feedbackError) {
      throw feedbackError;
    }

    const feedbackByMessageId: Record<
      string,
      ReturnType<typeof mapFeedbackRow>[]
    > = {};
    if (feedbackRows) {
      for (const row of feedbackRows as FeedbackRow[]) {
        const mapped = mapFeedbackRow(row);
        if (!feedbackByMessageId[mapped.targetMsgId]?.length) {
          feedbackByMessageId[mapped.targetMsgId] = [mapped];
        }
      }
    }

    const authorIds = new Set<string>();
    Object.values(feedbackByMessageId).forEach((list) => {
      list.forEach((item) => authorIds.add(item.authorId));
    });

    const authorEntries = await Promise.all(
      Array.from(authorIds).map(async (authorId) => {
        const displayName = await feedbackLookupGateway.getUserDisplayName(
          authorId
        );
        return [authorId, displayName ?? authorId] as const;
      })
    );

    return NextResponse.json({
      data: {
        conversation,
        student,
        mentor,
        messages,
        feedbackByMessageId,
        authorNames: Object.fromEntries(authorEntries),
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

  console.log("Received POST request for convId:", convId);

  if (!convId) {
    return NextResponse.json({ error: "convId is required." }, { status: 400 });
  }

  try {
    const context = await resolveMentorRequest(request, convId);
    if (context instanceof NextResponse) {
      return context;
    }

    const { conversation, mentor, assignments } = context;

    let body: { messageId?: string; content?: string };
    try {
      body = (await request.json()) as { messageId?: string; content?: string };
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    if (!body.messageId || typeof body.messageId !== "string") {
      return NextResponse.json(
        { error: "messageId is required." },
        { status: 400 }
      );
    }
    const content = typeof body.content === "string" ? body.content : "";

    const { data: messageRow, error: messageError } = await client
      .from("message")
      .select()
      .eq("msg_id", body.messageId)
      .single();
    if (messageError || !messageRow) {
      return NextResponse.json(
        { error: "Message not found." },
        { status: 404 }
      );
    }

    const message = mapMessageRow(messageRow as MessageRow);

    if (message.convId !== conversation.convId) {
      return NextResponse.json(
        { error: "Message does not belong to the conversation." },
        { status: 400 }
      );
    }

    const existing = await feedbackGateway.listFeedbacks({
      msgId: message.msgId,
      limit: 1,
    });
    const existingFeedback = existing.items[0] ?? null;

    if (existingFeedback) {
      if (existingFeedback.authorId !== mentor.userId) {
        return NextResponse.json(
          { error: "既存のフィードバックを更新する権限がありません。" },
          { status: 403 }
        );
      }
      const updateValidation = validateFeedbackUpdateUseCase({
        requester: mentor,
        conversation,
        targetMessage: message,
        existingFeedback,
        content,
        mentorAssignments: assignments,
      });
      if (updateValidation.kind === "failure") {
        const status = updateValidation.error.kind === "Forbidden" ? 403 : 400;
        return NextResponse.json(
          { error: updateValidation.error.message },
          { status }
        );
      }
      const updated = await feedbackGateway.updateFeedback({
        feedbackId: updateValidation.value.feedbackId,
        content: updateValidation.value.content,
      });
      return NextResponse.json({
        data: {
          feedback: updated,
          authorName: mentor.displayName,
        },
      });
    }

    const validation = validateFeedbackRulesUseCase({
      requester: mentor,
      conversation,
      targetMessage: message,
      content,
      mentorAssignments: assignments,
      existingFeedbackCount: existing.items.length,
    });

    if (validation.kind === "failure") {
      const status = validation.error.kind === "Forbidden" ? 403 : 400;
      return NextResponse.json({ error: validation.error.message }, { status });
    }

    const ready = createFeedbackUseCase({ validated: validation.value });

    const feedback = await feedbackGateway.createFeedback({
      ...ready.payload,
    });

    return NextResponse.json(
      {
        data: {
          feedback,
          authorName: mentor.displayName,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
