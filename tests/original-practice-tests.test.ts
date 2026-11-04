import test from "node:test";
import assert from "node:assert/strict";
import {
  originalPracticeTests,
  practiceSkills,
} from "../src/data/original-practice-tests.ts";

test("US-301 provides ten original tests for each IELTS skill", () => {
  assert.equal(originalPracticeTests.length, 40);
  for (const skill of [
    "reading",
    "listening",
    "writing",
    "speaking",
  ] as const) {
    const tests = originalPracticeTests.filter((test) => test.skill === skill);
    assert.equal(tests.length, 10);
    assert.ok(
      tests.every((test) => test.slug.startsWith(`original-${skill}-`)),
    );
  }
  assert.deepEqual(
    practiceSkills.map((skill) => skill.value),
    ["all", "reading", "listening", "writing", "speaking"],
  );
});
