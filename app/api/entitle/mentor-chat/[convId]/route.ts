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
  mapUserRow,
  type ConversationRow,
  type FeedbackRow,
  type UserRow,
} from "../../../../../src/interfaceAdapters/gateways/supabase/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { convId: string } }
) {
  const convId = params.convId;

  if (!convId) {
    return NextResponse.json({ error: "convId is required." }, { status: 400 });
  }

  const authGateway = new SupabaseAuthGateway();
  const mentorAssignmentGateway = new SupabaseMentorAssignmentGateway();
  const messageGateway = new SupabaseMessageGateway();
  const feedbackGateway = new SupabaseFeedbackGateway();
  const feedbackLookupGateway = new SupabaseFeedbackLookupGateway();
  const client = createServerSupabaseClient();

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

  try {
    const [{ data: conversationRow, error: conversationError }, { data: mentorRow, error: mentorError }] = await Promise.all([
      client.from("conversation").select().eq("conv_id", convId).single(),
      client.from("user").select().eq("user_id", authUser.userId).single(),
    ]);

    if (conversationError || !conversationRow) {
      throw conversationError ?? new Error("Conversation not found.");
    }
    if (mentorError || !mentorRow) {
      throw mentorError ?? new Error("Mentor not found.");
    }

    const conversation = mapConversationRow(conversationRow as ConversationRow);

    const assignments = await mentorAssignmentGateway.listActiveAssignments({ mentorId: authUser.userId });
    const isAssigned = assignments.some(
      (assignment) => assignment.newhireId === conversation.ownerId && assignment.revokedAt == null
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
      throw studentError ?? new Error("Student not found.");
    }

    const student = mapUserRow(studentRow as UserRow);
    const mentor = mapUserRow(mentorRow as UserRow);

    const messagesResponse = await messageGateway.listConversationMessages({ convId });
    const messages = messagesResponse.items;

    const messageIds = messages.map((message) => message.msgId);
    const { data: feedbackRows, error: feedbackError } = messageIds.length
      ? await client.from("feedback").select().in("target_msg_id", messageIds)
      : { data: [] as unknown[], error: null };
    if (feedbackError) {
      throw feedbackError;
    }

    const feedbackByMessageId: Record<string, ReturnType<typeof mapFeedbackRow>[]> = {};
    if (feedbackRows) {
      for (const row of feedbackRows as FeedbackRow[]) {
        const mapped = mapFeedbackRow(row);
        feedbackByMessageId[mapped.targetMsgId] = [...(feedbackByMessageId[mapped.targetMsgId] ?? []), mapped];
      }
    }

    const authorIds = new Set<string>();
    Object.values(feedbackByMessageId).forEach((list) => {
      list.forEach((item) => authorIds.add(item.authorId));
    });

    const authorEntries = await Promise.all(
      Array.from(authorIds).map(async (authorId) => {
        const displayName = await feedbackLookupGateway.getUserDisplayName(authorId);
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
