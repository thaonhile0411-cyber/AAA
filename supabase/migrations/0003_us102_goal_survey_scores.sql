-- This migration already exists in the hosted project. It is retained in Git
-- so a fresh database receives the same schema and migration history.

alter table public.learning_goals
  add column self_reported_scores jsonb;

comment on column public.learning_goals.self_reported_scores is
  'Recent IELTS skill scores supplied by the learner when bypassing placement.';
