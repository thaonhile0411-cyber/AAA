-- Persist a learner's writing draft per practice resource.
-- Drafts are private: each authenticated learner can read and edit only their own.

begin;

create table if not exists public.practice_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_slug text not null check (resource_slug ~ '^[a-z0-9-]{1,100}$'),
  content text not null default '' check (char_length(content) <= 10000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, resource_slug)
);

create index if not exists practice_drafts_user_updated_idx
  on public.practice_drafts(user_id, updated_at desc);

alter table public.practice_drafts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'practice_drafts'
      and policyname = 'practice_drafts_select_own'
  ) then
    create policy practice_drafts_select_own
      on public.practice_drafts for select to authenticated
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'practice_drafts'
      and policyname = 'practice_drafts_insert_own'
  ) then
    create policy practice_drafts_insert_own
      on public.practice_drafts for insert to authenticated
      with check ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'practice_drafts'
      and policyname = 'practice_drafts_update_own'
  ) then
    create policy practice_drafts_update_own
      on public.practice_drafts for update to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;
end $$;

grant select, insert, update on public.practice_drafts to authenticated;
revoke all on public.practice_drafts from anon;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'practice_drafts_set_updated_at'
      and tgrelid = 'public.practice_drafts'::regclass
  ) then
    create trigger practice_drafts_set_updated_at
      before update on public.practice_drafts
      for each row execute function public.set_updated_at();
  end if;
end $$;

commit;
