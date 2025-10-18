import { createServerSupabaseClient } from "../../../lib/supabaseClient";
import type { MentorDashboardPort, StudentSummary } from "../../../application/entitle/ports";
import {
  mapConversationRow,
  mapMessageRow,
  type ConversationRow,
  type MessageRow,
  type MentorAssignmentRow,
  type UserRow,
} from "./types";

export class SupabaseMentorDashboardGateway implements MentorDashboardPort {
  constructor(private readonly client = createServerSupabaseClient()) {}

  async listStudentSummaries(input: { mentorId: string }): Promise<StudentSummary[]> {
    const { data: assignments, error: assignmentError } = await this.client
      .from("mentor_assignment")
      .select("mentor_id,newhire_id,created_at,revoked_at")
      .eq("mentor_id", input.mentorId)
      .is("revoked_at", null);

    if (assignmentError || !assignments) {
      throw assignmentError ?? new Error("Failed to fetch mentor assignments.");
    }

    if (assignments.length === 0) {
      return [];
    }

    const assignmentRows = assignments as MentorAssignmentRow[];
    const newhireIds = assignmentRows.map((assignment) => assignment.newhire_id);

    const { data: users, error: userError } = await this.client.from("user").select().in("user_id", newhireIds);
    if (userError || !users) {
      throw userError ?? new Error("Failed to load users for dashboard.");
    }

    const userRows = users as UserRow[];
    const userMap = new Map(userRows.map((user) => [user.user_id, user]));

    const { data: conversations, error: conversationError } = await this.client
      .from("conversation")
      .select()
      .in("owner_id", newhireIds)
      .order("last_active_at", { ascending: false });
    if (conversationError || !conversations) {
      throw conversationError ?? new Error("Failed to load conversations.");
    }

    const conversationRows = conversations as ConversationRow[];
    const conversationMap = new Map<string, ConversationRow>();
    for (const conversation of conversationRows) {
      if (!conversationMap.has(conversation.owner_id)) {
        conversationMap.set(conversation.owner_id, conversation);
      }
    }

    const summaries: StudentSummary[] = [];
    for (const assignment of assignmentRows) {
      const user = userMap.get(assignment.newhire_id);
      if (!user) {
        continue;
      }

      const conversationRow = conversationMap.get(assignment.newhire_id);
      if (!conversationRow) {
        continue;
      }

      const conversation = mapConversationRow(conversationRow);

      const { data: recentMessages } = await this.client
        .from("message")
        .select()
        .eq("conv_id", conversation.convId)
        .order("created_at", { ascending: false })
        .order("msg_id", { ascending: false })
        .limit(1);

      const recentMessage = recentMessages && recentMessages.length > 0 ? mapMessageRow(recentMessages[0] as MessageRow) : undefined;

      const { count: totalChats, error: countError } = await this.client
        .from("message")
        .select("msg_id", { count: "exact", head: true })
        .eq("conv_id", conversation.convId);
      if (countError) {
        throw countError;
      }

      let needsReview = false;
      if (recentMessage?.role === "ASSISTANT") {
        const { count: feedbackCount } = await this.client
          .from("feedback")
          .select("fb_id", { count: "exact", head: true })
          .eq("target_msg_id", recentMessage.msgId);
        needsReview = (feedbackCount ?? 0) === 0;
      }

      summaries.push({
        newhire: {
          userId: user.user_id,
          role: user.role,
          displayName: user.display_name,
          email: user.email,
          createdAt: user.created_at,
          disabledAt: user.disabled_at ?? undefined,
        },
        conversation,
        recentMessage,
        needsReview,
        totalChats: totalChats ?? 0,
        lastActivityAt: conversation.lastActiveAt,
      });
    }

    return summaries;
  }

  async submitFeedbackQuality(_input: { mentorId: string; studentId: string; isPositive: boolean }): Promise<void> {
    return Promise.resolve();
  }
}
