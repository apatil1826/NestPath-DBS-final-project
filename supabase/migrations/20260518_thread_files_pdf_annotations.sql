create table public.thread_files (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  uploaded_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  file_name text not null,
  storage_bucket text not null default 'thread-files',
  storage_path text not null unique,
  mime_type text not null,
  file_size bigint not null,
  created_at timestamptz not null default timezone('utc', now()),
  check (mime_type = 'application/pdf'),
  check (file_size > 0)
);

create index thread_files_thread_id_created_at_idx
on public.thread_files (thread_id, created_at desc);

create table public.pdf_annotations (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.thread_files (id) on delete cascade,
  thread_id uuid not null references public.threads (id) on delete cascade,
  author_profile_id uuid not null references public.profiles (id) on delete cascade,
  page_index integer not null,
  quote text not null,
  comment_text text not null,
  color text not null default '#fef08a',
  highlight_areas jsonb not null default '[]'::jsonb,
  selection_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  check (page_index >= 0)
);

create index pdf_annotations_file_id_created_at_idx
on public.pdf_annotations (file_id, created_at asc);

alter table public.thread_files enable row level security;
alter table public.pdf_annotations enable row level security;

create policy "thread participants can read thread files"
on public.thread_files
for select
to authenticated
using (public.is_thread_participant(thread_id));

create policy "thread participants can upload thread files"
on public.thread_files
for insert
to authenticated
with check (
  public.is_thread_participant(thread_id)
  and uploaded_by_profile_id = auth.uid()
);

create policy "uploaders can delete their thread files"
on public.thread_files
for delete
to authenticated
using (
  public.is_thread_participant(thread_id)
  and uploaded_by_profile_id = auth.uid()
);

create policy "thread participants can read pdf annotations"
on public.pdf_annotations
for select
to authenticated
using (public.is_thread_participant(thread_id));

create policy "thread participants can create pdf annotations"
on public.pdf_annotations
for insert
to authenticated
with check (
  public.is_thread_participant(thread_id)
  and author_profile_id = auth.uid()
);

create policy "authors can update their pdf annotations"
on public.pdf_annotations
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

create policy "authors can delete their pdf annotations"
on public.pdf_annotations
for delete
to authenticated
using (
  public.is_thread_participant(thread_id)
  and author_profile_id = auth.uid()
);

create policy "thread participants can read thread file objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'thread-files'
  and public.is_thread_participant(((storage.foldername(name))[1])::uuid)
);

create policy "thread participants can upload thread file objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'thread-files'
  and public.is_thread_participant(((storage.foldername(name))[1])::uuid)
);

create policy "thread participants can delete thread file objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'thread-files'
  and public.is_thread_participant(((storage.foldername(name))[1])::uuid)
);

alter publication supabase_realtime add table public.thread_files;
alter publication supabase_realtime add table public.pdf_annotations;
