-- US-401.2: timezone-aware streaks are derived from immutable completion logs.
-- A counter is deliberately not stored: deriving it keeps retries and duplicate
-- events from ever incrementing a streak twice.
begin;

alter table public.profiles
  add column if not exists time_zone text not null default 'Asia/Ho_Chi_Minh';

comment on column public.profiles.time_zone is
  'IANA timezone last reported by the authenticated learner browser; used for local study-day and streak calculations.';

create index if not exists activity_completion_user_time
  on public.user_activity_logs (user_id, occurred_at desc)
  where event_type = 'completed';

create or replace function public.set_user_time_zone(p_time_zone text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized text := btrim(coalesce(p_time_zone, ''));
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if char_length(normalized) not between 1 and 64
    or not exists (
      select 1 from pg_catalog.pg_timezone_names where name = normalized
    ) then
    raise exception 'Invalid IANA timezone' using errcode = '22023';
  end if;

  update public.profiles
  set time_zone = normalized
  where id = auth.uid()
    and time_zone is distinct from normalized;

  return normalized;
end;
$$;

revoke all on function public.set_user_time_zone(text) from public;
grant execute on function public.set_user_time_zone(text) to authenticated;

create or replace function public.dashboard_overview()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
with recursive
viewer as (
  select case
    when exists (
      select 1 from pg_catalog.pg_timezone_names where name = p.time_zone
    ) then p.time_zone
    else 'UTC'
  end as time_zone
  from public.profiles p
  where p.id = auth.uid()
),
viewer_time as (
  select coalesce((select time_zone from viewer), 'UTC') as time_zone
),
today as (
  select (now() at time zone time_zone)::date as local_date, time_zone
  from viewer_time
),
tasks as (
  select * from public.user_roadmaps where user_id = auth.uid() and status = 'active'
),
stats as (
  select count(*) total, count(completed_at) completed from tasks
),
active_days as (
  select distinct (log.occurred_at at time zone today.time_zone)::date as local_date
  from public.user_activity_logs log cross join today
  where log.user_id = auth.uid() and log.event_type = 'completed'
),
streak_anchor as (
  select case
    when exists (select 1 from active_days where local_date = today.local_date)
      then today.local_date
    when exists (select 1 from active_days where local_date = today.local_date - 1)
      then today.local_date - 1
    else null
  end as local_date
  from today
),
streak_days(local_date) as (
  select local_date from streak_anchor where local_date is not null
  union all
  select streak_days.local_date - 1
  from streak_days
  where exists (
    select 1 from active_days
    where active_days.local_date = streak_days.local_date - 1
  )
),
week_days as (
  select series::date as local_date
  from today,
  generate_series(today.local_date - 6, today.local_date, interval '1 day') series
),
week_activity as (
  select week_days.local_date, count(log.id)::integer as completions
  from week_days
  left join public.user_activity_logs log
    on log.user_id = auth.uid()
    and log.event_type = 'completed'
    and (log.occurred_at at time zone (select time_zone from today))::date = week_days.local_date
  group by week_days.local_date
)
select jsonb_build_object(
  'totalSeconds', coalesce((select sum(active_seconds) from public.user_activity_logs where user_id = auth.uid()), 0),
  'total', stats.total,
  'completed', stats.completed,
  'targetBand', (select target_band from public.learning_goals where user_id = auth.uid()),
  'currentBand', (select estimated_band from public.placement_attempts where user_id = auth.uid() and status = 'completed' order by completed_at desc limit 1),
  'assessmentDate', (select completed_at from public.placement_attempts where user_id = auth.uid() and status = 'completed' order by completed_at desc limit 1),
  'placementResult', (select jsonb_build_object('overallBand', overall_band, 'results', assessment_results, 'date', updated_at, 'kind', assessment_kind)
    from public.placement_tests where user_id = auth.uid() and status = 'completed' and assessment_results is not null order by updated_at desc limit 1),
  'streak', jsonb_build_object(
    'current', (select count(*) from streak_days),
    'todayActive', exists (select 1 from active_days where local_date = (select local_date from today)),
    'localDate', (select local_date::text from today),
    'timeZone', (select time_zone from today),
    'week', coalesce((select jsonb_agg(jsonb_build_object(
      'date', local_date::text,
      'completions', completions,
      'active', completions > 0
    ) order by local_date) from week_activity), '[]'::jsonb)
  ),
  'tasks', coalesce((select jsonb_agg(t order by t.scheduled_date, t.milestone_position, t.position) from (
    select task_id, title, skill, resource_slug, scheduled_date, milestone_position, position from tasks
    where completed_at is null and scheduled_date <= (select local_date from today)
  ) t), '[]'::jsonb),
  'unscheduled', coalesce((select jsonb_agg(t) from (
    select task_id, title, skill, resource_slug, scheduled_date from tasks where completed_at is null
    order by scheduled_date, milestone_position, position limit 1
  ) t), '[]'::jsonb)
) from stats;
$$;

revoke all on function public.dashboard_overview() from public;
grant execute on function public.dashboard_overview() to authenticated;

commit;
