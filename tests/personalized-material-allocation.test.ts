import assert from "node:assert/strict";
import { test } from "node:test";
import { originalPracticeTests } from "../src/data/original-practice-tests.ts";
import { profileFromPlacementAssessment } from "../src/lib/learner-skill-profile.ts";
import {
  createMaterialAllocationPlan,
  inventoryFromResources,
} from "../src/lib/personalized-material-allocation.ts";

function completedProfile() {
  return profileFromPlacementAssessment({
    skills: {
      listening: { band: 4.5 },
      reading: { band: 5 },
      writing: { band: 6 },
      speaking: { band: 6 },
    },
  })!;
}

test("material priority percentage gives more weight to lower skills", () => {
  const plan = createMaterialAllocationPlan(
    completedProfile(),
    { listening: 10, reading: 10, writing: 10, speaking: 10 },
    { targetBand: 6.5, requestedItems: 12 },
  )!;

  assert.equal(plan.allocatedItems, 12);
  assert.ok(plan.allocations.listening.desiredPercent > plan.allocations.reading.desiredPercent);
  assert.ok(plan.allocations.reading.desiredPercent > plan.allocations.writing.desiredPercent);
  assert.ok(plan.allocations.listening.allocatedItems > plan.allocations.writing.allocatedItems);
  assert.equal(
    Object.values(plan.allocations).reduce((total, item) => total + item.allocatedItems, 0),
    12,
  );
});

test("allocation never exceeds an individual skill inventory and redistributes the remainder", () => {
  const plan = createMaterialAllocationPlan(
    completedProfile(),
    { listening: 2, reading: 10, writing: 10, speaking: 10 },
    { targetBand: 7, requestedItems: 12 },
  )!;

  assert.equal(plan.allocations.listening.allocatedItems, 2);
  assert.equal(plan.allocations.listening.limitedByInventory, true);
  assert.equal(plan.allocatedItems, 12);
  assert.equal(
    Object.values(plan.allocations).reduce((total, item) => total + item.allocatedItems, 0),
    12,
  );
});

test("current resource bank is counted dynamically as ten sets for every skill", () => {
  assert.deepEqual(inventoryFromResources(originalPracticeTests), {
    listening: 10,
    reading: 10,
    writing: 10,
    speaking: 10,
  });
});

test("incomplete assessment cannot produce a personalized allocation", () => {
  const partial = profileFromPlacementAssessment({
    skills: {
      listening: { band: 5 },
      reading: { band: 5.5 },
      writing: { band: null },
      speaking: { band: 6 },
    },
  })!;
  assert.equal(createMaterialAllocationPlan(partial, { listening: 10 }), null);
});
