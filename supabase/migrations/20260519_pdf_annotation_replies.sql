create table public.pdf_annotation_replies (
  id uuid primary key default gen_random_uuid(),
  annotation_id uuid not null references public.pdf_annotations (id) on delete cascade,
  file_id uuid not null references public.thread_files (id) on delete cascade,
  thread_id uuid not null references public.threads (id) on delete cascade,
  author_profile_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  check (length(trim(body)) > 0)
);

create index pdf_annotation_replies_annotation_id_created_at_idx
on public.pdf_annotation_replies (annotation_id, created_at asc);

alter table public.pdf_annotation_replies enable row level security;

create policy "thread participants can read pdf annotation replies"
on public.pdf_annotation_replies
for select
to authenticated
using (public.is_thread_participant(thread_id));

create policy "thread participants can create pdf annotation replies"
on public.pdf_annotation_replies
for insert
to authenticated
with check (
  public.is_thread_participant(thread_id)
  and author_profile_id = auth.uid()
);

create policy "authors can update their pdf annotation replies"
on public.pdf_annotation_replies
for update
to authenticated
using (
  public.is_thread_participant(thread_id)
  and author_profile_id = auth.uid()
)
with check (
  public.is_thread_participant(thread_id)
  and author_profile_id = auth.uid()
);

create policy "authors can delete their pdf annotation replies"
on public.pdf_annotation_replies
for delete
to authenticated
using (
  public.is_thread_participant(thread_id)
  and author_profile_id = auth.uid()
);

alter publication supabase_realtime add table public.pdf_annotation_replies;
