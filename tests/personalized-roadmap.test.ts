import assert from "node:assert/strict";
import { test } from "node:test";
import { originalPracticeTests } from "../src/data/original-practice-tests.ts";
import { profileFromPlacementAssessment } from "../src/lib/learner-skill-profile.ts";
import { createPersonalizedRoadmapDraft } from "../src/lib/personalized-roadmap.ts";

const profile = profileFromPlacementAssessment({
  skills: {
    listening: { band: 4.5 },
    reading: { band: 5.5 },
    writing: { band: 6.5 },
    speaking: { band: 6.5 },
  },
})!;

test("personalized roadmap selects real resources in proportion to the weakest skill", () => {
  const roadmap = createPersonalizedRoadmapDraft(profile, 7, originalPracticeTests, 12)!;
  const activities = roadmap.milestones.flatMap((milestone) => milestone.activities);
  const listening = activities.filter((activity) => activity.skill === "listening");
  const writing = activities.filter((activity) => activity.skill === "writing");

  assert.equal(activities.length, 12);
  assert.ok(listening.length > writing.length);
  assert.equal(new Set(activities.map((activity) => activity.resourceSlug)).size, activities.length);
  assert.ok(activities.every((activity) => activity.estimatedMinutes >= 5));
});

test("roadmap uses only resources that exist in the provided inventory", () => {
  const inventory = originalPracticeTests.filter(
    (resource) => resource.skill === "listening" || resource.skill === "reading",
  );
  const roadmap = createPersonalizedRoadmapDraft(profile, 7, inventory, 20)!;
  const activities = roadmap.milestones.flatMap((milestone) => milestone.activities);

  assert.equal(activities.length, inventory.length);
  assert.ok(activities.every((activity) => inventory.some((resource) => resource.slug === activity.resourceSlug)));
});
