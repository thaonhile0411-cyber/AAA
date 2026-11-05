begin;

-- CHECK must reject JSON null/missing keys as well as out-of-range scores.
-- A CASE prevents unsafe numeric casts on arbitrary JSON strings.
create function public.valid_ielts_scores(scores jsonb)
returns boolean language sql immutable set search_path = ''
as $$
  select case
    when scores is null then true
    when jsonb_typeof(scores) <> 'object' then false
    when not (scores ?& array['listening', 'reading', 'writing', 'speaking']) then false
    when (scores - array['listening', 'reading', 'writing', 'speaking']) <> '{}'::jsonb then false
    else not exists (
      select 1 from jsonb_each(scores) as s(key, value)
      where case when jsonb_typeof(s.value) = 'number'
        then not ((s.value::text)::numeric between 0 and 9
          and mod((s.value::text)::numeric, 0.5) = 0)
        else true end
    )
  end;
$$;

revoke all on function public.valid_ielts_scores(jsonb) from public;
grant execute on function public.valid_ielts_scores(jsonb) to authenticated, service_role;

alter table public.learning_goals
  drop constraint learning_goals_self_reported_scores_check,
  add constraint learning_goals_self_reported_scores_check
    check (public.valid_ielts_scores(self_reported_scores));

create function public.validate_goal_submission()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.expected_exam_date < (now() at time zone 'Asia/Ho_Chi_Minh')::date + 7 then
    raise exception 'Exam date must be at least 7 days from today in Vietnam' using errcode = '23514';
  end if;
  if new.available_minutes_per_day not in (15, 30, 60, 120, 180) then
    raise exception 'Choose one of the five US-102 daily study options' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_goal_submission() from public;
create trigger learning_goals_validate_submission before insert or update
  on public.learning_goals for each row execute function public.validate_goal_submission();

comment on column public.learning_goals.available_minutes_per_day is
  'US-102 choices: 15, 30, 60, 120 minutes; 180 is the category code for more than 2 hours, not an exact duration.';

commit;
