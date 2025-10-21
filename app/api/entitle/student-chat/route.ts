import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";

import {
  SupabaseFeedbackGateway,
  SupabaseFeedbackLookupGateway,
  SupabaseMentorAssignmentGateway,
  SupabaseMessageGateway,
} from "../../../../src/interfaceAdapters/gateways/supabase";
import { SupabaseAuthGateway } from "../../../../src/interfaceAdapters/gateways/supabase/authGateway";
import { createServerSupabaseClient } from "../../../../src/lib/supabaseClient";
import {
  mapConversationRow,
  mapFeedbackRow,
  mapMessageRow,
  mapUserRow,
  type ConversationRow,
  type FeedbackRow,
  type MessageRow,
  type MentorAssignmentRow,
  type UserRow,
} from "../../../../src/interfaceAdapters/gateways/supabase/types";
import { createConversationUseCase } from "../../../../src/application/entitle/useCases";
import type { Conversation } from "../../../../src/type/core";
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

const listAvailableMentors = async (
  client: ReturnType<typeof createServerSupabaseClient>,
  newhireId: string
) => {
  const { data: activeAssignments, error: activeAssignmentsError } = await client
    .from("mentor_assignment")
    .select()
    .eq("newhire_id", newhireId)
    .is("revoked_at", null);
  if (activeAssignmentsError) {
    throw activeAssignmentsError;
  }

  const assignmentRows = (activeAssignments as MentorAssignmentRow[]) ?? [];
  let mentorUserRows: UserRow[] = [];

  if (assignmentRows.length > 0) {
    const mentorIds = assignmentRows.map((assignment) => assignment.mentor_id);
    const { data: mentorUsers, error: mentorUsersError } = await client
      .from("user")
      .select()
      .in("user_id", mentorIds);
    if (mentorUsersError || !mentorUsers) {
      throw mentorUsersError ?? new Error("Failed to load mentors.");
    }
    mentorUserRows = mentorUsers as UserRow[];
  } else {
    const { data: mentorUsers, error: mentorUsersError } = await client
      .from("user")
      .select()
      .eq("role", "MENTOR");
    if (mentorUsersError || !mentorUsers) {
      throw mentorUsersError ?? new Error("Failed to load mentors.");
    }
    mentorUserRows = mentorUsers as UserRow[];
  }

  return mentorUserRows
    .map((mentor) => ({
      mentorId: mentor.user_id,
      displayName: mentor.display_name,
      email: mentor.email,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
};

export async function POST(request: NextRequest) {
  const { action, payload } = (await request.json()) as {
    action: StudentChatAction;
    payload: unknown;
  };

  const messageGateway = new SupabaseMessageGateway();
  const feedbackGateway = new SupabaseFeedbackGateway();
  const feedbackLookupGateway = new SupabaseFeedbackLookupGateway();
  const mentorAssignmentGateway = new SupabaseMentorAssignmentGateway();
  const authGateway = new SupabaseAuthGateway();
  const adminClient = createServerSupabaseClient();

  const accessToken = request.cookies.get("auth_access_token")?.value;
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let user;
  try {
    user = await authGateway.getUserFromAccessToken(accessToken);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  const ensureConversationAccess = async (convId: string) => {
    const { data: conversationRow, error: conversationError } = await adminClient
      .from("conversation")
      .select()
      .eq("conv_id", convId)
      .single();
    if (conversationError || !conversationRow) {
      throw new HttpError(404, "Conversation not found.");
    }

    const conversation = mapConversationRow(conversationRow as ConversationRow);
    const mentorAssignments = await mentorAssignmentGateway.listActiveAssignments({
      newhireId: conversation.ownerId,
    });
    const isOwner = conversation.ownerId === user.userId;
    const isMentor =
      user.role === "MENTOR" &&
      mentorAssignments.some((assignment) => assignment.mentorId === user.userId);
    if (!isOwner && !isMentor) {
      throw new HttpError(403, "Forbidden");
    }
    return { conversation, mentorAssignments };
  };

  const ensureMessageAccess = async (msgId: string) => {
    const { data, error } = await adminClient
      .from("message")
      .select()
      .eq("msg_id", msgId)
      .single();
    if (error || !data) {
      throw new HttpError(404, "Message not found.");
    }
    const message = mapMessageRow(data as MessageRow);
    const access = await ensureConversationAccess(message.convId);
    return { message, ...access };
  };

  try {
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

        const access = await ensureConversationAccess(input.convId);
        if (access.conversation.ownerId !== user.userId) {
          throw new HttpError(403, "Only the conversation owner can post messages.");
        }

        const result = await messageGateway.createUserMessage({
          convId: access.conversation.convId,
          authorId: user.userId,
          content: trimmedContent,
        });
        return NextResponse.json({ data: result });
      }
      case "beginAssistantMessage": {
        const input = (payload ?? {}) as { convId?: string };
        if (!input.convId || typeof input.convId !== "string") {
          throw new HttpError(400, "convId is required.");
        }
        const access = await ensureConversationAccess(input.convId);
        if (access.conversation.ownerId !== user.userId) {
          throw new HttpError(403, "Only the conversation owner can request an assistant response.");
        }
        const result = await messageGateway.beginAssistantMessage(input.convId);
        return NextResponse.json({ data: result });
      }
      case "finalizeAssistantMessage": {
        const input = (payload ?? {}) as { msgId?: string };
        if (!input.msgId || typeof input.msgId !== "string") {
          throw new HttpError(400, "msgId is required.");
        }
        await ensureMessageAccess(input.msgId);
        const result = await messageGateway.finalizeAssistantMessage(
          payload as Parameters<typeof messageGateway.finalizeAssistantMessage>[0]
        );
        return NextResponse.json({ data: result });
      }
      case "cancelAssistantMessage": {
        const input = (payload ?? {}) as { msgId?: string };
        if (!input.msgId || typeof input.msgId !== "string") {
          throw new HttpError(400, "msgId is required.");
        }
        await ensureMessageAccess(input.msgId);
        const result = await messageGateway.cancelAssistantMessage(input.msgId);
        return NextResponse.json({ data: result });
      }
      case "listConversationMessages": {
        const input = (payload ?? {}) as { convId?: string; cursor?: string; limit?: number };
        if (!input.convId || typeof input.convId !== "string") {
          throw new HttpError(400, "convId is required.");
        }
        await ensureConversationAccess(input.convId);
        const result = await messageGateway.listConversationMessages(
          input as Parameters<typeof messageGateway.listConversationMessages>[0]
        );
        return NextResponse.json({ data: result });
      }
      case "listFeedbacks": {
        const input = (payload ?? {}) as { msgId?: string; cursor?: string; limit?: number };
        if (!input.msgId || typeof input.msgId !== "string") {
          throw new HttpError(400, "msgId is required.");
        }
        await ensureMessageAccess(input.msgId);
        const result = await feedbackGateway.listFeedbacks(
          input as Parameters<typeof feedbackGateway.listFeedbacks>[0]
        );
        const authorIds = Array.from(new Set(result.items.map((feedback) => feedback.authorId)));
        const authorEntries = await Promise.all(
          authorIds.map(async (authorId) => {
            const displayName = await feedbackLookupGateway.getUserDisplayName(authorId);
            return [authorId, displayName ?? authorId] as const;
          })
        );
        return NextResponse.json({
          data: {
            items: result.items,
            nextCursor: result.nextCursor,
            authorNames: Object.fromEntries(authorEntries),
          },
        });
      }
      case "createFeedback": {
        const input = (payload ?? {}) as { targetMsgId?: string };
        if (!input.targetMsgId || typeof input.targetMsgId !== "string") {
          throw new HttpError(400, "targetMsgId is required.");
        }
        await ensureMessageAccess(input.targetMsgId);
        const { count: existingCount, error: countError } = await adminClient
          .from("feedback")
          .select("fb_id", { count: "exact", head: true })
          .eq("target_msg_id", input.targetMsgId);
        if (countError) {
          throw countError;
        }
        if ((existingCount ?? 0) > 0) {
          throw new HttpError(400, "Feedback already exists for this message.");
        }
        const feedback = await feedbackGateway.createFeedback(
          payload as Parameters<typeof feedbackGateway.createFeedback>[0]
        );
        const authorName = await feedbackLookupGateway.getUserDisplayName(feedback.authorId);
        return NextResponse.json({
          data: {
            feedback,
            authorName: authorName ?? undefined,
          },
        });
      }
      case "createConversation": {
        if (user.role !== "NEW_HIRE") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const input = (payload ?? {}) as { title?: string; mentorId?: string | null };
        const availableMentors = await listAvailableMentors(adminClient, user.userId);
        const validation = createConversationUseCase({
          requester: user,
          title: input.title ?? "",
          mentorId: input.mentorId ?? null,
          allowedMentorIds: availableMentors.map((mentor) => mentor.mentorId),
        });
        if (validation.kind === "failure") {
          return NextResponse.json({ error: validation.error.message }, { status: 400 });
        }

        const convId = randomUUID();
        const { data, error } = await adminClient
          .from("conversation")
          .insert({
            conv_id: convId,
            owner_id: user.userId,
            title: validation.value.title,
            state: "ACTIVE",
          })
          .select()
          .single();
        if (error || !data) {
          throw error ?? new Error("Failed to create conversation.");
        }

        const mentorId = validation.value.mentorId ?? null;
        if (mentorId) {
          const { error: assignmentError } = await adminClient
            .from("mentor_assignment")
            .upsert(
              {
                mentor_id: mentorId,
                newhire_id: user.userId,
              },
              { onConflict: "mentor_id,newhire_id", ignoreDuplicates: true }
            );
          if (assignmentError) {
            throw assignmentError;
          }
        }

        return NextResponse.json({ data: mapConversationRow(data as ConversationRow) });
      }
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
  } catch (error) {
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

  const client = createServerSupabaseClient();
  const feedbackLookupGateway = new SupabaseFeedbackLookupGateway();
  const mentorAssignmentGateway = new SupabaseMentorAssignmentGateway();
  const authGateway = new SupabaseAuthGateway();

  const accessToken = request.cookies.get("auth_access_token")?.value;
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let authUser;
  try {
    authUser = await authGateway.getUserFromAccessToken(accessToken);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  try {
    const { data: conversationRows, error: conversationListError } = await client
      .from("conversation")
      .select()
      .eq("owner_id", authUser.userId)
      .order("last_active_at", { ascending: false })
      .order("conv_id", { ascending: false });

    if (conversationListError) {
      throw conversationListError;
    }

    const conversations = (conversationRows as ConversationRow[] | null)?.map(mapConversationRow) ?? [];
    const availableMentors = await listAvailableMentors(client, authUser.userId);

    if (availableMentors.length === 0) {
      const { data: userRow, error: userError } = await client
        .from("user")
        .select()
        .eq("user_id", authUser.userId)
        .single();
      if (userError || !userRow) {
        throw userError ?? new Error("User not found.");
      }
      return NextResponse.json({
        data: {
          conversation: null,
          currentUser: mapUserRow(userRow as UserRow),
          initialMessages: [],
          initialFeedbacks: {},
          authorNames: {},
          mentorAssignments: [],
          availableConversations: [],
          availableMentors: [],
        },
      });
    }

    if (!conversations.length) {
      const { data: userRow, error: userError } = await client
        .from("user")
        .select()
        .eq("user_id", authUser.userId)
        .single();
      if (userError || !userRow) {
        throw userError ?? new Error("User not found.");
      }
      return NextResponse.json({
        data: {
          conversation: null,
          currentUser: mapUserRow(userRow as UserRow),
          initialMessages: [],
          initialFeedbacks: {},
          authorNames: {},
          mentorAssignments: [],
          availableConversations: [],
          availableMentors,
        },
      });
    }

    let selectedConversation: Conversation = conversations[0];
    if (requestedConvId) {
      const matched = conversations.find((entry) => entry.convId === requestedConvId);
      if (matched) {
        selectedConversation = matched;
      }
    }

    const [{ data: conversationRow, error: conversationError }, { data: userRow, error: userError }] = await Promise.all([
      client.from("conversation").select().eq("conv_id", selectedConversation.convId).single(),
      client.from("user").select().eq("user_id", authUser.userId).single(),
    ]);

    if (conversationError || !conversationRow) {
      throw conversationError ?? new Error("Conversation not found.");
    }
    if (userError || !userRow) {
      throw userError ?? new Error("User not found.");
    }

    const conversation = mapConversationRow(conversationRow as ConversationRow);
    const currentUser = mapUserRow(userRow as UserRow);

    const { data: messageRows, error: messageError } = await client
      .from("message")
      .select()
      .eq("conv_id", conversation.convId)
      .order("created_at", { ascending: true })
      .order("msg_id", { ascending: true });
    if (messageError || !messageRows) {
      throw messageError ?? new Error("Failed to load messages.");
    }
    const initialMessages = (messageRows as MessageRow[]).map(mapMessageRow);

    const messageIds = initialMessages.map((message) => message.msgId);

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
        const displayName = await feedbackLookupGateway.getUserDisplayName(authorId);
        return [authorId, displayName ?? authorId] as const;
      })
    );

    const mentorAssignments = await mentorAssignmentGateway.listActiveAssignments({ newhireId: conversation.ownerId });

    const isOwner = conversation.ownerId === authUser.userId;
    const isMentorUser = mentorAssignments.some((assignment) => assignment.mentorId === authUser.userId);
    if (!isOwner && !isMentorUser) {
      throw new HttpError(403, "Forbidden");
    }

    return NextResponse.json({
      data: {
        conversation,
        currentUser,
        initialMessages,
        initialFeedbacks: feedbackByMessageId,
        authorNames: Object.fromEntries(authorEntries),
        mentorAssignments,
        availableConversations: conversations.map((entry) => ({
          convId: entry.convId,
          title: entry.title,
          lastActiveAt: entry.lastActiveAt,
        })),
        availableMentors,
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
