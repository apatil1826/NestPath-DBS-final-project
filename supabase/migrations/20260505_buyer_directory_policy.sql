create or replace function public.is_agent_profile()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'agent'
  );
$$;

grant execute on function public.is_agent_profile() to authenticated;

create policy "agents can read buyer profiles for directory"
on public.profiles
for select
to authenticated
using (
  public.is_agent_profile()
  and role = 'buyer'
);

