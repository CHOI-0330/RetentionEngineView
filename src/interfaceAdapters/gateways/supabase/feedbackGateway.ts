import { randomUUID } from "crypto";

import { createServerSupabaseClient } from "../../../lib/supabaseClient";
import type { FeedbackPort } from "../../../application/entitle/ports";
import type { ValidatedFeedback } from "../../../application/entitle/models";
import type { Feedback } from "../../../type/core";
import { mapFeedbackRow, type FeedbackRow } from "./types";

const FEEDBACK_PAGE_SIZE_DEFAULT = 50;
const FEEDBACK_PAGE_SIZE_MAX = 100;

export class SupabaseFeedbackGateway implements FeedbackPort {
  constructor(private readonly client = createServerSupabaseClient()) {}

  async createFeedback(input: ValidatedFeedback & { visibility?: "ALL" | "OWNER_ONLY" | "MENTOR_ONLY" }): Promise<Feedback> {
    const { count, error: countError } = await this.client
      .from("feedback")
      .select("fb_id", { count: "exact", head: true })
      .eq("target_msg_id", input.targetMsgId);
    if (countError) {
      throw countError;
    }
    if ((count ?? 0) > 0) {
      throw new Error("Feedback already exists for this message.");
    }
    const { data, error } = await this.client
      .from("feedback")
      .insert({
        fb_id: randomUUID(),
        target_msg_id: input.targetMsgId,
        author_id: input.authorId,
        author_role: input.authorRole,
        content: input.content,
        visibility: input.visibility ?? null,
      })
      .select()
      .single();
    if (error || !data) {
      throw error ?? new Error("Failed to create feedback.");
    }
    return mapFeedbackRow(data as FeedbackRow);
  }

  async listFeedbacks(input: {
    msgId: string;
    cursor?: string;
    limit?: number;
  }): Promise<{ items: Feedback[]; nextCursor?: string }> {
    const pageSize = Math.min(Math.max(input.limit ?? FEEDBACK_PAGE_SIZE_DEFAULT, 1), FEEDBACK_PAGE_SIZE_MAX);

    let query = this.client
      .from("feedback")
      .select()
      .eq("target_msg_id", input.msgId)
      .order("created_at", { ascending: false })
      .order("fb_id", { ascending: false });

    if (input.cursor) {
      const { data: cursorRow, error: cursorError } = await this.client
        .from("feedback")
        .select("created_at,fb_id")
        .eq("fb_id", input.cursor)
        .single();
      if (cursorError || !cursorRow) {
        throw cursorError ?? new Error("Cursor feedback not found.");
      }
      query = query.lt("created_at", (cursorRow as FeedbackRow).created_at);
    }

    const { data, error } = await query.limit(pageSize);
    if (error || !data) {
      throw error ?? new Error("Failed to list feedbacks.");
    }
    const items = (data as FeedbackRow[]).map(mapFeedbackRow);
    const nextCursor = items.length === pageSize ? items[items.length - 1]?.fbId : undefined;
    return { items, nextCursor };
  }

  async updateFeedback(input: { feedbackId: string; content: string }): Promise<Feedback> {
    const { data, error } = await this.client
      .from("feedback")
      .update({ content: input.content, updated_at: new Date().toISOString() })
      .eq("fb_id", input.feedbackId)
      .select()
      .single();
    if (error || !data) {
      throw error ?? new Error("Failed to update feedback.");
    }
    return mapFeedbackRow(data as FeedbackRow);
  }
}
