import test from "node:test";
import assert from "node:assert/strict";
import { validatePracticeSubmission } from "../src/lib/practice-results.ts";

const questionId = "11111111-1111-4111-8111-111111111111";
const submissionId = "22222222-2222-4222-8222-222222222222";

test("US-302 accepts a bounded answer map and preserves blanks for server scoring", () => {
  const result = validatePracticeSubmission({
    submissionId,
    answers: { [questionId]: "  Apple  " },
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.data.answers[questionId], "  Apple  ");
});

test("US-302 rejects invalid IDs, non-string answers and oversized answers", () => {
  assert.equal(validatePracticeSubmission({ submissionId: "bad", answers: {} }).ok, false);
  assert.equal(
    validatePracticeSubmission({ submissionId, answers: { [questionId]: 7 } }).ok,
    false,
  );
  assert.equal(
    validatePracticeSubmission({
      submissionId,
      answers: { [questionId]: "x".repeat(501) },
    }).ok,
    false,
  );
});
