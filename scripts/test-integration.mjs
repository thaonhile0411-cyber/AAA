// Real HTTP + Supabase RLS tests. This runner is deliberately local-only.
import assert from "node:assert/strict";
import { execSync, spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const statusText = execSync(
  `${process.platform === "win32" ? "npx.cmd" : "npx"} supabase status -o json`,
  { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
);
const status = JSON.parse(statusText.slice(statusText.indexOf("{")));
const url = status.API_URL;
if (!url || !/^http:\/\/(127\.0\.0\.1|localhost):/.test(url))
  throw new Error("Integration tests must use a local Supabase stack.");
const admin = createClient(url, status.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const users = [];
const port = 3102;
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "-p", String(port)],
  {
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.ANON_KEY,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  },
);
let serverLog = "";
server.stdout.on("data", (chunk) => (serverLog += chunk));
server.stderr.on("data", (chunk) => (serverLog += chunk));
async function request(path, init = {}, cookie = "") {
  const response = await fetch(`http://localhost:${port}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      ...init.headers,
    },
  });
  return {
    status: response.status,
    body: await response.json(),
    headers: response.headers,
  };
}
async function account(index) {
  const email = `aaa-integration-${Date.now()}-${index}@example.test`;
  const password = `Aaa-test-${crypto.randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  users.push(data.user.id);
  const jar = new Map();
  const client = createServerClient(url, status.ANON_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (values) =>
        values.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const signed = await client.auth.signInWithPassword({ email, password });
  if (signed.error) throw signed.error;
  return {
    id: data.user.id,
    client,
    cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; "),
  };
}

try {
  for (let tries = 0; ; tries++) {
    try {
      await fetch(`http://localhost:${port}/practice`);
      break;
    } catch {
      if (tries > 45)
        throw new Error("Next test server did not start: " + serverLog);
      await delay(500);
    }
  }
  const one = await account(1);
  const two = await account(2);
  const date = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const input = {
    targetBand: 7,
    examDate: date,
    dailyStudyMinutes: 60,
    useExistingScores: false,
    scores: null,
    user_id: two.id,
  };
  assert.equal((await request("/api/goals")).status, 401);
  assert.equal(
    (
      await request("/api/goals", {
        method: "PUT",
        body: JSON.stringify(input),
      })
    ).status,
    401,
  );
  assert.equal(
    (await request("/api/goals", { method: "PUT", body: "{" }, one.cookie))
      .status,
    400,
  );
  assert.equal(
    (
      await request(
        "/api/goals",
        { method: "PUT", body: JSON.stringify({ ...input, targetBand: 7.2 }) },
        one.cookie,
      )
    ).status,
    422,
  );
  let saved = await request(
    "/api/goals",
    { method: "PUT", body: JSON.stringify(input) },
    one.cookie,
  );
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.equal(saved.body.nextStep, "placement");
  assert.equal(
    (await request("/api/goals", {}, two.cookie)).body.profile,
    null,
  );
  assert.match(saved.headers.get("Cache-Control"), /no-store/);
  const other = await two.client
    .from("learning_goals")
    .select("*")
    .eq("user_id", one.id);
  assert.deepEqual(other.data, []);
  const badDate = await one.client
    .from("learning_goals")
    .update({ expected_exam_date: new Date().toISOString().slice(0, 10) })
    .eq("user_id", one.id);
  assert.ok(
    badDate.error,
    "Database must reject an invalid date even when bypassing the API",
  );
  const badScores = await one.client
    .from("learning_goals")
    .update({
      self_reported_scores: {
        listening: null,
        reading: 7,
        writing: 7,
        speaking: 7,
      },
    })
    .eq("user_id", one.id);
  assert.ok(
    badScores.error,
    "JSON null scores must not pass a CHECK constraint",
  );
  const assessed = await admin
    .from("placement_attempts")
    .insert({
      user_id: one.id,
      status: "completed",
      reading_correct: 2,
      listening_correct: 2,
      total_questions: 6,
      estimated_band: 7.5,
      completed_at: new Date().toISOString(),
    });
  assert.ifError(assessed.error);
  const goalsWithAssessment = await request("/api/goals", {}, one.cookie);
  assert.equal(goalsWithAssessment.body.profile.currentBand, 7.5);
  assert.ok(goalsWithAssessment.body.warning);
  const scores = { listening: 7.5, reading: 7, writing: 6.5, speaking: 7 };
  saved = await request(
    "/api/goals",
    {
      method: "PUT",
      body: JSON.stringify({ ...input, useExistingScores: true, scores }),
    },
    one.cookie,
  );
  assert.equal(saved.body.nextStep, "roadmap");
  assert.equal(saved.body.profile.currentBand, 7);
  const rows = await admin
    .from("learning_goals")
    .select("id")
    .eq("user_id", one.id);
  assert.equal(rows.data.length, 1);
  const catalog = await request("/api/practice", {}, one.cookie);
  assert.equal(catalog.status, 200);
  assert.equal(catalog.body.selectedBand, "6_7");
  assert.equal(catalog.body.exercises.length, 2);
  assert.ok(
    catalog.body.exercises.every((exercise) => exercise.band_group === "6_7"),
  );
  const anonymous = await request("/api/practice?band=all");
  assert.equal(anonymous.body.exercises.length, 8);
  const filtered = await request(
    "/api/practice?skill=reading&band=8_plus&type=matching_headings",
  );
  assert.equal(filtered.body.exercises.length, 1);
  assert.equal((await request("/api/practice?band=unknown")).status, 400);
  assert.equal((await request("/api/practice/missing-resource")).status, 404);
  const exercise = await request("/api/practice/voa-sleepy-teens-reading");
  assert.equal(exercise.body.exercise.questions.length, 5);
  assert.equal(exercise.body.exercise.source_attribution, "VOA Learning English");
  assert.match(exercise.body.exercise.source_url, /^https:\/\//);
  assert.ok(!JSON.stringify(exercise.body).includes('"correct_answer"'));
  assert.ok(!JSON.stringify(exercise.body).includes('"transcript"'));
  const protectedWrite = await one.client
    .from("practice_exercises")
    .update({ title: "overwrite" })
    .eq("slug", "voa-sleepy-teens-reading");
  assert.ok(protectedWrite.error);
  const privateRows = await admin
    .from("practice_exercises")
    .insert({
      slug: "unpublished-test-" + Date.now(),
      title: "Hidden",
      summary: "",
      skill: "reading",
      band_group: "below_5",
      question_types: ["gap_fill"],
      duration_minutes: 1,
      question_count: 1,
      passage: ["Hidden passage"],
      is_published: false,
    })
    .select("id,slug")
    .single();
  assert.ifError(privateRows.error);
  try {
    assert.equal(
      (await request(`/api/practice/${privateRows.data.slug}`)).status,
      404,
    );
  } finally {
    await admin
      .from("practice_exercises")
      .delete()
      .eq("id", privateRows.data.id);
  }
  const audioExercise = await request(
    "/api/practice/voa-sleepy-teens-listening",
  );
  const audio = await fetch(
    `http://localhost:${port}${audioExercise.body.exercise.audio_path}`,
    { headers: { Range: "bytes=0-1023" } },
  );
  assert.equal(audio.status, 206);
  assert.match(audio.headers.get("content-type"), /audio\/mpeg/);
  const header = new Uint8Array(await audio.arrayBuffer());
  assert.equal(header.length, 1024);
  console.log(
    "PASS: real local APIs, session cookies, US-102 CRUD/validation, band recommendation, filtered bank, RLS isolation, unpublished content, and MP3 byte-range streaming.",
  );
} finally {
  for (const id of users) await admin.auth.admin.deleteUser(id);
  server.kill();
}
