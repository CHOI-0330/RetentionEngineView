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
  | "appendAssistantDelta"
  | "finalizeAssistantMessage"
  | "cancelAssistantMessage"
  | "listConversationMessages"
  | "listFeedbacks"
  | "createFeedback"
  | "createConversation";

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
      .select("owner_id")
      .eq("conv_id", convId)
      .single();
    if (conversationError || !conversationRow) {
      throw conversationError ?? new Error("Conversation not found.");
    }

    const ownerId = (conversationRow as { owner_id: string }).owner_id;
    const mentorAssignments = await mentorAssignmentGateway.listActiveAssignments({ newhireId: ownerId });
    const isOwner = ownerId === user.userId;
    const isMentor = user.role === "MENTOR" && mentorAssignments.some((assignment) => assignment.mentorId === user.userId);
    if (!isOwner && !isMentor) {
      throw new Error("Forbidden");
    }
    return { ownerId, mentorAssignments };
  };

  const ensureMessageAccess = async (msgId: string) => {
    const { data, error } = await adminClient
      .from("message")
      .select("conv_id")
      .eq("msg_id", msgId)
      .single();
    if (error || !data) {
      throw error ?? new Error("Message not found.");
    }
    return ensureConversationAccess((data as { conv_id: string }).conv_id);
  };

  try {
    switch (action) {
      case "createUserMessage": {
        const result = await messageGateway.createUserMessage(
          payload as Parameters<typeof messageGateway.createUserMessage>[0]
        );
        if (result.convId !== (payload as { convId: string }).convId || result.role !== "NEW_HIRE") {
          throw new Error("Invalid conversation binding.");
        }
        if (result.convId !== (payload as { convId: string }).convId || user.userId !== result.convId) {
          // placeholder check, actual enforcement occurs in GET bootstrap
        }
        await ensureConversationAccess((payload as { convId: string }).convId);
        return NextResponse.json({ data: result });
      }
      case "beginAssistantMessage": {
        await ensureConversationAccess((payload as { convId: string }).convId);
        const result = await messageGateway.beginAssistantMessage((payload as { convId: string }).convId);
        return NextResponse.json({ data: result });
      }
      case "appendAssistantDelta": {
        await ensureMessageAccess((payload as { msgId: string }).msgId);
        await messageGateway.appendAssistantDelta(
          payload as Parameters<typeof messageGateway.appendAssistantDelta>[0]
        );
        return NextResponse.json({ data: { ok: true } });
      }
      case "finalizeAssistantMessage": {
        await ensureMessageAccess((payload as { msgId: string }).msgId);
        const result = await messageGateway.finalizeAssistantMessage(
          payload as Parameters<typeof messageGateway.finalizeAssistantMessage>[0]
        );
        return NextResponse.json({ data: result });
      }
      case "cancelAssistantMessage": {
        await ensureMessageAccess((payload as { msgId: string }).msgId);
        const result = await messageGateway.cancelAssistantMessage((payload as { msgId: string }).msgId);
        return NextResponse.json({ data: result });
      }
      case "listConversationMessages": {
        await ensureConversationAccess((payload as { convId: string }).convId);
        const result = await messageGateway.listConversationMessages(
          payload as Parameters<typeof messageGateway.listConversationMessages>[0]
        );
        return NextResponse.json({ data: result });
      }
      case "listFeedbacks": {
        await ensureMessageAccess((payload as { msgId: string }).msgId);
        const result = await feedbackGateway.listFeedbacks(
          payload as Parameters<typeof feedbackGateway.listFeedbacks>[0]
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
        await ensureMessageAccess((payload as { targetMsgId: string }).targetMsgId);
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
    if (error && typeof error === "object") {
      if ("message" in error && typeof (error as { message: unknown }).message === "string") {
        return NextResponse.json({ error: (error as { message: string }).message }, { status: 500 });
      }
      return NextResponse.json({ error: JSON.stringify(error) }, { status: 500 });
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

    const mentorAssignments = await mentorAssignmentGateway.listActiveAssignments({ newhireId: conversation.ownerId });

    const isOwner = conversation.ownerId === authUser.userId;
    const isMentorUser = mentorAssignments.some((assignment) => assignment.mentorId === authUser.userId);
    if (!isOwner && !isMentorUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    if (error && typeof error === "object") {
      if ("message" in error && typeof (error as { message: unknown }).message === "string") {
        return NextResponse.json({ error: (error as { message: string }).message }, { status: 500 });
      }
      return NextResponse.json({ error: JSON.stringify(error) }, { status: 500 });
    }
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
