import test from "node:test";
import assert from "node:assert/strict";
import {
  scoresFromDatabase,
  profileFromRow,
  type GoalRow,
} from "../src/lib/goal-record.ts";
const row: GoalRow = {
  target_band: "7.0",
  expected_exam_date: "2027-06-01",
  available_minutes_per_day: 60,
  self_reported_scores: null,
  updated_at: "2026-11-03T00:00:00Z",
};
test("saved goals use the assessed placement band when no recent IELTS scores exist", () => {
  assert.equal(profileFromRow(row, 6.5).currentBand, 6.5);
  assert.equal(profileFromRow(row, 6.5).scoreSource, "placement");
  assert.equal(profileFromRow(row, 6.5).useExistingScores, false);
});
test("self-reported scores take precedence and the server recomputes overall", () => {
  const result = profileFromRow(
    {
      ...row,
      self_reported_scores: {
        listening: 7.5,
        reading: 7,
        writing: 6.5,
        speaking: 7,
      },
    },
    4,
  );
  assert.equal(result.currentBand, 7);
  assert.equal(result.scoreSource, "self_reported");
  assert.equal(result.useExistingScores, true);
});
test("corrupt score JSON never becomes a fake zero band", () => {
  for (const invalid of [
    [],
    {},
    { listening: null },
    { listening: "7", reading: 7, writing: 7, speaking: 7 },
  ])
    assert.equal(scoresFromDatabase(invalid), null);
});
