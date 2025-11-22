-- Users
create table if not exists "user" (
  user_id uuid primary key,
  role text not null check (role in ('NEW_HIRE','MENTOR','ADMIN')),
  display_name text not null,
  email text not null unique,
  created_at timestamptz not null default now(),
  disabled_at timestamptz
);

-- Conversations owned by new hires
create table if not exists conversation (
  conv_id uuid primary key,
  owner_id uuid not null,
  title text not null,
  state text not null check (state in ('ACTIVE','ARCHIVED')),
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  archived_at timestamptz
);
create index if not exists idx_conversation_owner_last_active on conversation(owner_id, last_active_at desc, conv_id);

-- Messages inside conversations
create table if not exists message (
  msg_id uuid primary key,
  conv_id uuid not null references conversation(conv_id) on delete cascade,
  role text not null check (role in ('NEW_HIRE','ASSISTANT')),
  status text check (status in ('DRAFT','PARTIAL','DONE','CANCELLED')),
  content text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_message_conv_created on message(conv_id, created_at, msg_id);
create index if not exists idx_message_role on message(role);

-- Keep conversation.last_active_at in sync when messages are inserted
create or replace function set_conversation_last_active()
returns trigger as $$
begin
  update conversation
    set last_active_at = now()
  where conv_id = new.conv_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_message_set_last_active on message;
create trigger trg_message_set_last_active
after insert on message
for each row
execute function set_conversation_last_active();

-- Feedback from mentors/new hires about assistant replies
create table if not exists feedback (
  fb_id uuid primary key,
  target_msg_id uuid not null references message(msg_id) on delete cascade,
  author_id uuid not null,
  author_role text not null check (author_role in ('MENTOR','NEW_HIRE')),
  content text not null,
  visibility text check (visibility in ('ALL','OWNER_ONLY','MENTOR_ONLY')),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists idx_feedback_target_created on feedback(target_msg_id, created_at desc, fb_id);

-- Mentor ↔ New hire assignment
create table if not exists mentor_assignment (
  mentor_id uuid not null,
  newhire_id uuid not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_by uuid,
  note text,
  primary key (mentor_id, newhire_id)
);
create index if not exists idx_mentor_assignment_newhire_active on mentor_assignment(newhire_id) where revoked_at is null;
create index if not exists idx_mentor_assignment_mentor_active on mentor_assignment(mentor_id) where revoked_at is null;

-- LLM runtimes (remote/local)
create table if not exists llm_runtime (
  runtime_id uuid primary key,
  kind text not null check (kind in ('remote','local')),
  adapter text not null,
  endpoint text not null,
  model_path text,
  auth_ref text,
  headers jsonb,
  settings jsonb,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

-- Model configurations bound to runtime
create table if not exists model_config (
  model_id uuid primary key,
  runtime_id uuid not null references llm_runtime(runtime_id),
  name text not null,
  params jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists uq_model_config_default on model_config(runtime_id, is_default) where is_default = true;
