create table public.writing_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('practice', 'placement')),
  prompt_id text not null,
  version_hash text not null,
  essay text not null check (char_length(essay) between 1 and 8000),
  word_count integer not null check (word_count > 0),
  status text not null check (status in ('processing', 'completed', 'failed')),
  attempt_token uuid not null,
  lease_expires_at timestamptz not null,
  assessment jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, source, prompt_id, version_hash),
  check (
    (status = 'completed' and assessment is not null and jsonb_typeof(assessment) = 'object')
    or (status in ('processing', 'failed') and assessment is null)
  )
);

create index writing_submissions_user_source_created_idx
  on public.writing_submissions (user_id, source, created_at desc);

alter table public.writing_submissions enable row level security;
revoke all on public.writing_submissions from public, anon, authenticated;
grant select on public.writing_submissions to authenticated;
grant select, insert, update on public.writing_submissions to service_role;

create policy writing_submissions_select_own
  on public.writing_submissions for select to authenticated
  using ((select auth.uid()) = user_id);
