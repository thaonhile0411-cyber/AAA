import assert from "node:assert/strict";
import { test } from "node:test";
import { profileFromPlacementAssessment } from "../src/lib/learner-skill-profile.ts";

test("creates a four-skill profile and recomputes its overall band", () => {
  const profile = profileFromPlacementAssessment({
    overallBand: 9,
    submittedAt: "2026-11-04T08:00:00.000Z",
    skills: {
      listening: { band: 4.5 },
      reading: { band: 6 },
      writing: { band: 5 },
      speaking: { band: 5.5 },
    },
  });

  assert.deepEqual(profile?.skills, {
    listening: 4.5,
    reading: 6,
    writing: 5,
    speaking: 5.5,
  });
  assert.equal(profile?.overallBand, 5.5);
  assert.equal(profile?.strongestSkill, "reading");
  assert.equal(profile?.weakestSkill, "listening");
  assert.equal(profile?.isComplete, true);
});

test("preserves an unassessed skill as null and does not invent an overall band", () => {
  const profile = profileFromPlacementAssessment({
    overallBand: 6.5,
    skills: {
      listening: { band: 5.5 },
      reading: { band: 6 },
      writing: { band: null },
      speaking: { band: 6 },
    },
  });

  assert.equal(profile?.skills.writing, null);
  assert.equal(profile?.overallBand, null);
  assert.equal(profile?.isComplete, false);
});

test("rejects an absent or corrupt saved assessment", () => {
  assert.equal(profileFromPlacementAssessment(null), null);
  assert.equal(profileFromPlacementAssessment({ skills: { listening: { band: 12 } } }), null);
});
