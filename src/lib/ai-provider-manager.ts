/**
 * AAA - Centralized Multi-Provider AI Scoring Manager
 * Primary: Google Gemini API
 * Secondary: OpenAI API
 * Optional Third: Groq (OpenAI-compatible)
 *
 * Implements intelligent retries, circuit breaking, automatic failover,
 * schema normalization, and zero-knowledge secret protection.
 */

import { GoogleGenAI, ApiError } from "@google/genai";
import {
  GeminiSpeakingOutputSchema,
  GeminiWritingOutputSchema,
  type AssessmentStatus,
  type SpeakingAssessmentResponse,
  type WritingAssessmentResponse,
} from "./placement-ai-types.ts";
import { countWords, roundToIeltsBand } from "./placement-scoring.ts";
import {
  isBudgetExceeded,
  recordAiUsage,
  type AIProviderName,
} from "./ai-cost-tracker.ts";
import { getCentralGeminiModel } from "./gemini-server.ts";
import {
  sanitizeAudioBase64,
  sanitizeAudioMimeType,
} from "./placement-ai-validation.ts";

export type ProviderStatus = "available" | "cooldown" | "disabled" | "unconfigured";

export type ProviderCircuitState = {
  provider: AIProviderName;
  status: ProviderStatus;
  consecutiveFailures: number;
  cooldownUntil: number; // epoch ms
  lastError?: string;
  supportsWriting: boolean;
  supportsAudio: boolean;
  model: string;
};

// In-memory circuit breaker state across server lifecycle
const circuitBreakers: Record<AIProviderName, ProviderCircuitState> = {
  gemini: {
    provider: "gemini",
    status: "available",
    consecutiveFailures: 0,
    cooldownUntil: 0,
    supportsWriting: true,
    supportsAudio: true,
    model: getCentralGeminiModel(),
  },
  openai: {
    provider: "openai",
    status: "available",
    consecutiveFailures: 0,
    cooldownUntil: 0,
    supportsWriting: true,
    supportsAudio: true,
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  },
  groq: {
    provider: "groq",
    status: "available",
    consecutiveFailures: 0,
    cooldownUntil: 0,
    supportsWriting: true,
    supportsAudio: false,
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  },
};

const DUMMY_KEY_PATTERNS = [
  "your-",
  "placeholder",
  "dummy",
  "aizasy...",
  "sk-...",
  "gsk_...",
];

function isKeyValid(key?: string | null): boolean {
  if (!key || typeof key !== "string") return false;
  const trimmed = key.trim().replace(/^["']|["']$/g, "");
  if (trimmed.length < 15) return false;
  return !DUMMY_KEY_PATTERNS.some((p) => trimmed.toLowerCase().includes(p));
}

function getSanitizedKey(provider: AIProviderName): string | null {
  let raw: string | undefined;
  if (provider === "gemini") {
    raw =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY;
  } else if (provider === "openai") {
    raw = process.env.OPENAI_API_KEY;
  } else if (provider === "groq") {
    raw = process.env.GROQ_API_KEY;
  }

  if (!isKeyValid(raw)) return null;
  return raw!.trim().replace(/^["']|["']$/g, "");
}

/**
 * Checks provider circuit state and updates based on cooldown timers
 */
export function getProviderCircuitState(
  provider: AIProviderName,
): ProviderCircuitState {
  const state = circuitBreakers[provider];
  if (provider === "gemini") {
    state.model = getCentralGeminiModel();
  }
  const key = getSanitizedKey(provider);

  if (!key) {
    state.status = "unconfigured";
    return state;
  }

  const now = Date.now();
  if (state.status === "cooldown" && now >= state.cooldownUntil) {
    state.status = "available";
    state.consecutiveFailures = 0;
  }

  return state;
}

/**
 * Trips circuit breaker into cooldown or disabled state
 */
export function tripCircuitBreaker(
  provider: AIProviderName,
  reason: { status: AssessmentStatus; message: string; httpStatus?: number },
): void {
  const state = circuitBreakers[provider];
  state.consecutiveFailures += 1;
  state.lastError = `[${reason.status}] ${reason.message}`;

  // 400 (Bad Request / Schema error) or 404 (Model Not Found)
  // Do NOT put provider into cooldown! It's a non-transient schema/model issue.
  if (
    reason.httpStatus === 400 ||
    reason.httpStatus === 404 ||
    reason.status === "model_error"
  ) {
    state.lastError = `[HTTP ${reason.httpStatus || 400}] ${reason.message}`;
    console.warn(
      `[AI Provider Manager] ${provider.toUpperCase()} encountered schema/model error (${reason.httpStatus}): ${reason.message}. Not setting cooldown.`,
    );
    return;
  }

  // 401/403: Disable provider until server restart or reconfiguration
  if (
    reason.status === "invalid_api_key" ||
    reason.httpStatus === 401 ||
    reason.httpStatus === 403
  ) {
    state.status = "disabled";
    console.warn(
      `[AI Provider Manager] ${provider.toUpperCase()} disabled due to invalid credentials (401/403).`,
    );
  }
  // 429: Quota exceeded - cooldown for 60 seconds
  else if (reason.status === "quota_exceeded" || reason.httpStatus === 429) {
    state.status = "cooldown";
    state.cooldownUntil = Date.now() + 60_000;
    console.warn(
      `[AI Provider Manager] ${provider.toUpperCase()} quota exceeded (429). Cooldown for 60s.`,
    );
  }
  // 5xx / Timeout - cooldown for 20 seconds after 2 consecutive failures
  else {
    if (state.consecutiveFailures >= 2) {
      state.status = "cooldown";
      state.cooldownUntil = Date.now() + 20_000;
      console.warn(
        `[AI Provider Manager] ${provider.toUpperCase()} experienced repeated transient failures. Cooldown for 20s.`,
      );
    }
  }
}

/**
 * Resets circuit state when a call succeeds
 */
export function markProviderHealthy(provider: AIProviderName): void {
  const state = circuitBreakers[provider];
  state.status = "available";
  state.consecutiveFailures = 0;
  state.cooldownUntil = 0;
  state.lastError = undefined;
}

/**
 * System health report for all configured AI providers
 */
export function getProviderHealthReport(): {
  status: "healthy" | "degraded" | "unconfigured";
  activeProvidersCount: number;
  providers: Record<
    AIProviderName,
    {
      configured: boolean;
      status: ProviderStatus;
      model: string;
      supportsAudio: boolean;
      consecutiveFailures: number;
      lastError?: string;
    }
  >;
  isBudgetExceeded: boolean;
} {
  const providers = {
    gemini: {
      configured: Boolean(getSanitizedKey("gemini")),
      status: getProviderCircuitState("gemini").status,
      model: circuitBreakers.gemini.model,
      supportsAudio: true,
      consecutiveFailures: circuitBreakers.gemini.consecutiveFailures,
      lastError: circuitBreakers.gemini.lastError,
    },
    openai: {
      configured: Boolean(getSanitizedKey("openai")),
      status: getProviderCircuitState("openai").status,
      model: circuitBreakers.openai.model,
      supportsAudio: true,
      consecutiveFailures: circuitBreakers.openai.consecutiveFailures,
      lastError: circuitBreakers.openai.lastError,
    },
    groq: {
      configured: Boolean(getSanitizedKey("groq")),
      status: getProviderCircuitState("groq").status,
      model: circuitBreakers.groq.model,
      supportsAudio: false,
      consecutiveFailures: circuitBreakers.groq.consecutiveFailures,
      lastError: circuitBreakers.groq.lastError,
    },
  };

  const activeCount = Object.values(providers).filter(
    (p) => p.configured && (p.status === "available" || p.status === "cooldown"),
  ).length;

  let overallStatus: "healthy" | "degraded" | "unconfigured" = "unconfigured";
  if (activeCount > 1) {
    overallStatus = "healthy";
  } else if (activeCount === 1) {
    overallStatus = "degraded"; // Single point of failure
  }

  return {
    status: overallStatus,
    activeProvidersCount: activeCount,
    providers,
    isBudgetExceeded: isBudgetExceeded(),
  };
}

// ============================================================================
// SYSTEM PROMPTS (SHARED IELTS STANDARDS ACROSS ALL PROVIDERS)
// ============================================================================

export const IELTS_WRITING_SYSTEM_INSTRUCTION = `You are a certified senior IELTS Academic Examiner.
You will evaluate the candidate's IELTS Writing Task 2 essay.

FIRST, VALIDATE THE SUBMISSION:
1. Is it written in English? (If in Vietnamese or any other language, mark isValidEnglishEssay = false).
2. Does it respond to the prompt topic? (If completely off-topic or spam, mark isRelevantToTopic = false).
3. Is it meaningful content with communicative value? (If gibberish, copy-pasting or random words, mark isMeaningfulContent = false).

IF NOT VALID:
Return JSON:
{
  "isValidEnglishEssay": false,
  "isRelevantToTopic": false,
  "isMeaningfulContent": false,
  "rejectionReason": "Clear explanation in Vietnamese why the essay cannot be assessed."
}

IF VALID:
Evaluate strictly according to the 4 official IELTS Writing Task 2 Band Descriptors (scale 0.0 - 9.0 in 0.5 increments):
- taskResponse: Addressing prompt, stance, depth of ideas. If under 250 words, reflect appropriately in TR, but evaluate content fairly.
- coherenceAndCohesion: Paragraphing, flow, logical progression, cohesive devices.
- lexicalResource: Academic vocabulary, collocations, precision, spelling.
- grammaticalRangeAndAccuracy: Sentence variety, accuracy, punctuation.

Format strictly as JSON conforming to:
{
  "isValidEnglishEssay": true,
  "isRelevantToTopic": true,
  "isMeaningfulContent": true,
  "criteria": {
    "taskResponse": { "score": 6.5, "feedback": "Detailed feedback in Vietnamese..." },
    "coherenceAndCohesion": { "score": 6.0, "feedback": "Detailed feedback in Vietnamese..." },
    "lexicalResource": { "score": 6.5, "feedback": "Detailed feedback in Vietnamese..." },
    "grammaticalRangeAndAccuracy": { "score": 6.0, "feedback": "Detailed feedback in Vietnamese..." }
  },
  "overallBand": 6.5,
  "strengths": ["Clear viewpoint...", "..."],
  "weaknesses": ["Lacks development in body 2...", "..."],
  "improvements": ["Use more precise academic collocations...", "..."],
  "evaluationSummary": "Concise summary in Vietnamese of candidate performance."
}`;

export const IELTS_SPEAKING_SYSTEM_INSTRUCTION = `You are a certified senior IELTS Speaking Examiner.
You will evaluate the candidate's spoken responses across IELTS Speaking Parts 1, 2, and 3.

FIRST, VALIDATE THE AUDITORY RECORDINGS:
1. hasAudibleSpeech: Is there audible human voice speech, or only silence, static, noise, or clicks? (If silent or noise only, mark hasAudibleSpeech = false).
2. isEnglish: Is the candidate speaking English? (If in Vietnamese or other languages, mark isEnglish = false).
3. isRelevant: Is the candidate responding to the questions asked? (If completely random noise or totally off-topic, mark isRelevant = false).

IF NOT VALID:
Return JSON:
{
  "hasAudibleSpeech": false,
  "isEnglish": false,
  "isRelevant": false,
  "rejectionReason": "Clear explanation in Vietnamese why the speaking response cannot be evaluated."
}

IF VALID:
Evaluate strictly according to the 4 official IELTS Speaking Band Descriptors (scale 0.0 - 9.0 in 0.5 increments):
- fluencyAndCoherence: Flow, continuity, natural speech rate, hesitations.
- lexicalResource: Vocabulary range, collocations, precision.
- grammaticalRangeAndAccuracy: Variety and accuracy of grammatical forms.
- pronunciation: Evaluate auditory speech features (stress, rhythm, intonation, phonetic clarity).

Format strictly as JSON conforming to:
{
  "hasAudibleSpeech": true,
  "isEnglish": true,
  "isRelevant": true,
  "criteria": {
    "fluencyAndCoherence": { "score": 6.0, "feedback": "Detailed FC feedback in Vietnamese..." },
    "lexicalResource": { "score": 6.0, "feedback": "Detailed LR feedback in Vietnamese..." },
    "grammaticalRangeAndAccuracy": { "score": 5.5, "feedback": "Detailed GRA feedback in Vietnamese..." },
    "pronunciation": { "score": 6.5, "feedback": "Detailed Pronunciation feedback in Vietnamese..." }
  },
  "overallBand": 6.0,
  "transcripts": {
    "questionKey": "Transcribed candidate speech..."
  },
  "strengths": ["Clear pronunciation of consonant clusters...", "..."],
  "weaknesses": ["Hesitation when explaining complex concepts...", "..."],
  "improvements": ["Practice connected speech and linking words...", "..."],
  "evaluationSummary": "Concise summary in Vietnamese of candidate spoken performance."
}`;

// ============================================================================
// PROVIDER-SPECIFIC ADAPTER CALLS
// ============================================================================

/**
 * Calls Google Gemini API with timeout and structured parsing
 */
async function callGeminiWriting(
  apiKey: string,
  model: string,
  promptText: string,
  essayText: string,
  timeoutMs = 35000,
): Promise<{ rawJson: string; tokensEstimated: number }> {
  console.log(
    `[Gemini API] Invoking Writing model: ${model} (API version: v1beta, endpoint: generateContent)`,
  );
  const ai = new GoogleGenAI({ apiKey });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const userContent = `Task Prompt:\n"""\n${promptText}\n"""\n\nCandidate Response:\n"""\n${essayText.trim()}\n"""`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [{ text: `${IELTS_WRITING_SYSTEM_INSTRUCTION}\n\n${userContent}` }],
        },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
        abortSignal: controller.signal,
      },
    });

    const text = response.text?.trim() || "";
    const inTokens = Math.round((essayText.length + promptText.length) / 4);
    const outTokens = Math.round(text.length / 4);

    return { rawJson: text, tokensEstimated: inTokens + outTokens };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Calls OpenAI API (or OpenAI-compatible API such as Groq)
 */
async function callOpenAiCompatibleWriting(
  provider: "openai" | "groq",
  apiKey: string,
  model: string,
  promptText: string,
  essayText: string,
  timeoutMs = 35000,
): Promise<{ rawJson: string; tokensEstimated: number }> {
  const baseUrl =
    provider === "groq"
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";

  const userContent = `Task Prompt:\n"""\n${promptText}\n"""\n\nCandidate Response:\n"""\n${essayText.trim()}\n"""`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: IELTS_WRITING_SYSTEM_INSTRUCTION },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const errorObj = { status: res.status, message: errText };
      throw errorObj;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
    };
    const content = data.choices?.[0]?.message?.content || "";
    const tokens = data.usage?.total_tokens || Math.round((essayText.length + content.length) / 4);

    return { rawJson: content, tokensEstimated: tokens };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Calls Gemini for Speaking with multimodal audio inlineData
 */
async function callGeminiSpeaking(
  apiKey: string,
  model: string,
  recordings: Record<
    string,
    { audioBase64?: string; mimeType?: string; durationSeconds?: number; questionPrompt?: string }
  >,
  timeoutMs = 40000,
): Promise<{ rawJson: string; tokensEstimated: number }> {
  console.log(
    `[Gemini API] Invoking Speaking model: ${model} (API version: v1beta, endpoint: generateContent)`,
  );
  const ai = new GoogleGenAI({ apiKey });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentParts: any[] = [
    {
      text: `${IELTS_SPEAKING_SYSTEM_INSTRUCTION}\n\nHere are the candidate's audio responses:`,
    },
  ];

  let totalAudioSeconds = 0;
  for (const [key, item] of Object.entries(recordings)) {
    if (item.audioBase64) {
      const cleanBase64 = sanitizeAudioBase64(item.audioBase64);
      const cleanMime = sanitizeAudioMimeType(item.mimeType);

      if (!cleanBase64 || cleanBase64.length < 50) {
        continue;
      }

      totalAudioSeconds += item.durationSeconds || 0;
      contentParts.push({
        text: `--- Question [${key}] Prompt: "${item.questionPrompt || key}" (Recorded duration: ${item.durationSeconds || 0}s) ---`,
      });

      contentParts.push({
        inlineData: {
          mimeType: cleanMime,
          data: cleanBase64,
        },
      });
    }
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: contentParts }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
        abortSignal: controller.signal,
      },
    });

    const text = response.text?.trim() || "";
    const estimatedTokens = Math.round(totalAudioSeconds * 30 + text.length / 4);

    return { rawJson: text, tokensEstimated: estimatedTokens };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Calls OpenAI Speaking (using audio model gpt-4o-audio-preview if available)
 */
async function callOpenAiSpeaking(
  apiKey: string,
  model: string,
  recordings: Record<
    string,
    { audioBase64?: string; mimeType?: string; durationSeconds?: number; questionPrompt?: string }
  >,
  timeoutMs = 40000,
): Promise<{ rawJson: string; tokensEstimated: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Form input parts for OpenAI Audio
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userContent: any[] = [
    { type: "text", text: "Evaluate the following candidate speech recordings against the 4 IELTS Speaking criteria:" },
  ];

  let totalDuration = 0;
  for (const [key, item] of Object.entries(recordings)) {
    if (item.audioBase64) {
      const cleanBase64 = sanitizeAudioBase64(item.audioBase64);
      const cleanMime = sanitizeAudioMimeType(item.mimeType);

      if (!cleanBase64 || cleanBase64.length < 50) {
        continue;
      }

      totalDuration += item.durationSeconds || 0;
      userContent.push({
        type: "text",
        text: `Question [${key}]: ${item.questionPrompt || key} (${item.durationSeconds || 0} seconds):`,
      });
      // OpenAI Audio preview supports audio input data
      userContent.push({
        type: "input_audio",
        input_audio: {
          data: cleanBase64,
          format: cleanMime.includes("mp4") ? "mp4" : "wav",
        },
      });
    }
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        modalities: ["text"],
        messages: [
          { role: "system", content: IELTS_SPEAKING_SYSTEM_INSTRUCTION },
          { role: "user", content: userContent },
        ],
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw { status: res.status, message: errText };
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
    };

    const content = data.choices?.[0]?.message?.content || "";
    return {
      rawJson: content,
      tokensEstimated: data.usage?.total_tokens || Math.round(totalDuration * 35),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// PARSING & STANDARDIZING RESULTS
// ============================================================================

function cleanMarkdownJson(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseAndStandardizeWriting(
  rawJson: string,
  wordCount: number,
  provider: AIProviderName,
  modelName: string,
): WritingAssessmentResponse {
  const cleaned = cleanMarkdownJson(rawJson);
  const parsed = JSON.parse(cleaned);
  const geminiOutput = GeminiWritingOutputSchema.parse(parsed);

  if (
    !geminiOutput.isValidEnglishEssay ||
    !geminiOutput.isRelevantToTopic ||
    !geminiOutput.isMeaningfulContent ||
    !geminiOutput.criteria
  ) {
    return {
      status: "invalid_response",
      skill: "writing",
      overallBand: null,
      criteria: null,
      criteriaFeedback: null,
      feedback: null,
      wordCount,
      message:
        geminiOutput.rejectionReason ||
        "Bài viết không hợp lệ (không phải tiếng Anh, lạc đề hoặc không có ý nghĩa học thuật).",
      provider,
      modelUsed: modelName,
    };
  }

  const c = geminiOutput.criteria;
  const computedOverall = roundToIeltsBand(
    (c.taskResponse.score +
      c.coherenceAndCohesion.score +
      c.lexicalResource.score +
      c.grammaticalRangeAndAccuracy.score) /
      4,
  );

  return {
    status: "success",
    skill: "writing",
    overallBand: computedOverall,
    criteria: {
      taskResponse: c.taskResponse.score,
      coherenceAndCohesion: c.coherenceAndCohesion.score,
      lexicalResource: c.lexicalResource.score,
      grammaticalRangeAndAccuracy: c.grammaticalRangeAndAccuracy.score,
    },
    criteriaFeedback: {
      taskResponse: c.taskResponse.feedback,
      coherenceAndCohesion: c.coherenceAndCohesion.feedback,
      lexicalResource: c.lexicalResource.feedback,
      grammaticalRangeAndAccuracy: c.grammaticalRangeAndAccuracy.feedback,
    },
    feedback: {
      strengths: geminiOutput.strengths,
      weaknesses: geminiOutput.weaknesses,
      improvements: geminiOutput.improvements,
      summary:
        geminiOutput.evaluationSummary ||
        `Đã hoàn thành đánh giá bài viết theo tiêu chuẩn IELTS bởi ${provider.toUpperCase()}.`,
    },
    wordCount,
    provider,
    modelUsed: modelName,
  };
}

function parseAndStandardizeSpeaking(
  rawJson: string,
  provider: AIProviderName,
  modelName: string,
): SpeakingAssessmentResponse {
  const cleaned = cleanMarkdownJson(rawJson);
  const parsed = JSON.parse(cleaned);
  const geminiOutput = GeminiSpeakingOutputSchema.parse(parsed);

  if (
    !geminiOutput.hasAudibleSpeech ||
    !geminiOutput.isEnglish ||
    !geminiOutput.isRelevant ||
    !geminiOutput.criteria
  ) {
    return {
      status: "invalid_response",
      skill: "speaking",
      overallBand: null,
      criteria: null,
      criteriaFeedback: null,
      feedback: null,
      message:
        geminiOutput.rejectionReason ||
        "Bản ghi âm không hợp lệ (không phát hiện thấy giọng nói, chỉ có tiếng ồn hoặc không sử dụng tiếng Anh).",
      provider,
      modelUsed: modelName,
    };
  }

  const c = geminiOutput.criteria;
  const computedOverall = roundToIeltsBand(
    (c.fluencyAndCoherence.score +
      c.lexicalResource.score +
      c.grammaticalRangeAndAccuracy.score +
      c.pronunciation.score) /
      4,
  );

  return {
    status: "success",
    skill: "speaking",
    overallBand: computedOverall,
    criteria: {
      fluencyAndCoherence: c.fluencyAndCoherence.score,
      lexicalResource: c.lexicalResource.score,
      grammaticalRangeAndAccuracy: c.grammaticalRangeAndAccuracy.score,
      pronunciation: c.pronunciation.score,
    },
    criteriaFeedback: {
      fluencyAndCoherence: c.fluencyAndCoherence.feedback,
      lexicalResource: c.lexicalResource.feedback,
      grammaticalRangeAndAccuracy: c.grammaticalRangeAndAccuracy.feedback,
      pronunciation: c.pronunciation.feedback,
    },
    feedback: {
      strengths: geminiOutput.strengths,
      weaknesses: geminiOutput.weaknesses,
      improvements: geminiOutput.improvements,
      summary:
        geminiOutput.evaluationSummary ||
        `Đã hoàn thành đánh giá bài nói theo tiêu chuẩn IELTS bởi ${provider.toUpperCase()}.`,
    },
    transcripts: geminiOutput.transcripts,
    provider,
    modelUsed: modelName,
  };
}

// ============================================================================
// MULTI-PROVIDER FAILOVER PIPELINES
// ============================================================================

const WRITING_PROVIDER_ORDER: AIProviderName[] = ["gemini", "openai", "groq"];
const SPEAKING_PROVIDER_ORDER: AIProviderName[] = ["gemini", "openai"];

/**
 * Evaluates Writing Task 2 with automatic provider failover and budget control
 */
export async function evaluateWritingWithFailover(options: {
  essayText: string;
  taskPrompt: string;
}): Promise<WritingAssessmentResponse> {
  const wordCount = countWords(options.essayText);

  if (isBudgetExceeded()) {
    return {
      status: "quota_exceeded",
      skill: "writing",
      overallBand: null,
      criteria: null,
      criteriaFeedback: null,
      feedback: null,
      wordCount,
      message: "Hệ thống đã đạt giới hạn ngân sách AI trong tháng. Vui lòng thử lại sau.",
    };
  }

  const attemptedErrors: string[] = [];

  for (const provider of WRITING_PROVIDER_ORDER) {
    const circuit = getProviderCircuitState(provider);
    const key = getSanitizedKey(provider);

    // Skip unconfigured or disabled/cooldown providers
    if (!key || circuit.status === "disabled" || circuit.status === "unconfigured") {
      continue;
    }
    if (circuit.status === "cooldown") {
      attemptedErrors.push(`${provider.toUpperCase()} đang tạm ngừng (cooldown)`);
      continue;
    }

    const modelName = circuit.model;

    try {
      let callResult: { rawJson: string; tokensEstimated: number };

      if (provider === "gemini") {
        callResult = await callGeminiWriting(key, modelName, options.taskPrompt, options.essayText);
      } else {
        callResult = await callOpenAiCompatibleWriting(
          provider,
          key,
          modelName,
          options.taskPrompt,
          options.essayText,
        );
      }

      // Track usage and costs
      recordAiUsage(provider, {
        success: true,
        inputTokens: Math.round(options.essayText.length / 4),
        outputTokens: Math.round(callResult.rawJson.length / 4),
      });

      markProviderHealthy(provider);
      return parseAndStandardizeWriting(callResult.rawJson, wordCount, provider, modelName);
    } catch (err: unknown) {
      recordAiUsage(provider, { success: false });

      const errStatus =
        err instanceof ApiError
          ? err.status
          : (err as { status?: number })?.status;
      const errMsg = err instanceof Error ? err.message : String((err as { message?: string })?.message || err);

      console.warn(
        `[AI Provider Failover] ${provider.toUpperCase()} failed (Status: ${errStatus || "unknown"}): ${errMsg.slice(0, 120)}`,
      );

      tripCircuitBreaker(provider, {
        status: errStatus === 429 ? "quota_exceeded" : errStatus === 401 ? "invalid_api_key" : "api_error",
        message: errMsg,
        httpStatus: errStatus,
      });

      attemptedErrors.push(`${provider.toUpperCase()}: ${errMsg.slice(0, 80)}`);
      // Proceed to next provider in loop
    }
  }

  // If all providers were exhausted or none configured
  const hasAnyKey = WRITING_PROVIDER_ORDER.some((p) => Boolean(getSanitizedKey(p)));
  if (!hasAnyKey) {
    return {
      status: "missing_api_key",
      skill: "writing",
      overallBand: null,
      criteria: null,
      criteriaFeedback: null,
      feedback: null,
      wordCount,
      message:
        "Chưa có AI provider nào được cấu hình API key trên server (GEMINI_API_KEY hoặc OPENAI_API_KEY). Vui lòng thêm key vào .env.local.",
    };
  }

  return {
    status: "api_error",
    skill: "writing",
    overallBand: null,
    criteria: null,
    criteriaFeedback: null,
    feedback: null,
    wordCount,
    message: `Tất cả các nhà cung cấp AI đều tạm thời gián đoạn (${attemptedErrors.join("; ")}). Vui lòng thử lại.`,
  };
}

/**
 * Evaluates Speaking audio with automatic provider failover
 */
export async function evaluateSpeakingWithFailover(options: {
  recordings: Record<
    string,
    { audioBase64?: string; mimeType?: string; durationSeconds?: number; questionPrompt?: string }
  >;
}): Promise<SpeakingAssessmentResponse> {
  if (isBudgetExceeded()) {
    return {
      status: "quota_exceeded",
      skill: "speaking",
      overallBand: null,
      criteria: null,
      criteriaFeedback: null,
      feedback: null,
      message: "Hệ thống đã đạt giới hạn ngân sách AI trong tháng. Vui lòng thử lại sau.",
    };
  }

  const attemptedErrors: string[] = [];

  for (const provider of SPEAKING_PROVIDER_ORDER) {
    const circuit = getProviderCircuitState(provider);
    const key = getSanitizedKey(provider);

    if (!key || circuit.status === "disabled" || circuit.status === "unconfigured") {
      continue;
    }
    if (circuit.status === "cooldown") {
      attemptedErrors.push(`${provider.toUpperCase()} đang cooldown`);
      continue;
    }

    const modelName = circuit.model;

    try {
      let callResult: { rawJson: string; tokensEstimated: number };

      if (provider === "gemini") {
        callResult = await callGeminiSpeaking(key, modelName, options.recordings);
      } else {
        callResult = await callOpenAiSpeaking(key, modelName, options.recordings);
      }

      recordAiUsage(provider, {
        success: true,
        outputTokens: Math.round(callResult.rawJson.length / 4),
      });

      markProviderHealthy(provider);
      return parseAndStandardizeSpeaking(callResult.rawJson, provider, modelName);
    } catch (err: unknown) {
      recordAiUsage(provider, { success: false });

      const errStatus =
        err instanceof ApiError
          ? err.status
          : (err as { status?: number })?.status;
      const errMsg = err instanceof Error ? err.message : String((err as { message?: string })?.message || err);

      console.warn(
        `[AI Provider Failover] ${provider.toUpperCase()} Speaking failed (Status: ${errStatus || "unknown"}): ${errMsg.slice(0, 120)}`,
      );

      tripCircuitBreaker(provider, {
        status: errStatus === 429 ? "quota_exceeded" : errStatus === 401 ? "invalid_api_key" : "api_error",
        message: errMsg,
        httpStatus: errStatus,
      });

      attemptedErrors.push(`${provider.toUpperCase()}: ${errMsg.slice(0, 80)}`);
      // Proceed to next provider
    }
  }

  const hasAnyKey = SPEAKING_PROVIDER_ORDER.some((p) => Boolean(getSanitizedKey(p)));
  if (!hasAnyKey) {
    return {
      status: "missing_api_key",
      skill: "speaking",
      overallBand: null,
      criteria: null,
      criteriaFeedback: null,
      feedback: null,
      message:
        "Chưa có AI provider hỗ trợ âm thanh nào được cấu hình API key (GEMINI_API_KEY hoặc OPENAI_API_KEY). Vui lòng thêm key vào .env.local.",
    };
  }

  return {
    status: "api_error",
    skill: "speaking",
    overallBand: null,
    criteria: null,
    criteriaFeedback: null,
    feedback: null,
    message: `Tất cả các nhà cung cấp AI đánh giá Speaking đều tạm thời gián đoạn (${attemptedErrors.join("; ")}). Vui lòng thử lại.`,
  };
}

/**
 * Reset helper for testing
 */
export function resetProviderCircuitBreakers(): void {
  for (const p of Object.keys(circuitBreakers) as AIProviderName[]) {
    circuitBreakers[p].status = "available";
    circuitBreakers[p].consecutiveFailures = 0;
    circuitBreakers[p].cooldownUntil = 0;
    circuitBreakers[p].lastError = undefined;
  }
}

