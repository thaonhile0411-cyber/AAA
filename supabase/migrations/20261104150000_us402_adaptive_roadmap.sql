-- US-402.2: adaptive roadmap adjustment. Existing completed lessons are
-- immutable history; recalculation only annotates unfinished work and adds a
-- separate next phase.

begin;

alter table public.roadmaps
  add column if not exists current_phase integer not null default 1 check (current_phase > 0),
  add column if not exists roadmap_version integer not null default 1 check (roadmap_version > 0),
  add column if not exists last_adjustment_assessment_id uuid
    references public.placement_tests(id) on delete set null,
  add column if not exists adjustment_snapshot jsonb not null default '{}'::jsonb;

alter table public.roadmap_milestones
  add column if not exists phase_target_band numeric(2,1)
    check (phase_target_band between 1.0 and 9.0 and (phase_target_band * 2) = trunc(phase_target_band * 2)),
  add column if not exists scheduled_week integer not null default 1 check (scheduled_week > 0);

alter table public.roadmap_activities
  add column if not exists scheduled_week integer not null default 1 check (scheduled_week > 0),
  add column if not exists difficulty_band_min numeric(2,1)
    check (difficulty_band_min between 1.0 and 9.0 and (difficulty_band_min * 2) = trunc(difficulty_band_min * 2)),
  add column if not exists difficulty_band_max numeric(2,1)
    check (difficulty_band_max between 1.0 and 9.0 and (difficulty_band_max * 2) = trunc(difficulty_band_max * 2)),
  add column if not exists adjustment_kind text not null default 'standard'
    check (adjustment_kind in ('standard', 'accelerated', 'foundation_review', 'targeted_review', 'continue')),
  add constraint roadmap_activities_difficulty_range_check
    check (difficulty_band_min is null or difficulty_band_max is null or difficulty_band_min <= difficulty_band_max);

create table if not exists public.roadmap_adjustments (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_assessment_id uuid not null references public.placement_tests(id) on delete restrict,
  previous_assessment_id uuid not null references public.placement_tests(id) on delete restrict,
  version integer not null check (version > 0),
  phase_number integer not null check (phase_number > 1),
  notification text not null check (char_length(trim(notification)) > 0),
  pace_recommendation text,
  schedule_risk boolean not null default false,
  total_minutes integer not null check (total_minutes >= 0),
  weekly_budget_minutes integer not null check (weekly_budget_minutes > 0),
  reasons jsonb not null default '[]'::jsonb,
  plan_snapshot jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (roadmap_id, source_assessment_id),
  unique (roadmap_id, version)
);

create index if not exists roadmap_adjustments_roadmap_created_idx
  on public.roadmap_adjustments(roadmap_id, created_at desc);
create index if not exists roadmap_activities_scheduled_week_idx
  on public.roadmap_activities(scheduled_week, completed_at);

alter table public.roadmap_adjustments enable row level security;

create policy "roadmap_adjustments_select_own"
  on public.roadmap_adjustments for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- The API invokes this RPC with the learner's authenticated Supabase session.
-- The row lock plus the unique source assessment index makes retries safe and
-- keeps the mutation all-or-nothing.
create or replace function public.apply_roadmap_recalculation(
  p_roadmap_id uuid,
  p_source_assessment_id uuid,
  p_previous_assessment_id uuid,
  p_plan jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_roadmap public.roadmaps%rowtype;
  v_existing public.roadmap_adjustments%rowtype;
  v_adjustment_id uuid;
  v_adjustment jsonb;
  v_task jsonb;
  v_milestone_id uuid;
  v_position integer;
  v_activity_position integer;
begin
  if auth.uid() is null then
    raise exception 'AuthenticationRequired';
  end if;

  select * into v_roadmap
  from public.roadmaps
  where id = p_roadmap_id
    and user_id = auth.uid()
    and status = 'active'
  for update;

  if not found then
    raise exception 'RoadmapNotFoundOrForbidden';
  end if;

  if not exists (
    select 1 from public.placement_tests
    where id = p_source_assessment_id
      and user_id = auth.uid()
      and assessment_kind = 'reassessment'
      and status = 'completed'
  ) or not exists (
    select 1 from public.placement_tests
    where id = p_previous_assessment_id
      and user_id = auth.uid()
      and status = 'completed'
  ) then
    raise exception 'AssessmentNotOwnedOrIncomplete';
  end if;

  if p_source_assessment_id = p_previous_assessment_id then
    raise exception 'AssessmentCannotBeItsOwnBaseline';
  end if;

  select * into v_existing
  from public.roadmap_adjustments
  where roadmap_id = p_roadmap_id
    and source_assessment_id = p_source_assessment_id;

  if found then
    return jsonb_build_object(
      'adjustmentId', v_existing.id,
      'idempotent', true,
      'phaseNumber', v_existing.phase_number,
      'notification', v_existing.notification
    );
  end if;

  if jsonb_typeof(p_plan -> 'adjustments') <> 'array'
    or jsonb_typeof(p_plan -> 'tasks') <> 'array'
    or coalesce((p_plan ->> 'phaseNumber')::integer, 0) <= v_roadmap.current_phase then
    raise exception 'InvalidAdaptivePlan';
  end if;

  -- Annotate only still-open activities. Completed records are explicitly
  -- excluded, so their completion state and their historic difficulty remain.
  for v_adjustment in select value from jsonb_array_elements(p_plan -> 'adjustments') loop
    update public.roadmap_activities a
    set difficulty_band_min = (v_adjustment ->> 'difficultyBandMin')::numeric,
        difficulty_band_max = (v_adjustment ->> 'difficultyBandMax')::numeric,
        adjustment_kind = v_adjustment ->> 'kind'
    from public.roadmap_milestones m
    where m.id = a.milestone_id
      and m.roadmap_id = v_roadmap.id
      and a.completed_at is null
      and a.skill = v_adjustment ->> 'skill';
  end loop;

  insert into public.roadmap_adjustments (
    roadmap_id, user_id, source_assessment_id, previous_assessment_id,
    version, phase_number, notification, pace_recommendation, schedule_risk,
    total_minutes, weekly_budget_minutes, reasons, plan_snapshot
  ) values (
    v_roadmap.id, auth.uid(), p_source_assessment_id, p_previous_assessment_id,
    v_roadmap.roadmap_version + 1, (p_plan ->> 'phaseNumber')::integer,
    p_plan ->> 'notification', nullif(p_plan ->> 'paceRecommendation', ''),
    coalesce((p_plan ->> 'scheduleRisk')::boolean, false),
    coalesce((p_plan ->> 'totalMinutes')::integer, 0),
    (p_plan ->> 'weeklyBudgetMinutes')::integer,
    coalesce(p_plan -> 'adjustments', '[]'::jsonb), p_plan
  ) returning id into v_adjustment_id;

  select coalesce(max(position), 0) into v_position
  from public.roadmap_milestones
  where roadmap_id = v_roadmap.id;

  for v_adjustment in select value from jsonb_array_elements(p_plan -> 'adjustments') loop
    v_position := v_position + 1;
    insert into public.roadmap_milestones (
      roadmap_id, phase_number, skill, title, description, position,
      phase_target_band, scheduled_week
    ) values (
      v_roadmap.id,
      (p_plan ->> 'phaseNumber')::integer,
      v_adjustment ->> 'skill',
      'Phase ' || (p_plan ->> 'phaseNumber')::text || ' · ' || initcap(v_adjustment ->> 'skill'),
      v_adjustment ->> 'reason',
      v_position,
      (v_adjustment ->> 'phaseTargetBand')::numeric,
      (p_plan ->> 'phaseNumber')::integer
    ) returning id into v_milestone_id;

    v_activity_position := 0;
    for v_task in
      select value from jsonb_array_elements(p_plan -> 'tasks')
      where value ->> 'skill' = v_adjustment ->> 'skill'
    loop
      v_activity_position := v_activity_position + 1;
      insert into public.roadmap_activities (
        milestone_id, resource_slug, skill, title, description, position,
        estimated_minutes, scheduled_week, difficulty_band_min,
        difficulty_band_max, adjustment_kind
      ) values (
        v_milestone_id, v_task ->> 'resourceSlug', v_task ->> 'skill',
        v_task ->> 'title', v_task ->> 'description', v_activity_position,
        (v_task ->> 'estimatedMinutes')::integer,
        (p_plan ->> 'phaseNumber')::integer,
        (v_task ->> 'difficultyBandMin')::numeric,
        (v_task ->> 'difficultyBandMax')::numeric,
        v_task ->> 'kind'
      );
    end loop;
  end loop;

  update public.roadmaps
  set current_phase = (p_plan ->> 'phaseNumber')::integer,
      roadmap_version = roadmap_version + 1,
      last_adjustment_assessment_id = p_source_assessment_id,
      adjustment_snapshot = p_plan
  where id = v_roadmap.id;

  return jsonb_build_object(
    'adjustmentId', v_adjustment_id,
    'idempotent', false,
    'phaseNumber', (p_plan ->> 'phaseNumber')::integer,
    'notification', p_plan ->> 'notification'
  );
end;
$$;

revoke all on function public.apply_roadmap_recalculation(uuid, uuid, uuid, jsonb) from public;
grant execute on function public.apply_roadmap_recalculation(uuid, uuid, uuid, jsonb) to authenticated;

comment on table public.roadmap_adjustments is
  'US-402.2 immutable adjustment audit. One reassessment may adjust one roadmap only once.';

commit;
