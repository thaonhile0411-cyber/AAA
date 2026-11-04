import assert from "node:assert/strict";
import { test } from "node:test";
import { createAdaptiveRoadmapPlan } from "../src/lib/adaptive-roadmap.ts";

const baseline = { listening: 5, reading: 5, writing: 5, speaking: 5 } as const;

test("accelerates only a skill with a qualifying 0.5-band gain and phase target", () => {
  const plan = createAdaptiveRoadmapPlan({
    baseline,
    reassessment: { listening: 5.5, reading: 5, writing: 5, speaking: 5 },
    targetBand: 6.5,
    dailyStudyMinutes: 30,
    nextPhaseNumber: 2,
  })!;

  const listening = plan.adjustments.find((item) => item.skill === "listening")!;
  assert.equal(listening.kind, "accelerated");
  assert.equal(listening.phaseTargetBand, 5.5);
  assert.equal(listening.difficultyBandMin, 6);
  assert.match(plan.notification, /tăng tốc/i);
});

test("adds two foundational review tasks for each unchanged comparable score", () => {
  const plan = createAdaptiveRoadmapPlan({
    baseline,
    reassessment: baseline,
    targetBand: 6.5,
    dailyStudyMinutes: 15,
    nextPhaseNumber: 2,
  })!;

  assert.equal(plan.tasks.filter((task) => task.kind === "foundation_review").length, 8);
  assert.equal(plan.scheduleRisk, false);
  assert.ok(plan.totalMinutes <= plan.weeklyBudgetMinutes);
});

test("reduces workload and targets a declining skill", () => {
  const plan = createAdaptiveRoadmapPlan({
    baseline,
    reassessment: { listening: 4.5, reading: 5, writing: 5.5, speaking: 5 },
    targetBand: 6.5,
    dailyStudyMinutes: 30,
    nextPhaseNumber: 2,
  })!;

  const listening = plan.adjustments.find((item) => item.skill === "listening")!;
  assert.equal(listening.kind, "targeted_review");
  assert.equal(listening.estimatedMinutesPerTask, 10);
  assert.ok(plan.paceRecommendation);
});

test("does not create a speculative plan from incomplete or invalid comparison data", () => {
  assert.equal(
    createAdaptiveRoadmapPlan({
      baseline: { ...baseline, speaking: null },
      reassessment: baseline,
      targetBand: 6.5,
      dailyStudyMinutes: 30,
      nextPhaseNumber: 2,
    }),
    null,
  );
});
