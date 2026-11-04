-- Feature 5 Task 7: distinguish the initial placement from later reassessments.

alter table public.placement_tests
  add column if not exists assessment_kind text not null default 'placement'
    check (assessment_kind in ('placement', 'reassessment'));

create index if not exists placement_tests_user_kind_completed_idx
  on public.placement_tests(user_id, assessment_kind, created_at desc)
  where status = 'completed';

comment on column public.placement_tests.assessment_kind is
  'placement = initial baseline; reassessment = a completed progress check after a learning cycle.';
