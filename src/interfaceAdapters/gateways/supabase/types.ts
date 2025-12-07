import type {
  AssistantStatus,
  Feedback,
  FeedbackAuthorRole,
  Message,
  MessageRole,
  Conversation,
  MentorAssignment,
  User,
  AvatarSettings,
  AvatarGender,
  AvatarPersonality,
  AvatarGenerationStatus,
} from "../../../domain/core";

export interface MessageRow {
  msg_id: string;
  conv_id: string;
  role: MessageRole;
  content: string;
  status: AssistantStatus | null;
  created_at: string;
}

export interface FeedbackRow {
  fb_id: string;
  target_msg_id: string;
  author_id: string;
  author_role: FeedbackAuthorRole;
  content: string;
  visibility: Feedback["visibility"] | null;
  created_at: string;
  updated_at: string | null;
}

export interface ConversationRow {
  conv_id: string;
  owner_id: string;
  title: string;
  state: Conversation["state"];
  created_at: string;
  last_active_at: string;
  archived_at: string | null;
}

export interface MentorAssignmentRow {
  mentor_id: string;
  newhire_id: string;
  created_at: string;
  revoked_at: string | null;
  created_by: string | null;
  note: string | null;
}

export interface UserRow {
  user_id: string;
  display_name: string;
  email: string;
  role: "NEW_HIRE" | "MENTOR" | "ADMIN";
  created_at: string;
  disabled_at: string | null;
}

export const mapUserRow = (row: UserRow): User => ({
  userId: row.user_id,
  role: row.role,
  displayName: row.display_name,
  email: row.email,
  createdAt: row.created_at,
  disabledAt: row.disabled_at ?? undefined,
});

export const mapMessageRow = (row: MessageRow): Message => ({
  msgId: row.msg_id,
  convId: row.conv_id,
  role: row.role,
  content: row.content,
  status: row.status ?? undefined,
  createdAt: row.created_at,
});

export const mapFeedbackRow = (row: FeedbackRow): Feedback => ({
  fbId: row.fb_id,
  targetMsgId: row.target_msg_id,
  authorId: row.author_id,
  authorRole: row.author_role,
  content: row.content,
  visibility: row.visibility ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at ?? undefined,
});

export const mapConversationRow = (row: ConversationRow): Conversation => ({
  convId: row.conv_id,
  ownerId: row.owner_id,
  title: row.title,
  state: row.state,
  createdAt: row.created_at,
  lastActiveAt: row.last_active_at,
  archivedAt: row.archived_at ?? undefined,
});

export const mapMentorAssignmentRow = (row: MentorAssignmentRow): MentorAssignment => ({
  mentorId: row.mentor_id,
  newhireId: row.newhire_id,
  createdAt: row.created_at,
  revokedAt: row.revoked_at ?? undefined,
  createdBy: row.created_by ?? undefined,
  note: row.note ?? undefined,
});

// ===== Avatar Settings =====

export interface AvatarSettingsRow {
  id: string;
  user_id: string;
  gender: AvatarGender;
  personality_preset: AvatarPersonality;
  is_generated: boolean;
  generation_status: AvatarGenerationStatus;
  generation_progress: number;
  generation_seed: string | null;
  created_at: string;
  updated_at: string;
}

export const mapAvatarSettingsRow = (row: AvatarSettingsRow): AvatarSettings => ({
  id: row.id,
  userId: row.user_id,
  gender: row.gender,
  personalityPreset: row.personality_preset,
  isGenerated: row.is_generated,
  generationStatus: row.generation_status,
  generationProgress: row.generation_progress,
  generationSeed: row.generation_seed ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
