-- US-102 collects study availability in minutes per day.
-- Keep 0001 unchanged because teammates may already have applied it.
-- Existing weekly preferences become a rounded daily average.

begin;

alter table public.learning_goals
  drop constraint learning_goals_available_minutes_per_week_check;

alter table public.learning_goals
  rename column available_minutes_per_week to available_minutes_per_day;

update public.learning_goals
set available_minutes_per_day = greatest(
  1,
  round(available_minutes_per_day / 7.0)::integer
);

alter table public.learning_goals
  add constraint learning_goals_available_minutes_per_day_check
  check (available_minutes_per_day between 1 and 1440);

comment on column public.learning_goals.available_minutes_per_day is
  'Self-reported daily study availability in minutes (1-1440); not a fixed daily timetable.';

commit;
