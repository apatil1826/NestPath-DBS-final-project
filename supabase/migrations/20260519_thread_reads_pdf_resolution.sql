create table public.thread_reads (
  thread_id uuid not null references public.threads (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default timezone('utc', now()),
  primary key (thread_id, profile_id)
);

create index thread_reads_profile_id_last_read_at_idx
on public.thread_reads (profile_id, last_read_at desc);

alter table public.thread_reads enable row level security;

create policy "thread participants can read thread reads"
on public.thread_reads
for select
to authenticated
using (public.is_thread_participant(thread_id));

create policy "participants can upsert their own thread reads"
on public.thread_reads
for insert
to authenticated
with check (
  public.is_thread_participant(thread_id)
  and profile_id = auth.uid()
);

create policy "participants can update their own thread reads"
on public.thread_reads
for update
to authenticated
using (
  public.is_thread_participant(thread_id)
  and profile_id = auth.uid()
)
with check (
  public.is_thread_participant(thread_id)
  and profile_id = auth.uid()
);

alter table public.pdf_annotations
add column resolved_at timestamptz,
add column resolved_by_profile_id uuid references public.profiles (id) on delete set null;

create policy "thread participants can resolve pdf annotations"
on public.pdf_annotations
for update
to authenticated
using (public.is_thread_participant(thread_id))
with check (public.is_thread_participant(thread_id));

alter publication supabase_realtime add table public.thread_reads;
