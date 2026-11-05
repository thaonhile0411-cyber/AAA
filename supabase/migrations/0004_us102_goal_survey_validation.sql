-- US-102: enforce the valid target range and structure for bypass scores.

begin;

alter table public.learning_goals
  drop constraint learning_goals_target_band_check,
  add constraint learning_goals_target_band_check
    check (
      target_band between 3.0 and 9.0
      and (target_band * 2) = trunc(target_band * 2)
    ),
  add constraint learning_goals_self_reported_scores_check
    check (
      self_reported_scores is null
      or (
        jsonb_typeof(self_reported_scores) = 'object'
        and self_reported_scores ?& array['listening', 'reading', 'writing', 'speaking']
        and jsonb_typeof(self_reported_scores -> 'listening') = 'number'
        and jsonb_typeof(self_reported_scores -> 'reading') = 'number'
        and jsonb_typeof(self_reported_scores -> 'writing') = 'number'
        and jsonb_typeof(self_reported_scores -> 'speaking') = 'number'
        and (self_reported_scores ->> 'listening')::numeric between 0.0 and 9.0
        and (self_reported_scores ->> 'reading')::numeric between 0.0 and 9.0
        and (self_reported_scores ->> 'writing')::numeric between 0.0 and 9.0
        and (self_reported_scores ->> 'speaking')::numeric between 0.0 and 9.0
        and ((self_reported_scores ->> 'listening')::numeric * 2) = trunc((self_reported_scores ->> 'listening')::numeric * 2)
        and ((self_reported_scores ->> 'reading')::numeric * 2) = trunc((self_reported_scores ->> 'reading')::numeric * 2)
        and ((self_reported_scores ->> 'writing')::numeric * 2) = trunc((self_reported_scores ->> 'writing')::numeric * 2)
        and ((self_reported_scores ->> 'speaking')::numeric * 2) = trunc((self_reported_scores ->> 'speaking')::numeric * 2)
      )
    );

comment on column public.learning_goals.self_reported_scores is
  'JSON object with numeric listening, reading, writing, and speaking IELTS bands (0.0-9.0 in 0.5 steps).';

commit;
