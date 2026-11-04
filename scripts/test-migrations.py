"""Replay every migration and seed in an isolated, disposable local PostgreSQL database."""
import pathlib
import subprocess
import uuid

root = pathlib.Path(__file__).resolve().parent.parent
database = 'aaa_migration_check_' + uuid.uuid4().hex
container = 'supabase_db_dev'

def sql(text, target=database):
    result = subprocess.run(['docker', 'exec', '-i', container, 'psql', '-U', 'postgres', '-d', target, '-v', 'ON_ERROR_STOP=1', '-At'], input=text, text=True, encoding='utf-8', capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout

sql(f'create database {database};', 'postgres')
try:
    # Stand in for the external Auth and Storage schemas normally installed by
    # the Supabase local stack. All application migrations still run unchanged.
    sql("""
        create schema auth;
        create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}'::jsonb);
        create function auth.uid() returns uuid language sql stable as $$
          select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
        $$;

        create schema storage;
        create table storage.buckets (
          id text primary key,
          name text not null,
          public boolean not null default false,
          file_size_limit bigint,
          allowed_mime_types text[]
        );
        create table storage.objects (
          id uuid primary key default gen_random_uuid(),
          bucket_id text references storage.buckets(id),
          name text not null
        );
        create function storage.foldername(name text) returns text[]
          language sql immutable as $$select string_to_array(name, '/')$$;
    """)
    for migration in sorted((root / 'supabase/migrations').glob('*.sql')):
        sql(migration.read_text(encoding='utf-8-sig'))
    sql((root / 'supabase/seed.sql').read_text(encoding='utf-8-sig'))
    # Exercise the real grading RPC with a simulated authenticated user.
    sql("""
      insert into auth.users (id) values ('11111111-1111-4111-8111-111111111111');
      select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
      do $$
      declare
        answers jsonb;
        first_result jsonb;
        retry_result jsonb;
      begin
        select jsonb_object_agg(
          q.id::text,
          case when q.position = 1 then '' else '  ' || upper(k.accepted_answers[1]) || '  ' end
        )
        into answers
        from public.practice_questions q
        join public.practice_exercises e on e.id = q.exercise_id
        join public.practice_answer_keys k on k.question_id = q.id
        where e.slug = 'voa-sleepy-teens-reading';

        first_result := public.grade_practice_attempt(
          'voa-sleepy-teens-reading',
          '22222222-2222-4222-8222-222222222222',
          answers
        );
        retry_result := public.grade_practice_attempt(
          'voa-sleepy-teens-reading',
          '22222222-2222-4222-8222-222222222222',
          answers
        );

        if (first_result ->> 'correctCount')::int <> 4
           or (first_result ->> 'unansweredCount')::int <> 1
           or first_result ->> 'attemptId' <> retry_result ->> 'attemptId' then
          raise exception 'US-302 grading/idempotency assertion failed: %', first_result;
        end if;
      end $$;
    """)
    assert sql('select count(*) from public.practice_exercises;').strip() == '8'
    assert sql('select count(*) from public.practice_questions;').strip() == '40'
    assert sql('select count(*) from public.practice_answer_keys;').strip() == '40'
    assert sql('select count(*) from public.practice_exercise_grading where transcript is not null;').strip() == '4'
    assert sql('select count(*) from public.practice_attempts;').strip() == '1'
    assert sql('select count(*) from public.practice_completion_events;').strip() == '1'
    assert sql("select count(*) from public.practice_exercises where source_attribution = 'VOA Learning English';").strip() == '8'
    public_policy_count = sql("select count(*) from pg_policies where schemaname = 'public';").strip()
    assert public_policy_count == '34', f'expected 34 public RLS policies, got {public_policy_count}'
    assert sql("select count(*) from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='avatar_url';").strip() == '1'
    assert sql("select public.valid_ielts_scores('{\"listening\":null,\"reading\":7,\"writing\":7,\"speaking\":7}'::jsonb);").strip() == 'f'
    print('PASS: fresh replay through US-302; scoring normalization, idempotency, completion event, 40 private keys, 4 transcripts and 34 public RLS policies verified.')
finally:
    sql(f'drop database {database} with (force);', 'postgres')
