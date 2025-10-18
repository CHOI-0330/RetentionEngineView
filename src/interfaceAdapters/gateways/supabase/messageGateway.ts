import { randomUUID } from "crypto";

import { createServerSupabaseClient } from "../../../lib/supabaseClient";
import type { MessagePort } from "../../../application/entitle/ports";
import type { Message } from "../../../type/core";
import { mapMessageRow, type MessageRow } from "./types";

const MESSAGE_PAGE_SIZE_DEFAULT = 50;
const MESSAGE_PAGE_SIZE_MAX = 100;

export class SupabaseMessageGateway implements MessagePort {
  constructor(private readonly client = createServerSupabaseClient()) {}

  async createUserMessage(input: {
    convId: string;
    authorId: string;
    content: string;
  }): Promise<Message> {
    const { data, error } = await this.client
      .from("message")
      .insert({
        msg_id: randomUUID(),
        conv_id: input.convId,
        role: "NEW_HIRE",
        content: input.content,
        status: null,
      })
      .select()
      .single();
    if (error || !data) {
      throw error ?? new Error("Failed to create user message.");
    }
    return mapMessageRow(data as MessageRow);
  }

  async beginAssistantMessage(convId: string): Promise<Message> {
    const { data, error } = await this.client
      .from("message")
      .insert({
        msg_id: randomUUID(),
        conv_id: convId,
        role: "ASSISTANT",
        content: "",
        status: "DRAFT",
      })
      .select()
      .single();
    if (error || !data) {
      throw error ?? new Error("Failed to begin assistant message.");
    }
    return mapMessageRow(data as MessageRow);
  }

  async appendAssistantDelta(input: { msgId: string; delta: string; seqNo: number }): Promise<void> {
    const { data, error } = await this.client
      .from("message")
      .select()
      .eq("msg_id", input.msgId)
      .single();
    if (error || !data) {
      throw error ?? new Error("Assistant message not found.");
    }
    const row = data as MessageRow;
    const nextContent = `${row.content ?? ""}${input.delta}`;
    const nextStatus = row.status === "DRAFT" ? "PARTIAL" : row.status ?? "PARTIAL";
    const { error: updateError } = await this.client
      .from("message")
      .update({ content: nextContent, status: nextStatus })
      .eq("msg_id", input.msgId);
    if (updateError) {
      throw updateError;
    }
  }

  async finalizeAssistantMessage(input: { msgId: string; finalText: string }): Promise<Message> {
    const { data, error } = await this.client
      .from("message")
      .update({ content: input.finalText, status: "DONE" })
      .eq("msg_id", input.msgId)
      .select()
      .single();
    if (error || !data) {
      throw error ?? new Error("Failed to finalize assistant message.");
    }
    return mapMessageRow(data as MessageRow);
  }

  async cancelAssistantMessage(msgId: string): Promise<Message> {
    const { data, error } = await this.client
      .from("message")
      .update({ status: "CANCELLED" })
      .eq("msg_id", msgId)
      .select()
      .single();
    if (error || !data) {
      throw error ?? new Error("Failed to cancel assistant message.");
    }
    return mapMessageRow(data as MessageRow);
  }

  async listConversationMessages(input: {
    convId: string;
    cursor?: string;
    limit?: number;
  }): Promise<{ items: Message[]; nextCursor?: string; lastSeqNo?: number }> {
    const pageSize = Math.min(Math.max(input.limit ?? MESSAGE_PAGE_SIZE_DEFAULT, 1), MESSAGE_PAGE_SIZE_MAX);

    let query = this.client
      .from("message")
      .select()
      .eq("conv_id", input.convId)
      .order("created_at", { ascending: true })
      .order("msg_id", { ascending: true });

    if (input.cursor) {
      const { data: cursorRow, error: cursorError } = await this.client
        .from("message")
        .select("created_at,msg_id")
        .eq("msg_id", input.cursor)
        .single();
      if (cursorError || !cursorRow) {
        throw cursorError ?? new Error("Cursor message not found.");
      }
      query = query.lt("created_at", (cursorRow as MessageRow).created_at);
    }

    const { data, error } = await query.limit(pageSize);
    if (error || !data) {
      throw error ?? new Error("Failed to list messages.");
    }
    const items = (data as MessageRow[]).map(mapMessageRow);
    const nextCursor = items.length === pageSize ? items[0]?.msgId : undefined;
    return {
      items,
      nextCursor,
    };
  }
}
