-- Client Directory (agent-owned records)

create type public.client_status as enum ('active', 'archived');

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  agent_profile_id uuid not null references public.profiles (id) on delete cascade,
  buyer_profile_id uuid references public.profiles (id) on delete set null,
  full_name text not null,
  email citext,
  phone text,
  status public.client_status not null default 'active',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (agent_profile_id, email)
);

create trigger set_clients_updated_at
before update on public.clients
for each row execute function public.set_row_updated_at();

alter table public.clients enable row level security;

create policy "Agents can read their clients"
on public.clients
for select
to authenticated
using (agent_profile_id = auth.uid());

create policy "Agents can create clients"
on public.clients
for insert
to authenticated
with check (agent_profile_id = auth.uid());

create policy "Agents can update their clients"
on public.clients
for update
to authenticated
using (agent_profile_id = auth.uid())
with check (agent_profile_id = auth.uid());

create policy "Agents can delete their clients"
on public.clients
for delete
to authenticated
using (agent_profile_id = auth.uid());

