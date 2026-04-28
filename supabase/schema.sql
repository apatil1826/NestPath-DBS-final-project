create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.profile_role as enum ('agent', 'buyer');
create type public.relationship_status as enum ('invited', 'active', 'archived');
create type public.property_stage as enum (
  'considering',
  'touring',
  'offer',
  'under_contract',
  'closed',
  'paused'
);
create type public.thread_kind as enum ('direct', 'property');
create type public.invite_channel as enum ('email', 'link');
create type public.invite_status as enum ('pending', 'accepted', 'revoked', 'expired');
create type public.message_kind as enum ('user', 'system');
create type public.action_item_status as enum ('open', 'in_progress', 'done');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.profile_role not null,
  full_name text not null,
  email citext not null unique,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.agent_relationships (
  id uuid primary key default gen_random_uuid(),
  agent_profile_id uuid not null references public.profiles (id) on delete cascade,
  buyer_profile_id uuid references public.profiles (id) on delete cascade,
  status public.relationship_status not null default 'invited',
  created_at timestamptz not null default timezone('utc', now()),
  activated_at timestamptz,
  unique (agent_profile_id, buyer_profile_id),
  check (agent_profile_id <> buyer_profile_id)
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.agent_relationships (id) on delete cascade,
  created_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  title text not null,
  address_line_1 text,
  city text,
  state text,
  postal_code text,
  stage public.property_stage not null default 'considering',
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.threads (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.agent_relationships (id) on delete cascade,
  property_id uuid references public.properties (id) on delete set null,
  created_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  kind public.thread_kind not null,
  title text not null,
  summary text,
  last_message_preview text,
  last_message_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  check (
    (kind = 'direct' and property_id is null) or
    (kind = 'property' and property_id is not null)
  )
);

create table public.thread_participants (
  thread_id uuid not null references public.threads (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (thread_id, profile_id)
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.agent_relationships (id) on delete cascade,
  property_id uuid references public.properties (id) on delete set null,
  created_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  buyer_email citext,
  buyer_full_name text,
  token text not null unique,
  channel public.invite_channel not null,
  status public.invite_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_by_profile_id uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  check ((channel = 'email' and buyer_email is not null) or channel = 'link')
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  sender_profile_id uuid references public.profiles (id) on delete set null,
  kind public.message_kind not null default 'user',
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.action_items (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.agent_relationships (id) on delete cascade,
  thread_id uuid references public.threads (id) on delete set null,
  property_id uuid references public.properties (id) on delete set null,
  assignee_profile_id uuid references public.profiles (id) on delete set null,
  title text not null,
  status public.action_item_status not null default 'open',
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.sync_thread_after_message()
returns trigger
language plpgsql
as $$
begin
  update public.threads
  set
    last_message_preview = left(new.body, 180),
    last_message_at = new.created_at
  where id = new.thread_id;

  return new;
end;
$$;

create or replace function public.is_relationship_member(target_relationship_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.agent_relationships relationship
    where relationship.id = target_relationship_id
      and auth.uid() in (relationship.agent_profile_id, relationship.buyer_profile_id)
  );
$$;

create or replace function public.is_thread_participant(target_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.thread_participants participant
    where participant.thread_id = target_thread_id
      and participant.profile_id = auth.uid()
  );
$$;

create or replace function public.get_invite_preview(target_token text)
returns table (
  invite_id uuid,
  relationship_id uuid,
  channel public.invite_channel,
  status public.invite_status,
  buyer_email citext,
  buyer_full_name text,
  property_title text,
  property_address text,
  thread_title text,
  agent_name text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    invite.id,
    invite.relationship_id,
    invite.channel,
    invite.status,
    invite.buyer_email,
    invite.buyer_full_name,
    property.title,
    concat_ws(', ', property.address_line_1, property.city, property.state, property.postal_code),
    thread.title,
    agent.full_name,
    invite.expires_at
  from public.invites invite
  join public.agent_relationships relationship on relationship.id = invite.relationship_id
  join public.profiles agent on agent.id = relationship.agent_profile_id
  left join public.properties property on property.id = invite.property_id
  left join public.threads thread
    on thread.relationship_id = invite.relationship_id
    and (
      (invite.property_id is null and thread.kind = 'direct') or
      (invite.property_id is not null and thread.property_id = invite.property_id)
    )
  where invite.token = target_token
  limit 1;
$$;

create or replace function public.accept_invite(target_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  invite_record public.invites%rowtype;
begin
  if current_profile_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into invite_record
  from public.invites
  where token = target_token
    and status = 'pending'
    and expires_at > timezone('utc', now())
  limit 1;

  if invite_record.id is null then
    raise exception 'Invite not found or expired';
  end if;

  if invite_record.buyer_email is not null and lower(invite_record.buyer_email::text) <> current_email then
    raise exception 'Invite email does not match authenticated user';
  end if;

  update public.agent_relationships
  set
    buyer_profile_id = current_profile_id,
    status = 'active',
    activated_at = coalesce(activated_at, timezone('utc', now()))
  where id = invite_record.relationship_id
    and (buyer_profile_id is null or buyer_profile_id = current_profile_id);

  if not found then
    raise exception 'Unable to attach buyer to relationship';
  end if;

  update public.invites
  set
    accepted_by_profile_id = current_profile_id,
    accepted_at = timezone('utc', now()),
    status = 'accepted'
  where id = invite_record.id;

  insert into public.thread_participants (thread_id, profile_id)
  select thread.id, current_profile_id
  from public.threads thread
  where thread.relationship_id = invite_record.relationship_id
  on conflict do nothing;

  return invite_record.relationship_id;
end;
$$;

create trigger set_properties_updated_at
before update on public.properties
for each row
execute function public.set_row_updated_at();

create trigger sync_thread_after_message
after insert on public.messages
for each row
execute function public.sync_thread_after_message();

alter table public.profiles enable row level security;
alter table public.agent_relationships enable row level security;
alter table public.properties enable row level security;
alter table public.threads enable row level security;
alter table public.thread_participants enable row level security;
alter table public.invites enable row level security;
alter table public.messages enable row level security;
alter table public.action_items enable row level security;

create policy "profiles are viewable by relationship members"
on public.profiles
for select
to authenticated
using (
  id = auth.uid() or exists (
    select 1
    from public.agent_relationships relationship
    where auth.uid() in (relationship.agent_profile_id, relationship.buyer_profile_id)
      and profiles.id in (relationship.agent_profile_id, relationship.buyer_profile_id)
  )
);

create policy "users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "relationship members can read their relationship"
on public.agent_relationships
for select
to authenticated
using (public.is_relationship_member(id));

create policy "agents can create relationships"
on public.agent_relationships
for insert
to authenticated
with check (agent_profile_id = auth.uid());

create policy "relationship members can read properties"
on public.properties
for select
to authenticated
using (public.is_relationship_member(relationship_id));

create policy "relationship members can manage properties"
on public.properties
for all
to authenticated
using (public.is_relationship_member(relationship_id))
with check (public.is_relationship_member(relationship_id));

create policy "relationship members can read threads"
on public.threads
for select
to authenticated
using (public.is_relationship_member(relationship_id));

create policy "relationship members can create threads"
on public.threads
for insert
to authenticated
with check (
  public.is_relationship_member(relationship_id)
  and created_by_profile_id = auth.uid()
);

create policy "thread participants can read thread participants"
on public.thread_participants
for select
to authenticated
using (public.is_thread_participant(thread_id));

create policy "relationship members can add thread participants"
on public.thread_participants
for insert
to authenticated
with check (
  public.is_relationship_member(
    (select thread.relationship_id from public.threads thread where thread.id = thread_id)
  )
);

create policy "relationship members can read invites"
on public.invites
for select
to authenticated
using (public.is_relationship_member(relationship_id));

create policy "agents can create invites"
on public.invites
for insert
to authenticated
with check (
  created_by_profile_id = auth.uid()
  and exists (
    select 1
    from public.agent_relationships relationship
    where relationship.id = relationship_id
      and relationship.agent_profile_id = auth.uid()
  )
);

create policy "thread participants can read messages"
on public.messages
for select
to authenticated
using (public.is_thread_participant(thread_id));

create policy "thread participants can send messages"
on public.messages
for insert
to authenticated
with check (
  public.is_thread_participant(thread_id)
  and sender_profile_id = auth.uid()
);

create policy "relationship members can read action items"
on public.action_items
for select
to authenticated
using (public.is_relationship_member(relationship_id));

create policy "relationship members can manage action items"
on public.action_items
for all
to authenticated
using (public.is_relationship_member(relationship_id))
with check (public.is_relationship_member(relationship_id));

alter publication supabase_realtime add table public.messages;
