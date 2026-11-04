import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addDays,
  goalWarning,
  isCalendarDate,
  overallBand,
  todayInVietnam,
  validateGoals,
  TARGET_BANDS,
  STUDY_OPTIONS,
  type GoalInput,
} from "../src/lib/goals.ts";

const today = "2026-11-03";
const valid: GoalInput = {
  targetBand: 7,
  examDate: "2026-12-30",
  dailyStudyMinutes: 60,
  useExistingScores: false,
  scores: null,
};

test("acceptance: 7.0, 30/12/2026, 1 hour is valid", () => {
  assert.deepEqual(validateGoals(valid, today), { ok: true, data: valid });
});

test("all target half bands and all five daily time options are accepted", () => {
  for (const targetBand of TARGET_BANDS)
    for (const option of STUDY_OPTIONS) {
      assert.equal(
        validateGoals(
          { ...valid, targetBand, dailyStudyMinutes: option.value },
          today,
        ).ok,
        true,
      );
    }
});

test("reject missing fields, wrong types, non half bands, and unsupported times", () => {
  for (const body of [
    null,
    [],
    {},
    { ...valid, targetBand: "7" },
    { ...valid, targetBand: 2.5 },
    { ...valid, targetBand: 9.5 },
    { ...valid, targetBand: 6.2 },
    { ...valid, dailyStudyMinutes: 45 },
    { ...valid, dailyStudyMinutes: null },
    { ...valid, useExistingScores: "true" },
  ]) {
    assert.equal(validateGoals(body, today).ok, false, JSON.stringify(body));
  }
});

test("date boundary: today, yesterday, +6 are invalid; exactly +7 is valid", () => {
  for (const examDate of ["2026-11-02", today, "2026-11-09"])
    assert.equal(validateGoals({ ...valid, examDate }, today).ok, false);
  assert.equal(
    validateGoals({ ...valid, examDate: "2026-11-10" }, today).ok,
    true,
  );
});

test("calendar rejects impossible or non ISO dates and handles leap years/year rollover", () => {
  for (const value of [
    "2026-02-29",
    "2026-02-30",
    "2026-13-01",
    "12/30/2026",
    "2026-11-10T00:00:00Z",
    "",
    null,
  ])
    assert.equal(isCalendarDate(value), false);
  assert.equal(isCalendarDate("2028-02-29"), true);
  assert.equal(addDays("2026-12-28", 7), "2027-01-04");
  assert.equal(addDays("2028-02-23", 7), "2028-03-01");
});

test("Vietnam calendar changes at UTC 17:00, independently of the server timezone", () => {
  assert.equal(todayInVietnam(new Date("2026-11-03T16:59:59Z")), "2026-11-03");
  assert.equal(todayInVietnam(new Date("2026-11-03T17:00:00Z")), "2026-11-04");
});

test("existing score bypass requires all four valid skills, including 0.0", () => {
  const scores = { listening: 7.5, reading: 7, writing: 6.5, speaking: 7 };
  assert.equal(
    validateGoals({ ...valid, useExistingScores: true, scores }, today).ok,
    true,
  );
  assert.equal(overallBand(scores), 7);
  for (const bad of [
    null,
    {},
    { ...scores, writing: null },
    { ...scores, reading: 9.5 },
    { ...scores, speaking: 6.2 },
    { ...scores, listening: "7" },
  ]) {
    assert.equal(
      validateGoals({ ...valid, useExistingScores: true, scores: bad }, today)
        .ok,
      false,
    );
  }
  assert.equal(
    validateGoals({ ...valid, useExistingScores: false, scores }, today).ok,
    false,
  );
  assert.equal(
    validateGoals(
      {
        ...valid,
        useExistingScores: true,
        scores: { listening: 0, reading: 0, writing: 0, speaking: 0 },
      },
      today,
    ).ok,
    true,
  );
});

test("overall uses half-band rounding at .25 and .75", () => {
  assert.equal(
    overallBand({ listening: 6.5, reading: 6.5, writing: 6, speaking: 6 }),
    6.5,
  );
  assert.equal(
    overallBand({ listening: 7, reading: 7, writing: 6.5, speaking: 6.5 }),
    7,
  );
});

test("warn on equal/lower targets, allow higher targets, cap suggestion at 9.0", () => {
  assert.ok(goalWarning(6, 7));
  assert.ok(goalWarning(7, 7));
  assert.equal(goalWarning(7.5, 7), null);
  assert.equal(goalWarning(7, null), null);
  assert.match(goalWarning(8.5, 9)!, /duy tr\u00ec/);
  assert.doesNotMatch(goalWarning(9, 9)!, /9\.5/);
});
