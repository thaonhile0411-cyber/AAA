begin;

-- Harden US-302 result generation. A published Reading/Listening exercise is
-- gradable only when it contains the evidence required by its review UI.
-- band_scale remains optional: short tests must not invent an IELTS band.
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
  v_band_scale jsonb;
  v_band_value text;
  v_band numeric(2,1);
  v_band_message text;
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

  select transcript, band_scale into v_transcript, v_band_scale
  from public.practice_exercise_grading
  where exercise_id = v_exercise.id;

  if (v_exercise.skill = 'listening' and coalesce(btrim(v_transcript), '') = '')
     or exists (
       select 1
       from public.practice_questions q
       join public.practice_answer_keys k on k.question_id = q.id
       where q.exercise_id = v_exercise.id
         and (
           (v_exercise.skill = 'reading' and k.evidence_paragraph is null)
           or (v_exercise.skill = 'listening' and (
             k.audio_start_seconds is null or k.audio_end_seconds is null
           ))
         )
     ) then
    raise exception 'ANSWER_KEYS_INCOMPLETE' using errcode = '23514';
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
  if v_band_scale is null then
    v_band := null;
    v_band_message := 'KhÃ´ng hiá»ƒn thá»‹ band cho bÃ i luyá»‡n ngáº¯n khi chÆ°a cÃ³ phÆ°Æ¡ng phÃ¡p quy Ä‘á»•i Ä‘Æ°á»£c phÃª duyá»‡t.';
  else
    v_band_value := v_band_scale ->> v_correct::text;
    if v_band_value is null
       or v_band_value !~ '^[1-9](\.5)?$'
       or v_band_value::numeric > 9 then
      raise exception 'INVALID_BAND_SCALE' using errcode = '23514';
    end if;
    v_band := v_band_value::numeric;
    v_band_message := 'Estimated band uses this exercise''s documented scoring scale.';
  end if;

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
    'bandMessage', v_band_message,
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

comment on column public.practice_exercise_grading.band_scale is
  'Optional documented raw-score-to-band JSON map, e.g. {"0":3,"1":3.5}. Omit for short exercises with no approved conversion.';

commit;
