import { createServerSupabaseClient } from "../../../lib/supabaseClient";
import type { MentorAssignmentPort } from "../../../application/entitle/ports";
import type { MentorAssignment } from "../../../type/core";
import { mapMentorAssignmentRow, type MentorAssignmentRow } from "./types";

export class SupabaseMentorAssignmentGateway implements MentorAssignmentPort {
  constructor(private readonly client = createServerSupabaseClient()) {}

  async listActiveAssignments(input: { mentorId?: string; newhireId?: string }): Promise<MentorAssignment[]> {
    let query = this.client.from("mentor_assignment").select().is("revoked_at", null);

    if (input.mentorId) {
      query = query.eq("mentor_id", input.mentorId);
    }
    if (input.newhireId) {
      query = query.eq("newhire_id", input.newhireId);
    }

    const { data, error } = await query;
    if (error || !data) {
      throw error ?? new Error("Failed to list mentor assignments.");
    }

    return (data as MentorAssignmentRow[]).map(mapMentorAssignmentRow);
  }
}
