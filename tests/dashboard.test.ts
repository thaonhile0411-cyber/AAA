import assert from "node:assert/strict";
import { test } from "node:test";
import {
  progress,
  studyTime,
  currentAssessment,
  availableBand,
  taskHref,
  type Overview,
} from "../src/features/dashboard/model.ts";
import { ActiveClock } from "../src/features/dashboard/active-time.ts";
const empty: Overview = {
  totalSeconds: 0,
  total: 0,
  completed: 0,
  targetBand: null,
  currentBand: null,
  assessmentDate: null,
  placementResult: null,
  tasks: [],
  unscheduled: [],
};
test("450 minutes and 15/60 lessons match the acceptance scenario", () => {
  assert.deepEqual(studyTime(450 * 60), { hours: 7.5, label: "7 giờ 30 phút" });
  assert.equal(progress(15, 60), 25);
  assert.equal(progress(16, 60), 26.7);
  assert.equal(progress(0, 0), 0);
});
test("failed/pending assessments are never displayed as a fabricated band", () => {
  assert.equal(availableBand(0, "api_error"), null);
  assert.equal(availableBand(0), null);
  assert.equal(availableBand(null), null);
  assert.equal(availableBand(6, "pending"), null);
  assert.equal(currentAssessment(empty).band, null);
  const data: Overview = {
    ...empty,
    placementResult: {
      overallBand: 9,
      date: "2026-11-04T00:00:00Z",
      kind: "reassessment",
      results: {
        skills: {
          reading: { band: 5.5 },
          listening: { band: 5.5 },
          writing: { band: 5.5 },
          speaking: { band: 5.5 },
        },
      },
    },
  };
  assert.equal(currentAssessment(data).band, 5.5);
  data.placementResult!.results.skills!.writing = {
    band: 0,
    status: "api_error",
  };
  assert.equal(currentAssessment(data).band, null);
});
test("Start Learning opens the existing resource and carries the exact assignment", () => {
  assert.equal(
    taskHref({
      task_id: "task-1",
      resource_slug: "original-reading-1",
      skill: "reading",
    }),
    "/practice/original-reading-1?task=task-1&skill=reading",
  );
  assert.equal(
    taskHref({ task_id: "task-2", resource_slug: null, skill: "reading" }),
    "/roadmap",
  );
});
test("active time excludes idle, hidden tabs, lost focus, and suspended timers", () => {
  const clock = new ActiveClock(0, 3000);
  assert.equal(clock.tick(1000, true, true), 1000);
  assert.equal(clock.tick(2000, false, true), 0);
  assert.equal(clock.tick(3000, true, false), 0);
  assert.equal(clock.tick(4000, true, true), 0);
  clock.input(4000);
  assert.equal(clock.tick(5000, true, true), 1000);
  assert.equal(clock.tick(20000, true, true), 0);
  clock.input(20000);
  assert.equal(clock.tick(21000, true, true), 1000);
});
