import { createServerSupabaseClient } from "../../../lib/supabaseClient";
import type { FeedbackLookupPort } from "../../../application/entitle/ports";
import type { UserRow } from "./types";

export class SupabaseFeedbackLookupGateway implements FeedbackLookupPort {
  constructor(private readonly client = createServerSupabaseClient()) {}

  async getUserDisplayName(userId: string): Promise<string | null> {
    const { data, error } = await this.client
      .from("user")
      .select("display_name")
      .eq("user_id", userId)
      .single();
    if (error) {
      return null;
    }
    return (data as UserRow | null)?.display_name ?? null;
  }
}
