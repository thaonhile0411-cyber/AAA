-- Personalized IELTS Learning Platform
-- Initial Supabase schema for the 2-3 day MVP.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared trigger helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;

-- ---------------------------------------------------------------------------
-- User profile and onboarding goal
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (
    display_name is null or char_length(trim(display_name)) between 1 and 80
  ),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.profiles is
  'Public application profile associated one-to-one with auth.users. Contains no password data.';

create table public.learning_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  target_band numeric(2,1) not null check (
    target_band between 1.0 and 9.0
    and (target_band * 2) = trunc(target_band * 2)
  ),
  expected_exam_date date not null,
  available_minutes_per_week integer not null check (
    available_minutes_per_week between 30 and 10080
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id)
);

comment on column public.learning_goals.available_minutes_per_week is
  'Self-reported weekly availability; it does not create a fixed daily timetable.';

-- Create a profile automatically after Supabase Auth creates a user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Placement test question bank and private attempts
-- ---------------------------------------------------------------------------

create table public.placement_questions (
  id uuid primary key default gen_random_uuid(),
  skill text not null check (skill in ('reading', 'listening')),
  prompt text not null check (char_length(trim(prompt)) > 0),
  options jsonb not null check (
    jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6
  ),
  difficulty smallint not null check (difficulty between 1 and 3),
  position integer not null check (position > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (skill, position)
);

comment on table public.placement_questions is
  'Authenticated-readable placement prompts. Correct answers are deliberately stored separately.';

create table public.placement_question_keys (
  question_id uuid primary key references public.placement_questions(id) on delete cascade,
  correct_option text not null check (char_length(trim(correct_option)) > 0),
  explanation text,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.placement_question_keys is
  'Server-only answer keys. Access with a trusted server client, never a browser client.';

create table public.placement_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  reading_correct integer check (reading_correct is null or reading_correct >= 0),
  listening_correct integer check (listening_correct is null or listening_correct >= 0),
  total_questions integer check (total_questions is null or total_questions > 0),
  estimated_band numeric(2,1) check (
    estimated_band is null
    or (
      estimated_band between 1.0 and 9.0
      and (estimated_band * 2) = trunc(estimated_band * 2)
    )
  ),
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  constraint placement_attempt_completion_consistent check (
    (status = 'in_progress' and completed_at is null)
    or
    (
      status = 'completed'
      and completed_at is not null
      and reading_correct is not null
      and listening_correct is not null
      and total_questions is not null
      and estimated_band is not null
      and (reading_correct + listening_correct) <= total_questions
    )
  ),
  unique (id, user_id)
);

comment on column public.placement_attempts.estimated_band is
  'Approximate starting level for planning; it is not an official IELTS score.';

create table public.placement_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.placement_attempts(id) on delete cascade,
  question_id uuid not null references public.placement_questions(id) on delete restrict,
  selected_option text not null check (char_length(trim(selected_option)) > 0),
  is_correct boolean,
  answered_at timestamptz not null default timezone('utc', now()),
  unique (attempt_id, question_id)
);

-- ---------------------------------------------------------------------------
-- Shared learning catalog and personalized roadmaps
-- ---------------------------------------------------------------------------

create table public.learning_materials (
  id uuid primary key default gen_random_uuid(),
  skill text not null check (skill in ('listening', 'reading', 'writing', 'speaking')),
  title text not null check (char_length(trim(title)) between 1 and 160),
  summary text not null check (char_length(trim(summary)) > 0),
  material_type text not null check (
    material_type in ('lesson', 'exercise', 'checklist', 'practice_prompt')
  ),
  level_band_min numeric(2,1) not null check (
    level_band_min between 1.0 and 9.0
    and (level_band_min * 2) = trunc(level_band_min * 2)
  ),
  level_band_max numeric(2,1) not null check (
    level_band_max between 1.0 and 9.0
    and (level_band_max * 2) = trunc(level_band_max * 2)
  ),
  milestone_tag text not null check (char_length(trim(milestone_tag)) between 1 and 80),
  content text not null check (char_length(trim(content)) > 0),
  estimated_minutes integer not null check (estimated_minutes between 5 and 240),
  is_published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (level_band_min <= level_band_max)
);

create table public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid,
  placement_attempt_id uuid,
  title text not null check (char_length(trim(title)) between 1 and 160),
  summary text not null check (char_length(trim(summary)) > 0),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id),
  foreign key (goal_id, user_id)
    references public.learning_goals(id, user_id) on delete set null (goal_id),
  foreign key (placement_attempt_id, user_id)
    references public.placement_attempts(id, user_id) on delete set null (placement_attempt_id)
);

create unique index roadmaps_one_active_per_user_idx
  on public.roadmaps(user_id)
  where status = 'active';

create table public.roadmap_milestones (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps(id) on delete cascade,
  phase_number integer not null check (phase_number > 0),
  skill text not null check (skill in ('listening', 'reading', 'writing', 'speaking')),
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text not null check (char_length(trim(description)) > 0),
  position integer not null check (position > 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (roadmap_id, position)
);

create table public.roadmap_activities (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.roadmap_milestones(id) on delete cascade,
  material_id uuid references public.learning_materials(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text,
  position integer not null check (position > 0),
  estimated_minutes integer check (
    estimated_minutes is null or estimated_minutes between 5 and 240
  ),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (milestone_id, position)
);

-- Useful indexes for foreign-key joins and ownership checks used by RLS.
create index placement_attempts_user_id_idx on public.placement_attempts(user_id);
create index placement_answers_attempt_id_idx on public.placement_answers(attempt_id);
create index roadmap_milestones_roadmap_id_idx on public.roadmap_milestones(roadmap_id);
create index roadmap_activities_milestone_id_idx on public.roadmap_activities(milestone_id);
create index roadmap_activities_material_id_idx on public.roadmap_activities(material_id);
create index learning_materials_filter_idx
  on public.learning_materials(skill, level_band_min, level_band_max)
  where is_published = true;

-- Maintain updated_at without relying on application code.
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger learning_goals_set_updated_at
  before update on public.learning_goals
  for each row execute procedure public.set_updated_at();

create trigger learning_materials_set_updated_at
  before update on public.learning_materials
  for each row execute procedure public.set_updated_at();

create trigger roadmaps_set_updated_at
  before update on public.roadmaps
  for each row execute procedure public.set_updated_at();

create trigger roadmap_activities_set_updated_at
  before update on public.roadmap_activities
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.learning_goals enable row level security;
alter table public.placement_questions enable row level security;
alter table public.placement_question_keys enable row level security;
alter table public.placement_attempts enable row level security;
alter table public.placement_answers enable row level security;
alter table public.learning_materials enable row level security;
alter table public.roadmaps enable row level security;
alter table public.roadmap_milestones enable row level security;
alter table public.roadmap_activities enable row level security;

-- Profiles are created by the auth trigger. Users may read/update only their row.
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- A user has one current onboarding goal and owns its full lifecycle.
create policy "learning_goals_select_own"
  on public.learning_goals for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "learning_goals_insert_own"
  on public.learning_goals for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "learning_goals_update_own"
  on public.learning_goals for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "learning_goals_delete_own"
  on public.learning_goals for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Question prompts are shared and read-only to authenticated users.
create policy "placement_questions_read_active"
  on public.placement_questions for select
  to authenticated
  using (is_active = true);

-- placement_question_keys intentionally has no client policy. A trusted server
-- client using a Supabase secret key can access it for grading because that key
-- assumes the service_role database role, which bypasses RLS.

create policy "placement_attempts_select_own"
  on public.placement_attempts for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "placement_attempts_insert_own_ungraded"
  on public.placement_attempts for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'in_progress'
    and reading_correct is null
    and listening_correct is null
    and total_questions is null
    and estimated_band is null
    and completed_at is null
  );

create policy "placement_attempts_update_own_ungraded"
  on public.placement_attempts for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and status = 'in_progress'
    and reading_correct is null
    and listening_correct is null
    and total_questions is null
    and estimated_band is null
    and completed_at is null
  );

create policy "placement_attempts_delete_own"
  on public.placement_attempts for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "placement_answers_select_own"
  on public.placement_answers for select
  to authenticated
  using (
    exists (
      select 1
      from public.placement_attempts pa
      where pa.id = placement_answers.attempt_id
        and pa.user_id = (select auth.uid())
    )
  );

create policy "placement_answers_insert_own_ungraded"
  on public.placement_answers for insert
  to authenticated
  with check (
    is_correct is null
    and exists (
      select 1
      from public.placement_attempts pa
      where pa.id = placement_answers.attempt_id
        and pa.user_id = (select auth.uid())
        and pa.status = 'in_progress'
    )
  );

create policy "placement_answers_update_own_ungraded"
  on public.placement_answers for update
  to authenticated
  using (
    exists (
      select 1
      from public.placement_attempts pa
      where pa.id = placement_answers.attempt_id
        and pa.user_id = (select auth.uid())
        and pa.status = 'in_progress'
    )
  )
  with check (
    is_correct is null
    and exists (
      select 1
      from public.placement_attempts pa
      where pa.id = placement_answers.attempt_id
        and pa.user_id = (select auth.uid())
        and pa.status = 'in_progress'
    )
  );

create policy "placement_answers_delete_own_ungraded"
  on public.placement_answers for delete
  to authenticated
  using (
    is_correct is null
    and exists (
      select 1
      from public.placement_attempts pa
      where pa.id = placement_answers.attempt_id
        and pa.user_id = (select auth.uid())
        and pa.status = 'in_progress'
    )
  );

-- Published learning materials are authenticated-read-only. There are no
-- insert/update/delete policies for normal application users.
create policy "learning_materials_read_published"
  on public.learning_materials for select
  to authenticated
  using (is_published = true);

create policy "roadmaps_select_own"
  on public.roadmaps for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "roadmaps_insert_own"
  on public.roadmaps for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "roadmaps_update_own"
  on public.roadmaps for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "roadmaps_delete_own"
  on public.roadmaps for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "roadmap_milestones_select_own"
  on public.roadmap_milestones for select
  to authenticated
  using (
    exists (
      select 1 from public.roadmaps r
      where r.id = roadmap_milestones.roadmap_id
        and r.user_id = (select auth.uid())
    )
  );

create policy "roadmap_milestones_insert_own"
  on public.roadmap_milestones for insert
  to authenticated
  with check (
    exists (
      select 1 from public.roadmaps r
      where r.id = roadmap_milestones.roadmap_id
        and r.user_id = (select auth.uid())
    )
  );

create policy "roadmap_milestones_update_own"
  on public.roadmap_milestones for update
  to authenticated
  using (
    exists (
      select 1 from public.roadmaps r
      where r.id = roadmap_milestones.roadmap_id
        and r.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.roadmaps r
      where r.id = roadmap_milestones.roadmap_id
        and r.user_id = (select auth.uid())
    )
  );

create policy "roadmap_milestones_delete_own"
  on public.roadmap_milestones for delete
  to authenticated
  using (
    exists (
      select 1 from public.roadmaps r
      where r.id = roadmap_milestones.roadmap_id
        and r.user_id = (select auth.uid())
    )
  );

create policy "roadmap_activities_select_own"
  on public.roadmap_activities for select
  to authenticated
  using (
    exists (
      select 1
      from public.roadmap_milestones rm
      join public.roadmaps r on r.id = rm.roadmap_id
      where rm.id = roadmap_activities.milestone_id
        and r.user_id = (select auth.uid())
    )
  );

create policy "roadmap_activities_insert_own"
  on public.roadmap_activities for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.roadmap_milestones rm
      join public.roadmaps r on r.id = rm.roadmap_id
      where rm.id = roadmap_activities.milestone_id
        and r.user_id = (select auth.uid())
    )
  );

create policy "roadmap_activities_update_own"
  on public.roadmap_activities for update
  to authenticated
  using (
    exists (
      select 1
      from public.roadmap_milestones rm
      join public.roadmaps r on r.id = rm.roadmap_id
      where rm.id = roadmap_activities.milestone_id
        and r.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.roadmap_milestones rm
      join public.roadmaps r on r.id = rm.roadmap_id
      where rm.id = roadmap_activities.milestone_id
        and r.user_id = (select auth.uid())
    )
  );

create policy "roadmap_activities_delete_own"
  on public.roadmap_activities for delete
  to authenticated
  using (
    exists (
      select 1
      from public.roadmap_milestones rm
      join public.roadmaps r on r.id = rm.roadmap_id
      where rm.id = roadmap_activities.milestone_id
        and r.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Derived progress (never stored, so it cannot become stale)
-- ---------------------------------------------------------------------------

create view public.roadmap_progress
with (security_invoker = true)
as
select
  r.id as roadmap_id,
  r.user_id,
  count(ra.id)::integer as total_activities,
  count(ra.id) filter (where ra.completed_at is not null)::integer as completed_activities,
  case
    when count(ra.id) = 0 then 0.0
    else round(
      100.0 * count(ra.id) filter (where ra.completed_at is not null) / count(ra.id),
      1
    )
  end as completion_percentage
from public.roadmaps r
left join public.roadmap_milestones rm on rm.roadmap_id = r.id
left join public.roadmap_activities ra on ra.milestone_id = rm.id
group by r.id, r.user_id;

comment on view public.roadmap_progress is
  'RLS-aware derived progress: completed activities divided by all activities in a roadmap.';

revoke all on public.roadmap_progress from anon;
grant select on public.roadmap_progress to authenticated;
