alter table public.agent_relationships
  alter column buyer_profile_id drop not null;

alter table public.invites
  add column if not exists buyer_full_name text;

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
