create or replace function public.create_or_open_direct_thread(target_buyer_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile_id uuid := auth.uid();
  current_profile public.profiles%rowtype;
  buyer_profile public.profiles%rowtype;
  relationship_record public.agent_relationships%rowtype;
  thread_record public.threads%rowtype;
begin
  if current_profile_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into current_profile
  from public.profiles
  where id = current_profile_id;

  if current_profile.id is null then
    raise exception 'Current profile not found';
  end if;

  if current_profile.role <> 'agent' then
    raise exception 'Only agent profiles can start a conversation';
  end if;

  select *
  into buyer_profile
  from public.profiles
  where id = target_buyer_profile_id;

  if buyer_profile.id is null then
    raise exception 'Buyer profile not found';
  end if;

  if buyer_profile.role <> 'buyer' then
    raise exception 'Target profile must be a buyer';
  end if;

  if buyer_profile.id = current_profile.id then
    raise exception 'Cannot start a conversation with yourself';
  end if;

  select *
  into relationship_record
  from public.agent_relationships
  where agent_profile_id = current_profile.id
    and buyer_profile_id = buyer_profile.id
  limit 1;

  if relationship_record.id is null then
    insert into public.agent_relationships (
      agent_profile_id,
      buyer_profile_id,
      status,
      activated_at
    )
    values (
      current_profile.id,
      buyer_profile.id,
      'active',
      timezone('utc', now())
    )
    returning *
    into relationship_record;
  elsif relationship_record.status <> 'active' then
    update public.agent_relationships
    set
      status = 'active',
      activated_at = timezone('utc', now())
    where id = relationship_record.id
    returning *
    into relationship_record;
  end if;

  select *
  into thread_record
  from public.threads
  where relationship_id = relationship_record.id
    and kind = 'direct'
  limit 1;

  if thread_record.id is null then
    insert into public.threads (
      relationship_id,
      property_id,
      created_by_profile_id,
      kind,
      title,
      summary
    )
    values (
      relationship_record.id,
      null,
      current_profile.id,
      'direct',
      buyer_profile.full_name,
      format('Direct conversation between %s and %s', current_profile.full_name, buyer_profile.full_name)
    )
    returning *
    into thread_record;
  end if;

  insert into public.thread_participants (thread_id, profile_id)
  values (thread_record.id, current_profile.id)
  on conflict do nothing;

  insert into public.thread_participants (thread_id, profile_id)
  values (thread_record.id, buyer_profile.id)
  on conflict do nothing;

  return thread_record.id;
end;
$$;

grant execute on function public.create_or_open_direct_thread(uuid) to authenticated;

