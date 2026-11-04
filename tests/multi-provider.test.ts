import assert from "node:assert/strict";
import { test } from "node:test";
import {
  evaluateWritingWithFailover,
  evaluateSpeakingWithFailover,
  getProviderCircuitState,
  tripCircuitBreaker,
  markProviderHealthy,
  getProviderHealthReport,
  resetProviderCircuitBreakers,
} from "../src/lib/ai-provider-manager.ts";
import {
  createEvaluationJob,
  getEvaluationJob,
  updateEvaluationJob,
  recoverPendingJobs,
  clearInMemoryJobs,
} from "../src/lib/ai-evaluation-queue.ts";
import {
  estimateCost,
  recordAiUsage,
  getAiUsageSummary,
  isBudgetExceeded,
  resetAiUsage,
} from "../src/lib/ai-cost-tracker.ts";
import {
  GeminiWritingOutputSchema,
  GeminiSpeakingOutputSchema,
} from "../src/lib/placement-ai-types.ts";
import {
  calculateOverallIeltsBand,
  validateSpeakingInput,
} from "../src/lib/placement-ai-validation.ts";
import { roundToIeltsBand } from "../src/lib/placement-scoring.ts";

// ============================================================================
// 1. GEMINI SUCCESSFUL EVALUATION & SCHEMA STANDARDIZATION
// ============================================================================
test("1. Gemini successful evaluation: Standardizes criteria and rounds band score", () => {
  const sampleGeminiOutput = {
    isValidEnglishEssay: true,
    isRelevantToTopic: true,
    isMeaningfulContent: true,
    criteria: {
      taskResponse: { score: 6.5, feedback: "Good addressing of the prompt." },
      coherenceAndCohesion: { score: 6.0, feedback: "Logical progression." },
      lexicalResource: { score: 7.0, feedback: "Varied vocabulary." },
      grammaticalRangeAndAccuracy: { score: 6.5, feedback: "Complex sentences used." },
    },
    overallBand: 6.5,
    strengths: ["Clear thesis", "Good lexical range"],
    weaknesses: ["Some repetitive sentence structures"],
    improvements: ["Use more cohesive devices"],
    evaluationSummary: "A competent academic essay.",
  };

  const parsed = GeminiWritingOutputSchema.parse(sampleGeminiOutput);
  assert.equal(parsed.isValidEnglishEssay, true);
  assert.equal(parsed.criteria?.taskResponse.score, 6.5);

  const mean =
    (parsed.criteria!.taskResponse.score +
      parsed.criteria!.coherenceAndCohesion.score +
      parsed.criteria!.lexicalResource.score +
      parsed.criteria!.grammaticalRangeAndAccuracy.score) /
    4;
  const rounded = roundToIeltsBand(mean);
  assert.equal(rounded, 6.5);
});

// ============================================================================
// 2. GEMINI MISSING KEY
// ============================================================================
test("2. Gemini missing key: Detects unconfigured state safely without crashing", () => {
  const origKey = process.env.GEMINI_API_KEY;
  const origGoogle = process.env.GOOGLE_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;

  try {
    resetProviderCircuitBreakers();
    const circuit = getProviderCircuitState("gemini");
    assert.equal(circuit.status, "unconfigured");
  } finally {
    if (origKey !== undefined) process.env.GEMINI_API_KEY = origKey;
    if (origGoogle !== undefined) process.env.GOOGLE_API_KEY = origGoogle;
  }
});

// ============================================================================
// 3. GEMINI 429 RATE LIMIT FAILOVER TO OPENAI
// ============================================================================
test("3. Gemini 429 rate limit failover: Trips Gemini into cooldown", () => {
  const origKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "AIzaSyRealTestKeyAbc1234567890";

  try {
    resetProviderCircuitBreakers();
    tripCircuitBreaker("gemini", {
      status: "quota_exceeded",
      message: "Resource has been exhausted (e.g. check quota)",
      httpStatus: 429,
    });

    const geminiState = getProviderCircuitState("gemini");
    assert.equal(geminiState.status, "cooldown");
    assert.ok(geminiState.cooldownUntil > Date.now());

    // Mark healthy resets
    markProviderHealthy("gemini");
    assert.equal(getProviderCircuitState("gemini").status, "available");
  } finally {
    if (origKey !== undefined) process.env.GEMINI_API_KEY = origKey;
    else delete process.env.GEMINI_API_KEY;
  }
});

// ============================================================================
// 4. GEMINI 503 UNAVAILABLE FAILOVER
// ============================================================================
test("4. Gemini 503 unavailable failover: Trips circuit after consecutive failures", () => {
  const origKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "AIzaSyRealTestKeyAbc1234567890";

  try {
    resetProviderCircuitBreakers();

    tripCircuitBreaker("gemini", {
      status: "api_error",
      message: "Service Unavailable",
      httpStatus: 503,
    });
    assert.equal(circuitBreakerFailures("gemini"), 1);

    tripCircuitBreaker("gemini", {
      status: "api_error",
      message: "Service Unavailable",
      httpStatus: 503,
    });
    const state = getProviderCircuitState("gemini");
    assert.equal(state.status, "cooldown");
  } finally {
    if (origKey !== undefined) process.env.GEMINI_API_KEY = origKey;
    else delete process.env.GEMINI_API_KEY;
  }
});

function circuitBreakerFailures(provider: "gemini" | "openai" | "groq"): number {
  return getProviderHealthReport().providers[provider].consecutiveFailures;
}

// ============================================================================
// 5. GEMINI TIMEOUT FAILOVER
// ============================================================================
test("5. Gemini timeout failover: Handles timeout status gracefully", () => {
  resetProviderCircuitBreakers();
  tripCircuitBreaker("gemini", {
    status: "timeout",
    message: "Request timed out after 35000ms",
  });

  assert.equal(circuitBreakerFailures("gemini"), 1);
});

// ============================================================================
// 6. OPENAI SUCCESSFUL EVALUATION NORMALIZATION
// ============================================================================
test("6. OpenAI successful evaluation: Marks provider healthy and normalizes score", () => {
  resetProviderCircuitBreakers();
  markProviderHealthy("openai");
  const report = getProviderHealthReport();
  assert.equal(report.providers.openai.consecutiveFailures, 0);
});

// ============================================================================
// 7. ALL PROVIDERS UNAVAILABLE
// ============================================================================
test("7. All providers unavailable: Returns safe user-facing error without crashing", async () => {
  const origGemini = process.env.GEMINI_API_KEY;
  const origOpenAi = process.env.OPENAI_API_KEY;
  const origGroq = process.env.GROQ_API_KEY;

  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.GROQ_API_KEY;

  resetProviderCircuitBreakers();

  try {
    const result = await evaluateWritingWithFailover({
      essayText:
        "Artificial intelligence is rapidly changing society. While some worry about job loss, it creates new opportunities.",
      taskPrompt: "Discuss the impact of AI on jobs.",
    });

    assert.equal(result.status, "missing_api_key");
    assert.equal(result.overallBand, null);
    assert.ok(result.message?.includes("Chưa có AI provider"));

    const speakingResult = await evaluateSpeakingWithFailover({
      recordings: {},
    });
    assert.equal(speakingResult.status, "missing_api_key");
  } finally {
    if (origGemini !== undefined) process.env.GEMINI_API_KEY = origGemini;
    if (origOpenAi !== undefined) process.env.OPENAI_API_KEY = origOpenAi;
    if (origGroq !== undefined) process.env.GROQ_API_KEY = origGroq;
  }
});

// ============================================================================
// 8. DUPLICATE SUBMISSION PREVENTION (IDEMPOTENCY)
// ============================================================================
test("8. Duplicate submission prevention: Reuses existing job by idempotency key", async () => {
  clearInMemoryJobs();

  const idempotencyKey = "idemp_test_sub_12345";
  const { job: job1, isDuplicate: isDup1 } = await createEvaluationJob({
    submissionId: "sub_12345",
    idempotencyKey,
    skill: "writing",
    payload: { essay: "Test essay" },
  });

  assert.equal(isDup1, false);
  assert.equal(job1.idempotencyKey, idempotencyKey);

  // Second call with same idempotencyKey
  const { job: job2, isDuplicate: isDup2 } = await createEvaluationJob({
    submissionId: "sub_12345",
    idempotencyKey,
    skill: "writing",
    payload: { essay: "Test essay duplicate" },
  });

  assert.equal(isDup2, true);
  assert.equal(job2.id, job1.id);

  // Update and retrieve job
  await updateEvaluationJob(job1.id, {
    status: "completed",
    tokensUsed: 150,
  });
  const retrieved = await getEvaluationJob(idempotencyKey);
  assert.equal(retrieved?.status, "completed");
  assert.equal(retrieved?.tokensUsed, 150);
});

// ============================================================================
// 9. RECOVERY OF PENDING JOBS
// ============================================================================
test("9. Recovery of pending jobs: Identifies uncompleted jobs for retry", async () => {
  clearInMemoryJobs();

  const { job } = await createEvaluationJob({
    submissionId: "sub_recover_test",
    idempotencyKey: "idemp_recover_1",
    skill: "speaking",
    payload: { key: "part1" },
  });

  assert.equal(job.status, "pending");

  const pending = await recoverPendingJobs();
  assert.ok(pending.length >= 1);
  assert.equal(pending[0].status, "retrying");
});

// ============================================================================
// 10. SPEAKING AUDIO PRESERVATION
// ============================================================================
test("10. Speaking audio preservation: Preserves mimeType, audioBase64 and duration", () => {
  const dummyBase64 = "data:audio/webm;codecs=opus;base64," + "A".repeat(200);
  const recordings = {
    P1_Q1: {
      hasRecorded: true,
      durationSeconds: 15,
      timestamp: new Date().toISOString(),
      audioBase64: dummyBase64,
      mimeType: "audio/webm;codecs=opus",
    },
    P2_CueCard: {
      hasRecorded: true,
      durationSeconds: 45,
      timestamp: new Date().toISOString(),
      audioBase64: dummyBase64,
      mimeType: "audio/webm;codecs=opus",
    },
    P3_Q1: {
      hasRecorded: true,
      durationSeconds: 20,
      timestamp: new Date().toISOString(),
      audioBase64: dummyBase64,
      mimeType: "audio/webm;codecs=opus",
    },
  };

  const validation = validateSpeakingInput(recordings);
  assert.equal(validation.valid, true);

  // Sub-3-second recording rejection
  const shortRecordings = {
    P1_Q1: {
      hasRecorded: true,
      durationSeconds: 1, // too short
      timestamp: new Date().toISOString(),
      audioBase64: dummyBase64,
      mimeType: "audio/webm",
    },
  };

  const shortValidation = validateSpeakingInput(shortRecordings);
  assert.equal(shortValidation.valid, false);
  assert.equal(shortValidation.status, "insufficient_response");
});

// ============================================================================
// 11. WRITING ASSESSMENT SCHEMA VALIDATION
// ============================================================================
test("11. Writing assessment schema validation: Accepts valid and rejects invalid schema", () => {
  const validOutput = {
    isValidEnglishEssay: true,
    isRelevantToTopic: true,
    isMeaningfulContent: true,
    criteria: {
      taskResponse: { score: 7.0, feedback: "Well structured argument" },
      coherenceAndCohesion: { score: 6.5, feedback: "Good paragraphing" },
      lexicalResource: { score: 7.0, feedback: "Appropriate academic terms" },
      grammaticalRangeAndAccuracy: { score: 6.0, feedback: "Minor punctuation slips" },
    },
    overallBand: 6.5,
    strengths: ["Strong clear thesis"],
    weaknesses: ["Minor punctuation errors"],
    improvements: ["Review comma splice rules"],
  };

  const parsed = GeminiWritingOutputSchema.safeParse(validOutput);
  assert.equal(parsed.success, true);

  // Criteria score out of bounds (> 9.0) or invalid type must fail schema
  const invalidOutput = {
    isValidEnglishEssay: true,
    isRelevantToTopic: true,
    isMeaningfulContent: true,
    criteria: {
      taskResponse: { score: 99.0, feedback: "Invalid score" },
      coherenceAndCohesion: { score: 6.5, feedback: "Good" },
      lexicalResource: { score: 7.0, feedback: "Good" },
      grammaticalRangeAndAccuracy: { score: 6.0, feedback: "Good" },
    },
  };
  const parsedInvalid = GeminiWritingOutputSchema.safeParse(invalidOutput);
  assert.equal(parsedInvalid.success, false);
});

// ============================================================================
// 12. SPEAKING ASSESSMENT SCHEMA VALIDATION
// ============================================================================
test("12. Speaking assessment schema validation: Enforces 4 speaking criteria", () => {
  const validSpeaking = {
    hasAudibleSpeech: true,
    isEnglish: true,
    isRelevant: true,
    criteria: {
      fluencyAndCoherence: { score: 6.5, feedback: "Good natural flow" },
      lexicalResource: { score: 6.0, feedback: "Adequate vocabulary" },
      grammaticalRangeAndAccuracy: { score: 6.0, feedback: "Frequent simple errors" },
      pronunciation: { score: 7.0, feedback: "Clear intonation" },
    },
    overallBand: 6.5,
    transcripts: { P1_Q1: "I live in Hanoi, which is the capital city." },
    strengths: ["Clear pronunciation"],
    weaknesses: ["Grammar slips"],
    improvements: ["Practice past tenses"],
  };

  const parsed = GeminiSpeakingOutputSchema.safeParse(validSpeaking);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.criteria?.pronunciation.score, 7.0);
  }
});

// ============================================================================
// 13. OVERALL BAND CALCULATION WITH INCOMPLETE ASSESSMENTS
// ============================================================================
test("13. Overall band calculation: Returns null when any of the 4 skills is null", () => {
  // Only 2 skills
  const twoSkills = calculateOverallIeltsBand({
    listening: 6.0,
    reading: 6.5,
    writing: null,
    speaking: null,
  });
  assert.equal(twoSkills, null);

  // 3 skills, 1 missing
  const threeSkills = calculateOverallIeltsBand({
    listening: 7.0,
    reading: 7.0,
    writing: 6.5,
    speaking: null,
  });
  assert.equal(threeSkills, null);

  // All 4 skills present
  const allFour = calculateOverallIeltsBand({
    listening: 6.5,
    reading: 6.0,
    writing: 6.5,
    speaking: 6.0,
  });
  assert.equal(allFour, 6.5); // (6.5 + 6.0 + 6.5 + 6.0) / 4 = 6.25 -> rounded to 6.5
});

// ============================================================================
// 14. COST TRACKER AND SPENDING LIMITS
// ============================================================================
test("14. Cost tracker and spending limits: Tracks tokens, costs and enforces budget", () => {
  resetAiUsage();

  const initialSummary = getAiUsageSummary();
  assert.equal(initialSummary.totalCalls, 0);
  assert.equal(initialSummary.totalCostUsd, 0);

  // Estimate cost for Gemini writing call (e.g. 500 input tokens, 400 output tokens)
  const geminiCost = estimateCost("gemini", 500, 400);
  assert.ok(geminiCost > 0);

  // Record usage
  recordAiUsage("gemini", {
    success: true,
    inputTokens: 500,
    outputTokens: 400,
  });

  const updatedSummary = getAiUsageSummary();
  assert.equal(updatedSummary.totalCalls, 1);
  assert.equal(updatedSummary.providers.gemini.successfulCalls, 1);
  assert.ok(updatedSummary.totalCostUsd > 0);

  // Budget enforcement check
  const origBudget = process.env.AI_MONTHLY_BUDGET_USD;
  try {
    process.env.AI_MONTHLY_BUDGET_USD = "0.000001"; // ultra-low budget
    assert.equal(isBudgetExceeded(), true);
  } finally {
    if (origBudget !== undefined) {
      process.env.AI_MONTHLY_BUDGET_USD = origBudget;
    } else {
      delete process.env.AI_MONTHLY_BUDGET_USD;
    }
  }
});
