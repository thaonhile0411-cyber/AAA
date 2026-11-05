begin;

create table public.practice_exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,100}$'),
  title text not null check (char_length(title) between 1 and 160),
  summary text not null,
  skill text not null check (skill in ('reading', 'listening')),
  band_group text not null check (band_group in ('below_5', '5_6', '6_7', '8_plus')),
  question_types text[] not null check (cardinality(question_types) > 0 and question_types <@ array['multiple_choice', 'true_false_not_given', 'gap_fill', 'matching_headings']),
  duration_minutes integer not null check (duration_minutes between 1 and 120),
  question_count integer not null check (question_count between 1 and 100),
  passage text[],
  audio_path text,
  audio_mime text check (audio_mime in ('audio/mpeg', 'audio/aac', 'audio/mp4')),
  audio_bytes integer check (audio_bytes > 0 and audio_bytes < 15000000),
  content_version integer not null default 1 check (content_version > 0),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint practice_content_for_skill check (
    (skill = 'reading' and cardinality(passage) > 0 and passage is not null and audio_path is null and audio_bytes is null and audio_mime is null)
    or (skill = 'listening' and passage is null and audio_path is not null and audio_bytes is not null and audio_mime is not null
      and (audio_path ~ '^/audio/[a-z0-9-]+\.(mp3|aac|m4a)$' or audio_path ~ '^https://[^ ]+\.(mp3|aac|m4a)$'))
  )
);

create table public.practice_questions (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.practice_exercises(id) on delete cascade,
  position integer not null check (position > 0),
  type text not null check (type in ('multiple_choice', 'true_false_not_given', 'gap_fill', 'matching_headings')),
  instruction text not null,
  prompt text not null check (char_length(prompt) > 0),
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  constraint practice_question_options check ((type = 'gap_fill' and jsonb_array_length(options) = 0) or (type <> 'gap_fill' and jsonb_array_length(options) between 2 and 20)),
  unique(exercise_id, position)
);

create index practice_exercises_catalog_idx on public.practice_exercises(skill, band_group) where is_published;
create index practice_exercises_question_types_idx on public.practice_exercises using gin(question_types);
create index practice_questions_exercise_idx on public.practice_questions(exercise_id);
create trigger practice_exercises_set_updated_at before update on public.practice_exercises for each row execute function public.set_updated_at();

alter table public.practice_exercises enable row level security;
alter table public.practice_questions enable row level security;
-- Published content is safe to browse without a login. Personal band lookup
-- still uses authenticated RLS; target band is never treated as current band.
create policy practice_exercises_read_published on public.practice_exercises for select to anon, authenticated using (is_published);
create policy practice_questions_read_published on public.practice_questions for select to anon, authenticated using (exists (select 1 from public.practice_exercises e where e.id = exercise_id and e.is_published));
revoke all on public.practice_exercises, public.practice_questions from anon, authenticated;
grant select on public.practice_exercises, public.practice_questions to anon, authenticated;
grant all on public.practice_exercises, public.practice_questions to service_role;
comment on table public.practice_questions is 'US-301 prompts only. No answer keys or transcripts are exposed; grading belongs to US-302.';
commit;
