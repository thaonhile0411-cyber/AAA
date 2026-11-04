import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateStreak, lastSevenActivity } from "../src/features/dashboard/streak.ts";

test("first completion starts a streak and same-day duplicates do not increase it", () => {
  assert.equal(calculateStreak(["2026-11-05", "2026-11-05"], "2026-11-05"), 1);
});

test("today extends yesterday while an unfinished today keeps yesterday's streak visible", () => {
  assert.equal(calculateStreak(["2026-11-03", "2026-11-04", "2026-11-05"], "2026-11-05"), 3);
  assert.equal(calculateStreak(["2026-11-03", "2026-11-04"], "2026-11-05"), 2);
});

test("a missed full calendar day resets the streak and a later completion starts at one", () => {
  assert.equal(calculateStreak(["2026-11-03"], "2026-11-05"), 0);
  assert.equal(calculateStreak(["2026-11-03", "2026-11-05"], "2026-11-05"), 1);
});

test("seven-day chart returns exactly seven local calendar dates and active colors", () => {
  const week = lastSevenActivity({ "2026-10-30": 1, "2026-11-04": 3 }, "2026-11-05");
  assert.equal(week.length, 7);
  assert.deepEqual(week[0], { date: "2026-10-30", completions: 1, active: true });
  assert.deepEqual(week[5], { date: "2026-11-04", completions: 3, active: true });
  assert.deepEqual(week[6], { date: "2026-11-05", completions: 0, active: false });
});
