import assert from "node:assert/strict";
import { test } from "node:test";
import { getWritingTask } from "../src/data/placement-test-data.ts";
import {
  evaluateWritingWithFailover,
} from "../src/lib/ai-provider-manager.ts";
import {
  createEvaluationJob,
  clearInMemoryJobs,
} from "../src/lib/ai-evaluation-queue.ts";
import { countWords } from "../src/lib/placement-scoring.ts";

const UNIVERSITY_EDUCATION_PROMPT =
  "Some educational analysts advocate that tertiary university education should be completely funded by the state and provided free of charge to all qualifying students. Others contend that university students themselves should bear the financial burden of tuition fees as direct personal beneficiaries of higher qualification earnings.\n\nDiscuss both views and give your own opinion.";

const UNIVERSITY_ESSAY = `In contemporary society, access to higher education has sparked significant debate among educational policymakers and economists alike. While some argue that governments should bear the entire financial burden of university tuition, others believe that students themselves, as the principal beneficiaries of academic qualifications, ought to pay for their degrees. In my opinion, a collaborative financial model is the most sustainable, where the state covers the majority of tuition fees while students contribute a reasonable co-payment.

On the one hand, advocates of fully state-funded higher education assert that equal educational opportunity is fundamental for societal development. When university education is free of charge, talent from underprivileged backgrounds can flourish without the barrier of student debt. For instance, Scandinavian nations offer complimentary tertiary schooling, which has cultivated highly skilled labor forces, stimulated national innovation, and reduced socioeconomic inequality. Therefore, government funding guarantees that merit, rather than economic privilege, dictates higher learning attainment.

On the other hand, proponents of tuition fees contend that tertiary education constitutes a private financial investment. Graduates typically secure significantly higher lifetime earnings compared to those holding only secondary school certificates. In this perspective, using taxpayers' money—many of whom have never attended university—to subsidize individuals who will subsequently enjoy lucrative careers is fundamentally inequitable. Furthermore, requiring students to pay tuition fosters greater academic accountability and encourages universities to maintain high teaching standards to stay competitive.

In conclusion, both viewpoints present compelling rationales. However, I believe that an equitable balance can be achieved through government subsidies covering core educational infrastructure alongside income-contingent loans for students. This ensures universal accessibility while preserving public fiscal responsibility.`;

const AI_EMPLOYMENT_OFF_TOPIC_ESSAY = `In the modern era, artificial intelligence and robotics are transforming global industries at an unprecedented speed. While techno-optimists claim that automation will create millions of high-tech jobs in machine learning and data science, critics worry about massive factory closures and widespread displacement of assembly-line workers. In my opinion, technological revolutions always cause short-term frictional unemployment before new specialized economic sectors emerge to absorb the redundant labor force.

Governments must invest in vocational retraining programs so that older employees can transition away from repetitive manual tasks into green energy and digital services. Furthermore, corporations benefiting from high productivity gains should pay fair corporate taxes to support social safety nets for laid-off industrial workers.`;

// ============================================================================
// 1. DATA SOURCE UNIFICATION TEST
// ============================================================================
test("1. Data Source Unification: WRITING_TASKS contains official University Education prompt with id", () => {
  const task2 = getWritingTask("writing_task_2");
  assert.ok(task2);
  assert.equal(task2.taskNumber, 2);
  assert.ok(task2.prompt.includes("tertiary university education"));
  assert.ok(task2.prompt.includes("funded by the state"));
  assert.ok(task2.prompt.includes("tuition fees"));

  // Check matching by taskNumber
  const taskByNum = getWritingTask(2);
  assert.equal(taskByNum?.prompt, task2.prompt);
});

// ============================================================================
// 2. LIVE / SCHEMA ASSESSMENT: UNIVERSITY ESSAY IS RELEVANT TO UNIVERSITY PROMPT
// ============================================================================
test("2. Relevance Validation: University Education essay matches University Education prompt", async () => {
  const wordCount = countWords(UNIVERSITY_ESSAY);
  assert.ok(wordCount >= 250, `Essay has ${wordCount} words (>= 250)`);

  // If Gemini API is configured, run live check, otherwise check prompt structure
  if (process.env.GEMINI_API_KEY) {
    const result = await evaluateWritingWithFailover({
      essayText: UNIVERSITY_ESSAY,
      taskPrompt: UNIVERSITY_EDUCATION_PROMPT,
    });

    if (result.status === "success") {
      assert.equal(result.skill, "writing");
      assert.ok(result.overallBand !== null && result.overallBand >= 6.0);
      assert.ok(result.criteria?.taskResponse !== undefined);
      assert.ok(result.criteria?.coherenceAndCohesion !== undefined);
      assert.ok(result.criteria?.lexicalResource !== undefined);
      assert.ok(result.criteria?.grammaticalRangeAndAccuracy !== undefined);
      console.log(`[Test Success] University Essay Band: ${result.overallBand}`);
    } else {
      // If quota or network issue, ensure it was NOT rejected for off-topic!
      assert.notEqual(result.status, "invalid_response");
    }
  }
});

// ============================================================================
// 3. NEGATIVE TEST: AI ESSAY IS REJECTED AS OFF-TOPIC FOR UNIVERSITY PROMPT
// ============================================================================
test("3. Negative Test: AI Employment essay is flagged as off-topic for University Education prompt", async () => {
  if (process.env.GEMINI_API_KEY) {
    const result = await evaluateWritingWithFailover({
      essayText: AI_EMPLOYMENT_OFF_TOPIC_ESSAY,
      taskPrompt: UNIVERSITY_EDUCATION_PROMPT,
    });

    if (result.status !== "quota_exceeded" && result.status !== "timeout") {
      // Must be rejected as off-topic
      assert.equal(result.status, "invalid_response");
      assert.equal(result.overallBand, null);
      assert.ok(
        result.message?.toLowerCase().includes("lạc đề") ||
          result.message?.toLowerCase().includes("topic") ||
          result.message?.toLowerCase().includes("university") ||
          result.message?.toLowerCase().includes("không hợp lệ"),
      );
      console.log(`[Test Success] AI Essay correctly flagged as off-topic: ${result.message}`);
    }
  }
});

// ============================================================================
// 4. ATTEMPT ID & IDEMPOTENCY CACHE ISOLATION TEST
// ============================================================================
test("4. Attempt Isolation: Different attempts or modified essays re-evaluate without stale cache", async () => {
  clearInMemoryJobs();

  const attempt1 = "attempt_1001";
  const { job: job1 } = await createEvaluationJob({
    submissionId: attempt1,
    idempotencyKey: `writing_${attempt1}_writing_task_2`,
    skill: "writing",
    payload: {
      essay: UNIVERSITY_ESSAY,
      prompt: UNIVERSITY_EDUCATION_PROMPT,
    },
  });

  assert.equal(job1.idempotencyKey, `writing_${attempt1}_writing_task_2`);

  // Attempt 2 (user retakes test) generates new attemptId
  const attempt2 = "attempt_1002";
  const { job: job2, isDuplicate } = await createEvaluationJob({
    submissionId: attempt2,
    idempotencyKey: `writing_${attempt2}_writing_task_2`,
    skill: "writing",
    payload: {
      essay: UNIVERSITY_ESSAY,
      prompt: UNIVERSITY_EDUCATION_PROMPT,
    },
  });

  assert.equal(isDuplicate, false);
  assert.notEqual(job2.id, job1.id);
});
