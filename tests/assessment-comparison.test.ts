import assert from "node:assert/strict";
import { test } from "node:test";
import { comparisonFromAssessmentRows } from "../src/lib/assessment-comparison.ts";

function assessment(bands: Record<string, number>) {
  return {
    skills: Object.fromEntries(
      Object.entries(bands).map(([skill, band]) => [skill, { band }]),
    ),
  };
}

test("compares a placement baseline to the newest reassessment across four skills", () => {
  const comparison = comparisonFromAssessmentRows([
    {
      id: "baseline",
      assessment_kind: "placement",
      created_at: "2026-10-01T00:00:00.000Z",
      assessment_results: assessment({ listening: 4.5, reading: 5, writing: 5, speaking: 5.5 }),
    },
    {
      id: "reassessment-1",
      assessment_kind: "reassessment",
      created_at: "2026-11-01T00:00:00.000Z",
      assessment_results: assessment({ listening: 5.5, reading: 5.5, writing: 5.5, speaking: 5.5 }),
    },
    {
      id: "reassessment-2",
      assessment_kind: "reassessment",
      created_at: "2026-12-01T00:00:00.000Z",
      assessment_results: assessment({ listening: 6, reading: 5.5, writing: 6, speaking: 6 }),
    },
  ]);

  assert.equal(comparison?.baseline.id, "baseline");
  assert.equal(comparison?.reassessment.id, "reassessment-2");
  assert.equal(comparison?.skillChanges.listening, 1.5);
  assert.equal(comparison?.skillChanges.reading, 0.5);
  assert.equal(comparison?.overallChange, 1);
});

test("does not invent a comparison when a reassessment is unavailable", () => {
  assert.equal(
    comparisonFromAssessmentRows([
      {
        id: "baseline",
        assessment_kind: "placement",
        created_at: "2026-10-01T00:00:00.000Z",
        assessment_results: assessment({ listening: 5, reading: 5, writing: 5, speaking: 5 }),
      },
    ]),
    null,
  );
});
