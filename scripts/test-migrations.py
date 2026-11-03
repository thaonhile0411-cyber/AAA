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
    # Only stand in for Supabase Auth's external schema; application SQL is real.
    sql("create schema auth; create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}'::jsonb); create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;")
    for migration in sorted((root / 'supabase/migrations').glob('*.sql')):
        sql(migration.read_text(encoding='utf-8-sig'))
    sql((root / 'supabase/seed.sql').read_text(encoding='utf-8-sig'))
    assert sql('select count(*) from public.practice_exercises;').strip() == '8'
    assert sql('select count(*) from public.practice_questions;').strip() == '42'
    assert sql("select count(*) from pg_policies where schemaname = 'public';").strip() == '30'
    assert sql("select count(*) from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='avatar_url';").strip() == '1'
    assert sql("select public.valid_ielts_scores('{\"listening\":null,\"reading\":7,\"writing\":7,\"speaking\":7}'::jsonb);").strip() == 'f'
    print('PASS: fresh replay of migrations 0001-0007 and original seed; 8 exercises, 42 questions, 30 RLS policies, avatar schema and strict JSON scores verified.')
finally:
    sql(f'drop database {database} with (force);', 'postgres')
