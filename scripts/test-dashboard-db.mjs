// Disposable PostgreSQL/WASM checks; never connects to the team's database.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { performance } from "node:perf_hooks";
const { PGlite } = await import(
  process.env.PGLITE_MODULE || "@electric-sql/pglite"
);
const db = new PGlite();
await db.exec(`
 create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to authenticated,anon,service_role;
 grant execute on function auth.uid() to authenticated,anon,service_role;
 alter default privileges in schema public grant all on tables to authenticated,service_role;
 create schema storage;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 create function storage.foldername(name text) returns text[] language sql as $$select string_to_array(name,'/')$$;
`);
const migrations = (
  await fs.readdir(new URL("../supabase/migrations/", import.meta.url))
)
  .filter((name) => name.endsWith(".sql"))
  .sort((a, b) => {
    const av = BigInt(a.split("_")[0]),
      bv = BigInt(b.split("_")[0]);
    if (av !== bv) return av < bv ? -1 : 1;
    // Existing repository has two files with version 20261104; the queue uses the placement trigger helper.
    return a.includes("placement_tests")
      ? -1
      : b.includes("placement_tests")
        ? 1
        : a.localeCompare(b);
  });
for (const name of migrations) {
  const sql = (
    await fs.readFile(
      new URL(`../supabase/migrations/${name}`, import.meta.url),
      "utf8",
    )
  ).replace(/create extension if not exists pgcrypto;/i, "");
  try {
    await db.exec(sql);
  } catch (error) {
    throw new Error(`Migration ${name}: ${error.message}`);
  }
}
await db.exec(
  await fs.readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8"),
);
const user = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222";
await db.exec(`insert into auth.users(id) values('${user}'),('${other}');
 insert into public.roadmaps(id,user_id,title,summary,status) values('33333333-3333-4333-8333-333333333333','${user}','Test','Test','active');
 insert into public.roadmap_milestones(id,roadmap_id,phase_number,skill,title,description,position) values('44444444-4444-4444-8444-444444444444','33333333-3333-4333-8333-333333333333',1,'reading','Test','Test',1);
 insert into public.roadmap_activities(milestone_id,title,position,resource_slug,scheduled_date,completed_at)
 select '44444444-4444-4444-8444-444444444444','Task '||n,n,'voa-sleepy-teens-reading',current_date,case when n<=15 then now() else null end from generate_series(1,60) n;
 insert into public.user_activity_logs(user_id,resource_slug,event_id,event_type,active_seconds,occurred_at)
 select '${user}','voa-sleepy-teens-reading',gen_random_uuid(),'active_time',30,now()-interval '1 hour' from generate_series(1,900);
 select set_config('request.jwt.claim.sub','${user}',false); set role authenticated;
`);
const overview = async () =>
  (await db.query("select public.dashboard_overview() data")).rows[0].data;
const initial = await overview();
assert.equal(initial.totalSeconds, 27000);
assert.equal(initial.completed, 15);
assert.equal(initial.total, 60);
assert.equal(initial.tasks.length, 45);
const task = initial.tasks[0].task_id;
await db.query(
  "update public.roadmap_activities set completed_at=now() where id=$1",
  [task],
);
assert.equal((await overview()).completed, 16);
await db.query(
  "update public.roadmap_activities set completed_at=now() where id=$1",
  [task],
);
assert.equal(
  (
    await db.query(
      `select count(*)::int n from public.user_activity_logs where task_id=$1 and event_type='completed'`,
      [task],
    )
  ).rows[0].n,
  1,
);
const event = "55555555-5555-4555-8555-555555555555";
await db.query("select public.record_active_study($1,$2,15,$3)", [
  "voa-sleepy-teens-reading",
  event,
  task,
]);
await db.query("select public.record_active_study($1,$2,15,$3)", [
  "voa-sleepy-teens-reading",
  event,
  task,
]);
assert.equal((await overview()).totalSeconds, 27015);
await assert.rejects(
  db.query("select public.record_active_study($1,$2,31,$3)", [
    "voa-sleepy-teens-reading",
    crypto.randomUUID(),
    task,
  ]),
);
await db.exec(
  `reset role; select set_config('request.jwt.claim.sub','${other}',false); set role authenticated;`,
);
assert.equal((await overview()).total, 0);
assert.equal((await overview()).totalSeconds, 0);
await assert.rejects(
  db.query("select public.record_active_study($1,$2,15,$3)", [
    "voa-sleepy-teens-reading",
    crypto.randomUUID(),
    task,
  ]),
);
await assert.rejects(
  db.query(
    `insert into public.user_activity_logs(user_id,resource_slug,event_id,event_type) values($1,'test',$2,'completed')`,
    [other, crypto.randomUUID()],
  ),
);
await db.exec(
  `reset role; select set_config('request.jwt.claim.sub','${user}',false); set role authenticated;`,
);
// Use the existing US-302 grading RPC/outbox, including an identical network retry.
const gradingId = crypto.randomUUID();
const result = (
  await db.query(
    `select public.grade_practice_attempt('voa-sleepy-teens-reading',$1,'{}') data`,
    [gradingId],
  )
).rows[0].data;
await db.query(
  `select public.grade_practice_attempt('voa-sleepy-teens-reading',$1,'{}')`,
  [gradingId],
);
assert.ok(result.attemptId);
assert.equal((await overview()).completed, 17);
const exactTask = initial.tasks[10].task_id;
const exactSubmission = crypto.randomUUID();
await db.query(
  "select public.grade_practice_attempt('voa-sleepy-teens-reading',$1,'{}',$2)",
  [exactSubmission, exactTask],
);
await db.query(
  "select public.grade_practice_attempt('voa-sleepy-teens-reading',$1,'{}',$2)",
  [exactSubmission, exactTask],
);
assert.equal((await overview()).completed, 18);
assert.ok(
  (
    await db.query(
      "select completed_at from public.roadmap_activities where id=$1",
      [exactTask],
    )
  ).rows[0].completed_at,
);
await assert.rejects(
  db.query(
    "select public.grade_practice_attempt('wrong-resource',$1,'{}',$2)",
    [crypto.randomUUID(), exactTask],
  ),
);
// US-401.2: completed events are grouped by the learner's own IANA timezone.
// Two completions today count as one active day/streak increment.
const streakUser = "66666666-6666-4666-8666-666666666666";
await db.exec(`
  reset role;
  insert into auth.users(id) values('${streakUser}');
  insert into public.user_activity_logs(user_id,resource_slug,event_id,event_type,occurred_at) values
    ('${streakUser}','streak-test',gen_random_uuid(),'completed',
      (date_trunc('day', now() at time zone 'Pacific/Auckland') - interval '2 days' + interval '12 hours') at time zone 'Pacific/Auckland'),
    ('${streakUser}','streak-test',gen_random_uuid(),'completed',
      (date_trunc('day', now() at time zone 'Pacific/Auckland') - interval '1 day' + interval '12 hours') at time zone 'Pacific/Auckland'),
    ('${streakUser}','streak-test',gen_random_uuid(),'completed',
      (date_trunc('day', now() at time zone 'Pacific/Auckland') + interval '8 hours') at time zone 'Pacific/Auckland'),
    ('${streakUser}','streak-test',gen_random_uuid(),'completed',
      (date_trunc('day', now() at time zone 'Pacific/Auckland') + interval '10 hours') at time zone 'Pacific/Auckland');
  select set_config('request.jwt.claim.sub','${streakUser}',false); set role authenticated;
`);
await db.query("select public.set_user_time_zone('Pacific/Auckland')");
const streakOverview = (await db.query("select public.dashboard_overview() data")).rows[0].data;
assert.equal(streakOverview.streak.timeZone, "Pacific/Auckland");
assert.equal(streakOverview.streak.current, 3);
assert.equal(streakOverview.streak.todayActive, true);
assert.equal(streakOverview.streak.week.length, 7);
assert.equal(
  streakOverview.streak.week.find((day) => day.date === streakOverview.streak.localDate).completions,
  2,
);
await assert.rejects(db.query("select public.set_user_time_zone('Not/A_Real_Zone')"));
const samples = [];
for (let i = 0; i < 30; i++) {
  const start = performance.now();
  await overview();
  samples.push(performance.now() - start);
}
samples.sort((a, b) => a - b);
console.log(
  JSON.stringify(
    {
      passed: true,
      scenario:
        "15/60, 450 min; completion retry; active-time retry; RLS; US-302 outbox; US-401.2 streak/timezone",
      databaseP95Ms: Number(samples[28].toFixed(2)),
      conditions:
        "PGlite in-memory, 60 roadmap tasks, 900 time events, 30 warm reads; excludes network/browser",
    },
    null,
    2,
  ),
);
await db.close();
