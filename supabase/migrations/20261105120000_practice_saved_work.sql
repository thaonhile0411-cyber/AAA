-- Persist responses for every original practice skill. Unlike scored Reading
-- and Listening attempts, Writing and Speaking work has no answer key and
-- therefore needs its own learner-owned draft record.
begin;

create table if not exists public.practice_saved_work (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_slug text not null check (resource_slug ~ '^[a-z0-9-]{1,100}$'),
  skill text not null check (skill in ('listening', 'reading', 'writing', 'speaking')),
  response_text text not null default '' check (char_length(response_text) <= 10000),
  audio_base64 text check (char_length(audio_base64) <= 6000000),
  audio_mime_type text check (audio_mime_type in ('audio/webm', 'audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg', 'audio/wav')),
  audio_duration_seconds integer check (audio_duration_seconds between 1 and 120),
  task_id uuid references public.roadmap_activities(id) on delete set null,
  saved_at timestamptz not null default now(),
  completed_at timestamptz,
  check (response_text <> '' or audio_base64 is not null),
  unique (user_id, resource_slug)
);

create index if not exists practice_saved_work_user_saved_idx
  on public.practice_saved_work(user_id, saved_at desc);

alter table public.practice_saved_work enable row level security;
drop policy if exists practice_saved_work_select_own on public.practice_saved_work;
create policy practice_saved_work_select_own on public.practice_saved_work
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists practice_saved_work_insert_own on public.practice_saved_work;
create policy practice_saved_work_insert_own on public.practice_saved_work
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists practice_saved_work_update_own on public.practice_saved_work;
create policy practice_saved_work_update_own on public.practice_saved_work
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

commit;
