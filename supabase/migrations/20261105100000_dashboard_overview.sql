-- US-401.1: reuse US-201 roadmaps and US-302's transactional completion outbox.
begin;
alter table public.roadmap_activities
  add column if not exists scheduled_date date,
  add column if not exists scheduled_week integer not null default 1
    check (scheduled_week > 0);
-- Older generators schedule by week. Expose that date without rewriting history.
create or replace view public.user_roadmaps with (security_invoker=true) as
select r.user_id,r.id roadmap_id,r.status,a.id task_id,a.title,a.completed_at,
 coalesce(a.scheduled_date,(r.created_at at time zone 'Asia/Ho_Chi_Minh')::date+7*(a.scheduled_week-1)) scheduled_date,
 a.position,m.position milestone_position,coalesce(a.skill,m.skill) skill,a.resource_slug
from public.roadmaps r join public.roadmap_milestones m on m.roadmap_id=r.id
join public.roadmap_activities a on a.milestone_id=m.id;
revoke all on public.user_roadmaps from anon;
grant select on public.user_roadmaps to authenticated;

create table if not exists public.user_activity_logs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 task_id uuid references public.roadmap_activities(id) on delete set null,
 resource_slug text not null check(char_length(resource_slug) between 1 and 100),
 event_id uuid not null,
 event_type text not null check(event_type in ('active_time','completed')),
 active_seconds integer not null default 0 check(active_seconds between 0 and 30),
 occurred_at timestamptz not null default now(),
 unique(user_id,event_id),
 check(event_type='active_time' or active_seconds=0)
);
create unique index if not exists activity_completion_once on public.user_activity_logs(user_id,task_id) where event_type='completed' and task_id is not null;
create index if not exists activity_user_time on public.user_activity_logs(user_id,occurred_at desc);
alter table public.user_activity_logs enable row level security;
drop policy if exists activity_read_own on public.user_activity_logs;
create policy activity_read_own on public.user_activity_logs for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.user_activity_logs from anon, authenticated;
grant select on public.user_activity_logs to authenticated;

create or replace function public.record_active_study(p_resource_slug text,p_event_id uuid,p_seconds integer,p_task_id uuid default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid();
begin
 if owner_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_resource_slug is null or p_resource_slug !~ '^[a-z0-9-]{1,100}$' or p_seconds is null or p_seconds<1 or p_seconds>30 then
  raise exception 'Invalid study event' using errcode='22023';
 end if;
 if p_task_id is not null and not exists(select 1 from public.user_roadmaps where task_id=p_task_id and user_id=owner_id and status='active' and resource_slug=p_resource_slug) then
  raise exception 'Task not available' using errcode='42501';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(owner_id::text,401));
 if exists(select 1 from public.user_activity_logs where user_id=owner_id and event_id=p_event_id) then return true; end if;
 -- Multiple tabs cannot credit overlapping wall-clock intervals.
 if exists(select 1 from public.user_activity_logs where user_id=owner_id and event_type='active_time'
  and occurred_at>clock_timestamp()-make_interval(secs=>p_seconds)) then return false; end if;
 insert into public.user_activity_logs(user_id,task_id,resource_slug,event_id,event_type,active_seconds)
 values(owner_id,p_task_id,p_resource_slug,p_event_id,'active_time',p_seconds);
 return true;
end $$;
revoke all on function public.record_active_study(text,uuid,integer,uuid) from public;
grant execute on function public.record_active_study(text,uuid,integer,uuid) to authenticated;

-- The existing roadmap completion endpoint and UI remain responsible for marking tasks.
create or replace function public.log_roadmap_completion() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.completed_at is not null and (tg_op='INSERT' or old.completed_at is null) then
  insert into public.user_activity_logs(user_id,task_id,resource_slug,event_id,event_type,occurred_at)
  select r.user_id,new.id,coalesce(new.resource_slug,'legacy-material'),new.id,'completed',new.completed_at
  from public.roadmap_milestones m join public.roadmaps r on r.id=m.roadmap_id where m.id=new.milestone_id
  on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function public.log_roadmap_completion() from public;
drop trigger if exists log_roadmap_completion on public.roadmap_activities;
create trigger log_roadmap_completion after insert or update of completed_at on public.roadmap_activities
for each row execute function public.log_roadmap_completion();

-- Consume the US-302 outbox in its original transaction. Match one unfinished task,
-- so one attempt never completes multiple scheduled repetitions of a resource.
create or replace function public.apply_practice_completion() returns trigger language plpgsql security definer set search_path='' as $$
declare slug text; selected_task uuid; requested_task uuid:=nullif(current_setting('app.roadmap_task',true),'')::uuid;
begin
 select e.slug into slug from public.practice_attempts a join public.practice_exercises e on e.id=a.exercise_id where a.id=new.attempt_id;
 select u.task_id into selected_task from public.user_roadmaps u
 where u.user_id=new.user_id and u.status='active' and u.resource_slug=slug and u.completed_at is null
 and (requested_task is null or u.task_id=requested_task)
 and (requested_task is not null or u.scheduled_date<=(now() at time zone 'Asia/Ho_Chi_Minh')::date)
 order by u.scheduled_date,u.milestone_position,u.position limit 1;
 if selected_task is not null then
  update public.roadmap_activities set completed_at=coalesce(completed_at,new.created_at) where id=selected_task;
 end if;
 insert into public.user_activity_logs(user_id,resource_slug,event_id,event_type,occurred_at)
 values(new.user_id,slug,new.attempt_id,'completed',new.created_at) on conflict do nothing;
 new.processed_at=now();
 return new;
end $$;
revoke all on function public.apply_practice_completion() from public;
drop trigger if exists dashboard_practice_completion on public.practice_completion_events;
create trigger dashboard_practice_completion before insert on public.practice_completion_events
for each row execute function public.apply_practice_completion();

-- Add assignment context around the existing grader; retain its original validation,
-- answer keys, immutable result, and submission-id idempotency.
create or replace function public.grade_practice_attempt(p_slug text,p_submission_id uuid,p_answers jsonb,p_task_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if p_task_id is not null and not exists(select 1 from public.user_roadmaps where task_id=p_task_id and user_id=auth.uid() and resource_slug=p_slug and status='active') then
  raise exception 'Task not available' using errcode='42501';
 end if;
 perform set_config('app.roadmap_task',coalesce(p_task_id::text,''),true);
 return public.grade_practice_attempt(p_slug,p_submission_id,p_answers);
end $$;
revoke all on function public.grade_practice_attempt(text,uuid,jsonb,uuid) from public;
grant execute on function public.grade_practice_attempt(text,uuid,jsonb,uuid) to authenticated;

create or replace function public.dashboard_overview() returns jsonb language sql stable security invoker set search_path='' as $$
with tasks as (select * from public.user_roadmaps where user_id=auth.uid() and status='active'),
 stats as (select count(*) total,count(completed_at) completed from tasks)
select jsonb_build_object(
 'totalSeconds',coalesce((select sum(active_seconds) from public.user_activity_logs where user_id=auth.uid()),0),
 'total',stats.total,'completed',stats.completed,
 'targetBand',(select target_band from public.learning_goals where user_id=auth.uid()),
 'currentBand',(select estimated_band from public.placement_attempts where user_id=auth.uid() and status='completed' order by completed_at desc limit 1),
 'assessmentDate',(select completed_at from public.placement_attempts where user_id=auth.uid() and status='completed' order by completed_at desc limit 1),
 'placementResult',(select jsonb_build_object('overallBand',overall_band,'results',assessment_results,'date',updated_at,'kind',assessment_kind)
  from public.placement_tests where user_id=auth.uid() and status='completed' and assessment_results is not null order by updated_at desc limit 1),
 'tasks',coalesce((select jsonb_agg(t order by t.scheduled_date,t.milestone_position,t.position) from (
  select task_id,title,skill,resource_slug,scheduled_date,milestone_position,position from tasks
  where completed_at is null and scheduled_date<=(now() at time zone 'Asia/Ho_Chi_Minh')::date
 ) t),'[]'::jsonb),
 'unscheduled',coalesce((select jsonb_agg(t) from (
  select task_id,title,skill,resource_slug,scheduled_date from tasks where completed_at is null
  order by scheduled_date,milestone_position,position limit 1
 ) t),'[]'::jsonb)
) from stats $$;
revoke all on function public.dashboard_overview() from public;
grant execute on function public.dashboard_overview() to authenticated;

do $$ declare table_name text; begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  foreach table_name in array array['user_activity_logs','roadmap_activities','roadmaps','placement_tests'] loop
   if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=table_name) then
    execute format('alter publication supabase_realtime add table public.%I',table_name);
   end if;
  end loop;
 end if;
end $$;
commit;
