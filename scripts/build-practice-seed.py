"""Rebuild migration 0007 before its first deployment; never edit an applied migration."""
import json
import pathlib
import uuid

root = pathlib.Path(__file__).resolve().parent.parent
records = json.loads((root / 'content/practice-exercises.json').read_text(encoding='utf-8'))
def literal(value):
    if value is None:
        return 'null'
    return "'" + str(value).replace("'", "''") + "'"
def array(values):
    return 'array[' + ', '.join(literal(value) for value in values) + ']::text[]'

sql = ['-- AAA original short practice materials. Synthetic audio; not official IELTS tests.', 'begin;']
for record in records:
    exercise_id = str(uuid.uuid5(uuid.NAMESPACE_URL, 'aaa:practice:' + record['slug']))
    audio_path = root / 'public/audio' / (record['slug'] + '.mp3')
    audio_size = audio_path.stat().st_size if record['skill'] == 'listening' else None
    if audio_size is not None and not 0 < audio_size < 15_000_000:
        raise ValueError('Audio must be below 15MB')
    types = list(dict.fromkeys(question['type'] for question in record['questions']))
    values = [literal(exercise_id), literal(record['slug']), literal(record['title']), literal(record['summary']), literal(record['skill']), literal(record['band_group']), array(types), str(record['duration_minutes']), str(len(record['questions'])), array(record['passage']) if 'passage' in record else 'null', literal('/audio/' + record['slug'] + '.mp3') if audio_size else 'null', literal('audio/mpeg') if audio_size else 'null', str(audio_size) if audio_size else 'null', 'true']
    sql.append('insert into public.practice_exercises (id, slug, title, summary, skill, band_group, question_types, duration_minutes, question_count, passage, audio_path, audio_mime, audio_bytes, is_published) values (' + ', '.join(values) + ');')
    for position, question in enumerate(record['questions'], 1):
        question_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f'aaa:practice:{record["slug"]}:{position}'))
        values = [literal(question_id), literal(exercise_id), str(position), literal(question['type']), literal(question['instruction']), literal(question['prompt']), literal(json.dumps(question['options'], ensure_ascii=False)) + '::jsonb']
        sql.append('insert into public.practice_questions (id, exercise_id, position, type, instruction, prompt, options) values (' + ', '.join(values) + ');')
sql.append('commit;\n')
(root / 'supabase/migrations/0007_us301_original_exercises.sql').write_text('\n\n'.join(sql), encoding='utf-8')
print(f'Built migration for {len(records)} exercises; no answer keys or transcripts in public tables.')
