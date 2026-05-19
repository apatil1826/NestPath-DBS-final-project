create or replace function public.create_property_thread(
  target_relationship_id uuid,
  property_title text,
  property_address_line_1 text default null,
  property_city text default null,
  property_state text default null,
  property_postal_code text default null,
  property_stage public.property_stage default 'considering',
  property_is_primary boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile_id uuid := auth.uid();
  current_profile public.profiles%rowtype;
  relationship_record public.agent_relationships%rowtype;
  property_record public.properties%rowtype;
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
    raise exception 'Only agent profiles can create property channels';
  end if;

  select *
  into relationship_record
  from public.agent_relationships
  where id = target_relationship_id
    and agent_profile_id = current_profile_id
  limit 1;

  if relationship_record.id is null then
    raise exception 'Relationship not found';
  end if;

  if length(trim(coalesce(property_title, ''))) = 0 then
    raise exception 'Property title is required';
  end if;

  insert into public.properties (
    relationship_id,
    created_by_profile_id,
    title,
    address_line_1,
    city,
    state,
    postal_code,
    stage,
    is_primary
  )
  values (
    relationship_record.id,
    current_profile_id,
    trim(property_title),
    nullif(trim(coalesce(property_address_line_1, '')), ''),
    nullif(trim(coalesce(property_city, '')), ''),
    nullif(trim(coalesce(property_state, '')), ''),
    nullif(trim(coalesce(property_postal_code, '')), ''),
    property_stage,
    property_is_primary
  )
  returning *
  into property_record;

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
    property_record.id,
    current_profile_id,
    'property',
    trim(property_title),
    format('Property channel for %s', trim(property_title))
  )
  returning *
  into thread_record;

  insert into public.thread_participants (thread_id, profile_id)
  values (thread_record.id, relationship_record.agent_profile_id)
  on conflict do nothing;

  if relationship_record.buyer_profile_id is not null then
    insert into public.thread_participants (thread_id, profile_id)
    values (thread_record.id, relationship_record.buyer_profile_id)
    on conflict do nothing;
  end if;

  return thread_record.id;
end;
$$;

grant execute on function public.create_property_thread(
  uuid,
  text,
  text,
  text,
  text,
  text,
  public.property_stage,
  boolean
) to authenticated;
