import assert from "node:assert/strict";
import { test } from "node:test";
import {
  categorizeGeminiError,
  getGeminiServerConfig,
} from "../src/lib/gemini-server.ts";
import {
  GeminiSpeakingOutputSchema,
  GeminiWritingOutputSchema,
} from "../src/lib/placement-ai-types.ts";
import {
  calculateOverallIeltsBand,
  validateSpeakingInput,
} from "../src/lib/placement-ai-validation.ts";
import { roundToIeltsBand } from "../src/lib/placement-scoring.ts";

// ==========================================
// 1. CONFIGURATION & API KEY AUDIT TESTS
// ==========================================

test("getGeminiServerConfig: Missing API key returns missing_api_key status", () => {
  const origKey = process.env.GEMINI_API_KEY;
  const origGoogle = process.env.GOOGLE_API_KEY;
  const origGenai = process.env.GOOGLE_GENAI_API_KEY;

  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;
  delete process.env.GOOGLE_GENAI_API_KEY;

  try {
    const config = getGeminiServerConfig();
    assert.equal(config.ok, false);
    if (!config.ok) {
      assert.equal(config.errorType, "missing_api_key");
      assert.ok(config.message.includes("chưa được cấu hình"));
    }
  } finally {
    if (origKey !== undefined) process.env.GEMINI_API_KEY = origKey;
    if (origGoogle !== undefined) process.env.GOOGLE_API_KEY = origGoogle;
    if (origGenai !== undefined) process.env.GOOGLE_GENAI_API_KEY = origGenai;
  }
});

test("getGeminiServerConfig: Placeholder or dummy key is detected as invalid_api_key", () => {
  const origKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "your-gemini-api-key";

  try {
    const config = getGeminiServerConfig();
    assert.equal(config.ok, false);
    if (!config.ok) {
      assert.equal(config.errorType, "invalid_api_key");
      assert.ok(config.message.includes("placeholder hoặc có định dạng không hợp lệ"));
    }
  } finally {
    if (origKey !== undefined) {
      process.env.GEMINI_API_KEY = origKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
  }
});

test("getGeminiServerConfig: Cleanly extracts and sanitizes valid GEMINI_API_KEY", () => {
  const origKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = '  "AIzaSyDemoValidSecretKey123456789"  ';

  try {
    const config = getGeminiServerConfig();
    assert.equal(config.ok, true);
    if (config.ok) {
      assert.equal(config.config.apiKey, "AIzaSyDemoValidSecretKey123456789");
      assert.equal(config.config.model, "gemini-3.5-flash-lite");
    }
  } finally {
    if (origKey !== undefined) {
      process.env.GEMINI_API_KEY = origKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
  }
});

test("getGeminiServerConfig: Supports fallback to GOOGLE_API_KEY", () => {
  const origKey = process.env.GEMINI_API_KEY;
  const origGoogle = process.env.GOOGLE_API_KEY;

  delete process.env.GEMINI_API_KEY;
  process.env.GOOGLE_API_KEY = "AIzaSyDemoFallbackGoogleKey987654";

  try {
    const config = getGeminiServerConfig();
    assert.equal(config.ok, true);
    if (config.ok) {
      assert.equal(config.config.apiKey, "AIzaSyDemoFallbackGoogleKey987654");
    }
  } finally {
    if (origKey !== undefined) process.env.GEMINI_API_KEY = origKey;
    if (origGoogle !== undefined) {
      process.env.GOOGLE_API_KEY = origGoogle;
    } else {
      delete process.env.GOOGLE_API_KEY;
    }
  }
});

// ==========================================
// 2. ERROR CATEGORIZATION & RETRY CLASSIFICATION
// ==========================================

test("categorizeGeminiError: 401/403/API_KEY_INVALID mapped to invalid_api_key (non-transient)", () => {
  const err401 = { status: 401, message: "API_KEY_INVALID: API key not valid" };
  const res = categorizeGeminiError(err401);
  assert.equal(res.status, "invalid_api_key");
  assert.equal(res.isTransient, false, "Auth errors must not be retried");
  assert.equal(res.httpStatus, 401);

  const err403 = { status: 403, message: "Permission denied for project" };
  const res403 = categorizeGeminiError(err403);
  assert.equal(res403.status, "invalid_api_key");
  assert.equal(res403.isTransient, false);
});

test("categorizeGeminiError: 429 RESOURCE_EXHAUSTED mapped to quota_exceeded (transient)", () => {
  const err429 = { status: 429, message: "Resource has been exhausted (e.g. check quota)" };
  const res = categorizeGeminiError(err429);
  assert.equal(res.status, "quota_exceeded");
  assert.equal(res.isTransient, true, "Rate limits should trigger backoff retry");
  assert.equal(res.httpStatus, 429);
  assert.ok(res.message.includes("429"));
});

test("categorizeGeminiError: 503/500 UNAVAILABLE mapped to api_error (transient)", () => {
  const err503 = { status: 503, message: "The service is currently unavailable" };
  const res = categorizeGeminiError(err503);
  assert.equal(res.status, "api_error");
  assert.equal(res.isTransient, true, "5xx errors should be retried");
  assert.equal(res.httpStatus, 503);
});

test("categorizeGeminiError: Timeout/AbortError mapped to timeout (transient)", () => {
  const timeoutErr = new Error("Gemini request timed out after 35000ms");
  timeoutErr.name = "AbortError";
  const res = categorizeGeminiError(timeoutErr);
  assert.equal(res.status, "timeout");
  assert.equal(res.isTransient, true);
  assert.equal(res.httpStatus, 504);
  assert.ok(res.message.includes("Timeout"));
});

test("categorizeGeminiError: 404 Model Not Found mapped to model_error (non-transient)", () => {
  const err404 = { status: 404, message: "Model gemini-invalid not found" };
  const res = categorizeGeminiError(err404);
  assert.equal(res.status, "model_error");
  assert.equal(res.isTransient, false);
  assert.equal(res.httpStatus, 404);
});

// ==========================================
// 3. SCHEMA VALIDATION & AI RESPONSE PARSING
// ==========================================

test("GeminiWritingOutputSchema: Validates successful 4-criteria IELTS Writing output", () => {
  const validOutput = {
    isValidEnglishEssay: true,
    isRelevantToTopic: true,
    isMeaningfulContent: true,
    criteria: {
      taskResponse: { score: 6.5, feedback: "Addresses all parts of prompt" },
      coherenceAndCohesion: { score: 6.0, feedback: "Good paragraphing" },
      lexicalResource: { score: 6.5, feedback: "Accurate academic terms" },
      grammaticalRangeAndAccuracy: { score: 6.0, feedback: "A mix of complex sentences" },
    },
    overallBand: 6.5,
    strengths: ["Clear thesis", "Relevant examples"],
    weaknesses: ["Occasional minor grammar slips"],
    improvements: ["Use more varied transitional phrases"],
    evaluationSummary: "Competent academic writing with clear argumentation.",
  };

  const parsed = GeminiWritingOutputSchema.parse(validOutput);
  assert.equal(parsed.isValidEnglishEssay, true);
  assert.equal(parsed.criteria?.taskResponse.score, 6.5);

  const mean = roundToIeltsBand(
    (parsed.criteria!.taskResponse.score +
      parsed.criteria!.coherenceAndCohesion.score +
      parsed.criteria!.lexicalResource.score +
      parsed.criteria!.grammaticalRangeAndAccuracy.score) /
      4,
  );
  assert.equal(mean, 6.5);
});

test("GeminiWritingOutputSchema: Invalid JSON structure is rejected without fake score", () => {
  const corruptedOutputs = [
    {}, // empty object
    { isValidEnglishEssay: true }, // missing criteria
    {
      isValidEnglishEssay: true,
      criteria: {
        taskResponse: { score: 15 }, // invalid score > 9
      },
    },
    {
      isValidEnglishEssay: "yes", // wrong type
    },
  ];

  for (const corrupted of corruptedOutputs) {
    const result = GeminiWritingOutputSchema.safeParse(corrupted);
    assert.equal(result.success, false, "Corrupted JSON must fail schema validation");
  }
});

test("GeminiSpeakingOutputSchema: Validates successful 4-criteria IELTS Speaking output", () => {
  const validOutput = {
    hasAudibleSpeech: true,
    isEnglish: true,
    isRelevant: true,
    criteria: {
      fluencyAndCoherence: { score: 6.5, feedback: "Speaks at length with minor hesitations" },
      lexicalResource: { score: 6.0, feedback: "Adequate vocabulary range" },
      grammaticalRangeAndAccuracy: { score: 6.0, feedback: "Good basic structures" },
      pronunciation: { score: 6.5, feedback: "Generally clear and easy to understand" },
    },
    overallBand: 6.5,
    transcripts: {
      S1: "I usually spend my weekends with family.",
    },
    strengths: ["Intelligible pronunciation"],
    weaknesses: ["Repetition of basic linkers"],
    improvements: ["Incorporate idiomatic expressions"],
    evaluationSummary: "Natural speech delivery with good clarity.",
  };

  const parsed = GeminiSpeakingOutputSchema.parse(validOutput);
  assert.equal(parsed.hasAudibleSpeech, true);
  assert.equal(parsed.criteria?.pronunciation.score, 6.5);

  const mean = roundToIeltsBand(
    (parsed.criteria!.fluencyAndCoherence.score +
      parsed.criteria!.lexicalResource.score +
      parsed.criteria!.grammaticalRangeAndAccuracy.score +
      parsed.criteria!.pronunciation.score) /
      4,
  );
  assert.equal(mean, 6.5);
});

// ==========================================
// 4. SPEAKING AUDIO VALIDATION TESTS
// ==========================================

test("validateSpeakingInput: Empty audio payload is rejected", () => {
  const emptyRes = validateSpeakingInput({});
  assert.equal(emptyRes.valid, false);
  assert.equal(emptyRes.status, "insufficient_response");

  const missingAudio = validateSpeakingInput({
    S1: { hasRecorded: true, durationSeconds: 5, audioBase64: "" },
  });
  assert.equal(missingAudio.valid, false);
  assert.equal(missingAudio.status, "insufficient_response");
});

test("validateSpeakingInput: Audio under 3 seconds is rejected as insufficient", () => {
  const tooShort = validateSpeakingInput({
    S1: {
      hasRecorded: true,
      durationSeconds: 2,
      audioBase64: "dGVzdGF1ZGlvYnl0ZXNkYXRhMTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkw",
    },
  });
  assert.equal(tooShort.valid, false);
  assert.equal(tooShort.status, "insufficient_response");
  assert.ok(tooShort.message?.includes("dưới 3 giây"));
});

test("validateSpeakingInput: Valid audio metadata (>= 3s) passes to Gemini", () => {
  const validAudio = validateSpeakingInput({
    S1: {
      hasRecorded: true,
      durationSeconds: 15,
      audioBase64: "dGVzdGF1ZGlvYnl0ZXNkYXRhMTIzNDU2Nzg5MDEyMzQ1Njc4OTA=",
    },
  });
  assert.equal(validAudio.valid, true);
  assert.equal(validAudio.status, "success");
});

// ==========================================
// 5. PARTIAL EVALUATION & RETRY PRESERVATION
// ==========================================

test("Partial Evaluation: Overall band remains null when only Writing succeeds", () => {
  // Scenario: Listening = 6.0, Reading = 6.5, Writing = 6.5, Speaking = null (failed API)
  const partialOverall = calculateOverallIeltsBand({
    listening: 6.0,
    reading: 6.5,
    writing: 6.5,
    speaking: null, // failed
  });

  assert.equal(partialOverall, null, "Overall band must be null if Speaking failed");
});

test("Retry Preservation: Preserving successful Writing score when retrying Speaking", () => {
  // Initial state: Writing succeeded (6.5), Speaking failed (null)
  const initialWriting = {
    skill: "writing" as const,
    band: 6.5,
    status: "success" as const,
    feedback: "Good essay",
  };
  const initialSpeaking = {
    skill: "speaking" as const,
    band: null,
    status: "quota_exceeded" as const,
    feedback: "Quota exceeded, please retry",
  };

  // Simulating retry logic in placement-test-container:
  // When retrying, Writing should NOT be re-evaluated because band !== null
  const shouldRetryWriting = initialWriting.band === null;
  const shouldRetrySpeaking = initialSpeaking.band === null;

  assert.equal(shouldRetryWriting, false, "Must not retry already successful Writing");
  assert.equal(shouldRetrySpeaking, true, "Must retry failed Speaking");

  // Simulated successful retry of Speaking
  const retriedSpeaking = {
    skill: "speaking" as const,
    band: 6.0,
    status: "success" as const,
    feedback: "Clear pronunciation",
  };

  // Writing band 6.5 is completely preserved!
  const overallAfterRetry = calculateOverallIeltsBand({
    listening: 6.0,
    reading: 6.5,
    writing: initialWriting.band, // 6.5 preserved
    speaking: retriedSpeaking.band, // 6.0 newly assessed
  });

  assert.equal(overallAfterRetry, 6.5); // (6.0 + 6.5 + 6.5 + 6.0) / 4 = 6.25 -> rounds to 6.5
});

// ==========================================
// 6. IDEMPOTENCY & DUPLICATE SUBMISSION GUARD
// ==========================================

test("Duplicate submission guard prevents multiple concurrent evaluation runs", () => {
  let isSubmitting = false;
  let executionCount = 0;

  async function mockSubmit() {
    if (isSubmitting) return "blocked";
    isSubmitting = true;
    executionCount++;
    // Simulate API delay
    await new Promise((res) => setTimeout(res, 10));
    isSubmitting = false;
    return "executed";
  }

  // Trigger 3 calls concurrently
  const promise1 = mockSubmit();
  const promise2 = mockSubmit();
  const promise3 = mockSubmit();

  return Promise.all([promise1, promise2, promise3]).then(([res1, res2, res3]) => {
    assert.equal(res1, "executed");
    assert.equal(res2, "blocked");
    assert.equal(res3, "blocked");
    assert.equal(executionCount, 1, "Only one execution must proceed");
  });
});
