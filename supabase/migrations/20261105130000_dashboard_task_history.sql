-- Dashboard history reads the same roadmap_activities rows as today's tasks.

begin;

create or replace function public.dashboard_overview()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
with recursive
viewer as (
  select case when exists (
    select 1 from pg_catalog.pg_timezone_names where name = p.time_zone
  ) then p.time_zone else 'UTC' end as time_zone
  from public.profiles p where p.id = auth.uid()
),
viewer_time as (select coalesce((select time_zone from viewer), 'UTC') as time_zone),
today as (select (now() at time zone time_zone)::date as local_date, time_zone from viewer_time),
tasks as (select * from public.user_roadmaps where user_id = auth.uid() and status = 'active'),
stats as (select count(*) total, count(completed_at) completed from tasks),
active_days as (
  select distinct (log.occurred_at at time zone today.time_zone)::date as local_date
  from public.user_activity_logs log cross join today
  where log.user_id = auth.uid() and log.event_type = 'completed'
),
streak_anchor as (
  select case
    when exists (select 1 from active_days where local_date = today.local_date) then today.local_date
    when exists (select 1 from active_days where local_date = today.local_date - 1) then today.local_date - 1
    else null end as local_date
  from today
),
streak_days(local_date) as (
  select local_date from streak_anchor where local_date is not null
  union all
  select streak_days.local_date - 1 from streak_days
  where exists (select 1 from active_days where active_days.local_date = streak_days.local_date - 1)
),
week_days as (
  select series::date as local_date from today,
  generate_series(today.local_date - 6, today.local_date, interval '1 day') series
),
week_activity as (
  select week_days.local_date, count(log.id)::integer as completions
  from week_days left join public.user_activity_logs log
    on log.user_id = auth.uid() and log.event_type = 'completed'
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
    'week', coalesce((select jsonb_agg(jsonb_build_object('date', local_date::text, 'completions', completions, 'active', completions > 0) order by local_date) from week_activity), '[]'::jsonb)
  ),
  'tasks', coalesce((select jsonb_agg(t order by t.scheduled_date, t.milestone_position, t.position) from (
    select task_id, title, skill, resource_slug, scheduled_date, milestone_position, position from tasks
    where completed_at is null and scheduled_date <= (select local_date from today)
  ) t), '[]'::jsonb),
  'completedTasks', coalesce((select jsonb_agg(t order by t.completed_at desc) from (
    select task_id, title, skill, resource_slug, scheduled_date, completed_at
    from tasks where completed_at is not null order by completed_at desc limit 10
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
