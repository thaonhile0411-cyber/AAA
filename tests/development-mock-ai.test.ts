import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createMockSpeakingAssessment,
  createMockWritingAssessment,
  isMockAiEvaluationEnabled,
} from "../src/lib/development-mock-ai.ts";

test("mock AI evaluation is enabled only for explicit local development mode", () => {
  assert.equal(
    isMockAiEvaluationEnabled({ nodeEnv: "development", mode: "mock" }),
    true,
  );
  assert.equal(
    isMockAiEvaluationEnabled({ nodeEnv: "production", mode: "mock" }),
    false,
  );
  assert.equal(
    isMockAiEvaluationEnabled({ nodeEnv: "development", mode: "gemini" }),
    false,
  );
});

test("mock assessments are complete, labelled, and require no provider key", () => {
  const writing = createMockWritingAssessment(260);
  const speaking = createMockSpeakingAssessment(3);

  assert.equal(writing.status, "success");
  assert.equal(writing.provider, "mock");
  assert.equal(writing.overallBand, 5.5);
  assert.ok(writing.criteria);
  assert.match(writing.message ?? "", /mô phỏng/i);

  assert.equal(speaking.status, "success");
  assert.equal(speaking.provider, "mock");
  assert.equal(speaking.overallBand, 5.5);
  assert.ok(speaking.criteria);
  assert.match(speaking.message ?? "", /mô phỏng/i);
});
