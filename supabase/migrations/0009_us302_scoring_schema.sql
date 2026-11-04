begin;

create table public.practice_exercise_grading (
  exercise_id uuid primary key references public.practice_exercises(id) on delete cascade,
  transcript text,
  band_scale jsonb,
  created_at timestamptz not null default now(),
  constraint practice_band_scale_object check (
    band_scale is null or jsonb_typeof(band_scale) = 'object'
  )
);

create table public.practice_answer_keys (
  question_id uuid primary key references public.practice_questions(id) on delete cascade,
  accepted_answers text[] not null check (cardinality(accepted_answers) > 0),
  display_answer text not null check (char_length(btrim(display_answer)) > 0),
  explanation text not null check (char_length(btrim(explanation)) > 0),
  evidence_text text not null check (char_length(btrim(evidence_text)) > 0),
  evidence_paragraph integer check (evidence_paragraph is null or evidence_paragraph >= 0),
  audio_start_seconds numeric(8,3) check (audio_start_seconds is null or audio_start_seconds >= 0),
  audio_end_seconds numeric(8,3) check (audio_end_seconds is null or audio_end_seconds > audio_start_seconds),
  created_at timestamptz not null default now(),
  constraint practice_evidence_location check (
    evidence_paragraph is not null
    or (audio_start_seconds is not null and audio_end_seconds is not null)
  )
);

create table public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.practice_exercises(id) on delete cascade,
  submission_id uuid not null,
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  raw_score integer not null check (raw_score >= 0),
  total_questions integer not null check (total_questions > 0),
  incorrect_count integer not null check (incorrect_count >= 0),
  unanswered_count integer not null check (unanswered_count >= 0),
  percentage numeric(5,2) not null check (percentage between 0 and 100),
  estimated_band numeric(2,1) check (
    estimated_band is null
    or (estimated_band between 1 and 9 and estimated_band * 2 = trunc(estimated_band * 2))
  ),
  result_snapshot jsonb not null check (jsonb_typeof(result_snapshot) = 'object'),
  completed_at timestamptz not null default now(),
  unique(user_id, submission_id),
  check (raw_score + incorrect_count + unanswered_count = total_questions)
);

create index practice_attempts_owner_completed_idx
  on public.practice_attempts(user_id, completed_at desc);

create table public.practice_completion_events (
  attempt_id uuid primary key references public.practice_attempts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null default 'practice.completed' check (event_type = 'practice.completed'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.practice_exercise_grading enable row level security;
alter table public.practice_answer_keys enable row level security;
alter table public.practice_attempts enable row level security;
alter table public.practice_completion_events enable row level security;

create policy practice_attempts_read_own
  on public.practice_attempts for select to authenticated
  using (user_id = auth.uid());

revoke all on public.practice_exercise_grading, public.practice_answer_keys,
  public.practice_attempts, public.practice_completion_events from anon, authenticated;
grant select on public.practice_attempts to authenticated;
grant all on public.practice_exercise_grading, public.practice_answer_keys,
  public.practice_attempts, public.practice_completion_events to service_role;

create or replace function public.grade_practice_attempt(
  p_slug text,
  p_submission_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_exercise public.practice_exercises%rowtype;
  v_attempt_id uuid := gen_random_uuid();
  v_existing jsonb;
  v_items jsonb;
  v_correct integer;
  v_incorrect integer;
  v_unanswered integer;
  v_total integer;
  v_percentage numeric(5,2);
  v_transcript text;
  v_band numeric(2,1);
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_slug !~ '^[a-z0-9-]{1,100}$'
     or p_answers is null
     or jsonb_typeof(p_answers) <> 'object'
     or (select count(*) from jsonb_object_keys(p_answers)) > 100 then
    raise exception 'INVALID_SUBMISSION' using errcode = '22023';
  end if;

  select result_snapshot into v_existing
  from public.practice_attempts
  where user_id = v_user_id and submission_id = p_submission_id;
  if v_existing is not null then
    return v_existing;
  end if;

  select * into v_exercise
  from public.practice_exercises
  where slug = p_slug and is_published;
  if not found then
    raise exception 'EXERCISE_NOT_FOUND' using errcode = 'P0002';
  end if;

  with scored as (
    select
      q.id,
      q.position,
      q.type,
      coalesce(p_answers ->> q.id::text, '') as user_answer,
      k.display_answer,
      k.explanation,
      k.evidence_text,
      k.evidence_paragraph,
      k.audio_start_seconds,
      k.audio_end_seconds,
      btrim(coalesce(p_answers ->> q.id::text, '')) = '' as unanswered,
      exists (
        select 1
        from unnest(k.accepted_answers) accepted(answer)
        where lower(regexp_replace(btrim(accepted.answer), '\s+', ' ', 'g')) =
              lower(regexp_replace(btrim(coalesce(p_answers ->> q.id::text, '')), '\s+', ' ', 'g'))
      ) as correct
    from public.practice_questions q
    join public.practice_answer_keys k on k.question_id = q.id
    where q.exercise_id = v_exercise.id
    order by q.position
  ), aggregate_result as (
    select
      count(*)::integer as total,
      count(*) filter (where correct and not unanswered)::integer as correct_count,
      count(*) filter (where not correct and not unanswered)::integer as incorrect_count,
      count(*) filter (where unanswered)::integer as unanswered_count,
      jsonb_agg(
        jsonb_build_object(
          'questionId', id,
          'position', position,
          'type', type,
          'userAnswer', user_answer,
          'correct', correct and not unanswered,
          'unanswered', unanswered,
          'correctAnswer', display_answer,
          'explanation', explanation,
          'evidenceText', evidence_text,
          'evidenceParagraph', evidence_paragraph,
          'audioStartSeconds', audio_start_seconds,
          'audioEndSeconds', audio_end_seconds
        ) order by position
      ) as items
    from scored
  )
  select total, correct_count, incorrect_count, unanswered_count, items
  into v_total, v_correct, v_incorrect, v_unanswered, v_items
  from aggregate_result;

  if v_total = 0 or v_total <> v_exercise.question_count then
    raise exception 'ANSWER_KEYS_INCOMPLETE' using errcode = '23514';
  end if;

  v_percentage := round(100.0 * v_correct / v_total, 2);
  select transcript into v_transcript
  from public.practice_exercise_grading where exercise_id = v_exercise.id;

  -- These five-question practice sets do not have a validated IELTS conversion.
  -- Never invent a band; a future test-specific scale can populate this field.
  v_band := null;
  v_result := jsonb_build_object(
    'attemptId', v_attempt_id,
    'exerciseId', v_exercise.id,
    'skill', v_exercise.skill,
    'correctCount', v_correct,
    'incorrectCount', v_incorrect,
    'unansweredCount', v_unanswered,
    'totalQuestions', v_total,
    'percentage', v_percentage,
    'estimatedBand', v_band,
    'bandMessage', 'Không hiển thị band cho bài luyện ngắn khi chưa có phương pháp quy đổi được phê duyệt.',
    'transcript', case when v_exercise.skill = 'listening' then v_transcript else null end,
    'questions', v_items,
    'completedAt', now()
  );

  insert into public.practice_attempts (
    id, user_id, exercise_id, submission_id, answers, raw_score,
    total_questions, incorrect_count, unanswered_count, percentage,
    estimated_band, result_snapshot
  ) values (
    v_attempt_id, v_user_id, v_exercise.id, p_submission_id, p_answers,
    v_correct, v_total, v_incorrect, v_unanswered, v_percentage, v_band, v_result
  ) on conflict (user_id, submission_id) do nothing;

  select result_snapshot into v_existing
  from public.practice_attempts
  where user_id = v_user_id and submission_id = p_submission_id;

  insert into public.practice_completion_events (attempt_id, user_id, payload)
  select
    (v_existing ->> 'attemptId')::uuid,
    v_user_id,
    jsonb_build_object(
      'attemptId', v_existing ->> 'attemptId',
      'exerciseId', v_existing ->> 'exerciseId',
      'skill', v_existing ->> 'skill',
      'percentage', (v_existing ->> 'percentage')::numeric,
      'completedAt', v_existing ->> 'completedAt'
    )
  on conflict (attempt_id) do nothing;

  return v_existing;
end;
$$;

revoke all on function public.grade_practice_attempt(text, uuid, jsonb) from public, anon;
grant execute on function public.grade_practice_attempt(text, uuid, jsonb) to authenticated;

comment on table public.practice_answer_keys is
  'Private US-302 answer keys, explanations and answer locations. Never grant browser SELECT.';
comment on table public.practice_attempts is
  'Idempotent, owner-readable US-302 submissions and immutable result snapshots.';
comment on table public.practice_completion_events is
  'Transactional outbox consumed by US-401 progress tracking; one event per attempt.';

commit;
