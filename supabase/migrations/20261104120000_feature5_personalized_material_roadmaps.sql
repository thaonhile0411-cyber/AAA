-- Feature 5: persist the resource allocation behind a learner's personalized cycle.

alter table public.roadmaps
  add column if not exists source_placement_test_id uuid
    references public.placement_tests(id) on delete set null,
  add column if not exists allocation_snapshot jsonb not null default '{}'::jsonb;

alter table public.roadmap_activities
  add column if not exists resource_slug text,
  add column if not exists skill text
    check (skill in ('listening', 'reading', 'writing', 'speaking'));

create index if not exists roadmaps_source_placement_test_id_idx
  on public.roadmaps(source_placement_test_id);

create index if not exists roadmap_activities_resource_slug_idx
  on public.roadmap_activities(resource_slug)
  where resource_slug is not null;

comment on column public.roadmaps.allocation_snapshot is
  'Feature 5 allocation plan: desired/actual percentages and inventory limits at generation time.';
comment on column public.roadmap_activities.resource_slug is
  'Stable slug of the practice resource selected for this task; supports resources stored outside learning_materials.';
