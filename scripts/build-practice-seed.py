"""Build a source-attributed practice-content migration without editing applied migrations."""
import argparse
import json
import pathlib
import uuid

root = pathlib.Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--input', default='content/practice-exercises.json')
parser.add_argument('--output', default='supabase/migrations/0007_us301_original_exercises.sql')
parser.add_argument('--replace-us301-content', action='store_true')
args = parser.parse_args()
records = json.loads((root / args.input).read_text(encoding='utf-8'))
def literal(value):
    if value is None:
        return 'null'
    return "'" + str(value).replace("'", "''") + "'"
def array(values):
    return 'array[' + ', '.join(literal(value) for value in values) + ']::text[]'

sql = ['-- US-301 resource bank. Questions are authored by AAA; source material is attributed per record.', 'begin;']
if args.replace_us301_content:
    sql.extend([
        "alter table public.practice_exercises add column source_title text;",
        "alter table public.practice_exercises add column source_url text;",
        "alter table public.practice_exercises add column source_license text;",
        "alter table public.practice_exercises add column source_attribution text;",
        "delete from public.practice_exercises where slug in ('the-community-garden', 'libraries-without-walls', 'the-cooling-power-of-trees', 'the-paradox-of-predictable-cities', 'a-visit-to-riverside-centre', 'planning-the-coastal-walk', 'researching-student-study-spaces', 'when-memory-meets-evidence');",
    ])
for record in records:
    exercise_id = str(uuid.uuid5(uuid.NAMESPACE_URL, 'aaa:practice:' + record['slug']))
    audio_path = root / 'public/audio' / (record['slug'] + '.mp3')
    audio_size = audio_path.stat().st_size if record['skill'] == 'listening' else None
    if audio_size is not None and not 0 < audio_size < 15_000_000:
        raise ValueError('Audio must be below 15MB')
    types = list(dict.fromkeys(question['type'] for question in record['questions']))
    source = record.get('source', {})
    values = [literal(exercise_id), literal(record['slug']), literal(record['title']), literal(record['summary']), literal(record['skill']), literal(record['band_group']), array(types), str(record['duration_minutes']), str(len(record['questions'])), array(record['passage']) if 'passage' in record else 'null', literal('/audio/' + record['slug'] + '.mp3') if audio_size else 'null', literal('audio/mpeg') if audio_size else 'null', str(audio_size) if audio_size else 'null', '2', 'true', literal(source.get('title')), literal(source.get('url')), literal(source.get('license')), literal(source.get('attribution'))]
    sql.append('insert into public.practice_exercises (id, slug, title, summary, skill, band_group, question_types, duration_minutes, question_count, passage, audio_path, audio_mime, audio_bytes, content_version, is_published, source_title, source_url, source_license, source_attribution) values (' + ', '.join(values) + ');')
    for position, question in enumerate(record['questions'], 1):
        question_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f'aaa:practice:{record["slug"]}:{position}'))
        values = [literal(question_id), literal(exercise_id), str(position), literal(question['type']), literal(question['instruction']), literal(question['prompt']), literal(json.dumps(question['options'], ensure_ascii=False)) + '::jsonb']
        sql.append('insert into public.practice_questions (id, exercise_id, position, type, instruction, prompt, options) values (' + ', '.join(values) + ');')
if args.replace_us301_content:
    sql.extend([
        "alter table public.practice_exercises add constraint practice_exercises_published_source check (not is_published or (source_title is not null and source_url ~ '^https://[^ ]+$' and source_license is not null and source_attribution is not null));",
        "comment on column public.practice_exercises.source_url is 'Canonical source URL for practice content reuse and attribution.';",
    ])
sql.append('commit;\n')
output = root / args.output
output.write_text('\n\n'.join(sql), encoding='utf-8')
print(f'Built migration for {len(records)} exercises; no answer keys or transcripts in public tables.')
