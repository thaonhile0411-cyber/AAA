import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import {
  bandGroupFor,
  draftKey,
  newDraft,
  restoreDraft,
  applyHighlight,
  passageSegments,
  PLAYBACK_SPEEDS,
  AUTO_SAVE_MS,
  type Exercise,
  type Highlight,
} from "../src/lib/practice.ts";

const exercise: Exercise = {
  id: "exercise-1",
  slug: "test",
  title: "Test",
  summary: "",
  skill: "reading",
  band_group: "5_6",
  question_types: ["gap_fill", "multiple_choice"],
  duration_minutes: 10,
  question_count: 2,
  source_title: null,
  source_url: null,
  source_license: null,
  source_attribution: null,
  passage: ["A short paragraph for annotation."],
  audio_path: null,
  audio_bytes: null,
  audio_mime: null,
  content_version: 1,
  questions: [
    {
      id: "q1",
      position: 1,
      type: "gap_fill",
      prompt: "",
      instruction: "",
      options: [],
    },
    {
      id: "q2",
      position: 2,
      type: "multiple_choice",
      prompt: "",
      instruction: "",
      options: ["A", "B"],
    },
  ],
};
test("every half-band belongs to exactly one group; 6.5 uses the higher group", () => {
  for (let band = 0; band <= 9; band += 0.5)
    assert.equal(
      bandGroupFor(band),
      band < 5 ? "below_5" : band < 6.5 ? "5_6" : band < 8 ? "6_7" : "8_plus",
    );
  for (const band of [null, NaN, Infinity, -1, 10])
    assert.equal(bandGroupFor(band), null);
});
test("restores answers, annotations, note, speed and audio position after a reload", () => {
  const draft = {
    ...newDraft(1),
    answers: { q1: "garden", q2: "B" },
    highlights: [
      {
        id: "h",
        paragraph: 0,
        start: 2,
        end: 7,
        color: "yellow" as const,
        note: "New word",
      },
    ],
    notes: "Review this",
    audioTime: 32.4,
    speed: 1.25,
  };
  assert.deepEqual(restoreDraft(JSON.stringify(draft), exercise), draft);
  assert.equal(AUTO_SAVE_MS, 15000);
  assert.deepEqual(PLAYBACK_SPEEDS, [0.8, 1, 1.25, 1.5]);
});
test("rejects corrupted/stale drafts and discards invalid answers and ranges", () => {
  for (const raw of [
    "{",
    "null",
    JSON.stringify({ version: 2 }),
    JSON.stringify({ ...newDraft(2) }),
  ])
    assert.equal(restoreDraft(raw, exercise), null);
  const restored = restoreDraft(
    JSON.stringify({
      ...newDraft(1),
      answers: { q1: "ok", q2: "UNKNOWN", q3: "not a question" },
      audioTime: -20,
      speed: 3,
      highlights: [
        {
          id: "bad",
          paragraph: 0,
          start: 0,
          end: 999,
          color: "green",
          note: "",
        },
      ],
    }),
    exercise,
  )!;
  assert.deepEqual(restored.answers, { q1: "ok" });
  assert.deepEqual(restored.highlights, []);
  assert.equal(restored.audioTime, 0);
  assert.equal(restored.speed, 1);
});
test("draft keys isolate accounts, guests and different exercises", () => {
  const keys = [
    draftKey("a", "1"),
    draftKey("b", "1"),
    draftKey(null, "1"),
    draftKey("a", "2"),
  ];
  assert.equal(new Set(keys).size, 4);
});
test("highlight recolouring and partial removal preserve text offsets and outside notes", () => {
  const first: Highlight = {
    id: "first",
    paragraph: 0,
    start: 2,
    end: 20,
    color: "yellow",
    note: "Keep",
  };
  const selection = { id: "second", paragraph: 0, start: 5, end: 10 };
  const coloured = applyHighlight([first], selection, "green");
  assert.deepEqual(
    coloured.map((h) => [h.start, h.end, h.color]),
    [
      [2, 5, "yellow"],
      [5, 10, "green"],
      [10, 20, "yellow"],
    ],
  );
  assert.equal(coloured[0].note, "Keep");
  const removed = applyHighlight(
    coloured,
    { ...selection, start: 4, end: 12 },
    null,
  );
  assert.deepEqual(
    removed.map((h) => [h.start, h.end]),
    [
      [2, 4],
      [12, 20],
    ],
  );
  assert.equal(
    passageSegments(exercise.passage![0], 0, removed)
      .map((s) => s.text)
      .join(""),
    exercise.passage![0],
  );
});
test("repository content covers both skills in every band and every audio is a real MP3 below 15 MB", () => {
  const records = JSON.parse(
    readFileSync(
      new URL("../content/practice-exercises-voa.json", import.meta.url),
      "utf8",
    ),
  );
  for (const band of ["below_5", "5_6", "6_7", "8_plus"])
    for (const skill of ["reading", "listening"])
      assert.ok(
        records.some(
          (e: Exercise) => e.band_group === band && e.skill === skill,
        ),
      );
  for (const record of records) {
    assert.ok(record.questions.length >= 5);
    assert.equal(record.source.attribution, "VOA Learning English");
    assert.equal(record.source.license, "Public domain");
    assert.match(record.source.url, /^https:\/\//);
    if (record.skill === "listening") {
      const path = new URL(
        `../public/audio/${record.slug}.mp3`,
        import.meta.url,
      );
      assert.ok(statSync(path).size < 15000000 && statSync(path).size > 1000);
      const header = readFileSync(path).subarray(0, 3);
      assert.ok(header.toString() === "ID3" || header[0] === 0xff);
    }
  }
});
