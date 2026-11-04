import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculatePlacementTestResult,
  countWords,
  getListeningBand,
  getReadingBand,
  isAnswerCorrect,
  normalizeAnswer,
  roundToIeltsBand,
  scoreListening,
  scoreReading,
  scoreSpeaking,
  scoreWriting,
} from "../src/lib/placement-scoring.ts";
import {
  GeminiWritingOutputSchema,
  GeminiSpeakingOutputSchema,
} from "../src/lib/placement-ai-types.ts";
import type { PlacementTestAnswers } from "../src/types/placement-test.ts";
import {
  ALL_LISTENING_QUESTIONS,
  ALL_READING_QUESTIONS,
} from "../src/data/placement-test-data.ts";

test("US-103 keeps the documented Listening 10 and Reading 12 totals", () => {
  assert.equal(ALL_LISTENING_QUESTIONS.length, 10);
  assert.equal(ALL_READING_QUESTIONS.length, 12);
});

test("normalizeAnswer trims, lowers, and strips punctuation", () => {
  assert.equal(normalizeAnswer("  Single Room. "), "single room");
  assert.equal(normalizeAnswer("Credit-card!"), "creditcard");
  assert.equal(normalizeAnswer("15th September"), "15th september");
});

test("isAnswerCorrect handles single and multiple allowed answers", () => {
  assert.equal(isAnswerCorrect("single", ["single", "single room"]), true);
  assert.equal(isAnswerCorrect("Single Room", ["single", "single room"]), true);
  assert.equal(isAnswerCorrect("double", ["single", "single room"]), false);
  assert.equal(isAnswerCorrect(undefined, ["single"]), false);
  assert.equal(isAnswerCorrect("", ["single"]), false);
  assert.equal(isAnswerCorrect("B", "B"), true);
  assert.equal(isAnswerCorrect("b", "B"), true);
  assert.equal(isAnswerCorrect("TRUE", "TRUE"), true);
  assert.equal(isAnswerCorrect("True", "TRUE"), true);
});

test("roundToIeltsBand applies official half-band rounding", () => {
  // .25 rounds up to .5
  assert.equal(roundToIeltsBand(6.25), 6.5);
  // .75 rounds up to next whole band
  assert.equal(roundToIeltsBand(6.75), 7.0);
  // .125 rounds down to .0
  assert.equal(roundToIeltsBand(6.125), 6.0);
  // .375 rounds up to .5
  assert.equal(roundToIeltsBand(6.375), 6.5);
  // .625 rounds to .5
  assert.equal(roundToIeltsBand(6.625), 6.5);
});

test("IELTS 4-skill Overall Band calculation with exact half-band rounding", () => {
  // (6.5 + 6.5 + 6.0 + 6.0) / 4 = 25 / 4 = 6.25 -> 6.5
  const mean1 = (6.5 + 6.5 + 6.0 + 6.0) / 4;
  assert.equal(roundToIeltsBand(mean1), 6.5);

  // (6.0 + 6.0 + 6.0 + 5.0) / 4 = 23 / 4 = 5.75 -> 6.0
  const mean2 = (6.0 + 6.0 + 6.0 + 5.0) / 4;
  assert.equal(roundToIeltsBand(mean2), 6.0);

  // (5.0 + 5.5 + 5.0 + 5.0) / 4 = 20.5 / 4 = 5.125 -> 5.0
  const mean3 = (5.0 + 5.5 + 5.0 + 5.0) / 4;
  assert.equal(roundToIeltsBand(mean3), 5.0);

  // (7.0 + 7.5 + 7.5 + 7.5) / 4 = 29.5 / 4 = 7.375 -> 7.5
  const mean4 = (7.0 + 7.5 + 7.5 + 7.5) / 4;
  assert.equal(roundToIeltsBand(mean4), 7.5);
});

test("countWords splits accurately by whitespace", () => {
  assert.equal(countWords(""), 0);
  assert.equal(countWords("   "), 0);
  assert.equal(countWords("Hello world"), 2);
  assert.equal(countWords("This is a 6-word sentence test."), 6);
});

test("listening band mapping returns correct band", () => {
  assert.equal(getListeningBand(10), 8.5);
  assert.equal(getListeningBand(9), 8.0);
  assert.equal(getListeningBand(8), 7.0);
  assert.equal(getListeningBand(7), 6.5);
  assert.equal(getListeningBand(6), 6.0);
  assert.equal(getListeningBand(5), 5.5);
  assert.equal(getListeningBand(0), 3.0);
});

test("reading band mapping returns correct band", () => {
  assert.equal(getReadingBand(12), 8.5);
  assert.equal(getReadingBand(11), 8.0);
  assert.equal(getReadingBand(10), 7.5);
  assert.equal(getReadingBand(9), 7.0);
  assert.equal(getReadingBand(8), 6.5);
  assert.equal(getReadingBand(7), 6.0);
  assert.equal(getReadingBand(0), 3.0);
});

test("scoreListening scores correctly against answer key", () => {
  const perfectAnswers: Record<string, string> = {
    L1: "single room",
    L2: "15th",
    L3: "credit card",
    L4: "B",
    L5: "B",
    L6: "B",
    L7: "A",
    L8: "B",
    L9: "predictability",
    L10: "cooling",
  };
  const result = scoreListening(perfectAnswers);
  assert.equal(result.rawScore, 10);
  assert.equal(result.totalQuestions, 10);
  assert.equal(result.percentage, 100);
  assert.equal(result.band, 8.5);
});

test("scoreReading scores correctly against answer key", () => {
  const sampleAnswers: Record<string, string> = {
    R1: "TRUE",
    R2: "FALSE",
    R3: "C",
    R4: "NOT GIVEN",
    R5: "i",
    R6: "iii",
    R7: "iv",
    R8: "v",
    R9: "B",
    R10: "C",
    R11: "FALSE",
    R12: "TRUE",
  };
  const result = scoreReading(sampleAnswers);
  assert.equal(result.rawScore, 12);
  assert.equal(result.totalQuestions, 12);
  assert.equal(result.percentage, 100);
  assert.equal(result.band, 8.5);
});

test("GeminiWritingOutputSchema validates valid AI assessment output", () => {
  const validAiPayload = {
    isValidEnglishEssay: true,
    isRelevantToTopic: true,
    isMeaningfulContent: true,
    criteria: {
      taskResponse: { score: 6.5, feedback: "Addresses both viewpoints with clear stance." },
      coherenceAndCohesion: { score: 6.0, feedback: "Good paragraph progression." },
      lexicalResource: { score: 6.5, feedback: "Appropriate academic vocabulary." },
      grammaticalRangeAndAccuracy: { score: 6.0, feedback: "Mixture of complex sentences." },
    },
    overallBand: 6.5,
    improvements: ["Expand concluding thoughts."],
    evaluationSummary: "Competent response meeting IELTS Task 2 requirements.",
  };

  const parsed = GeminiWritingOutputSchema.safeParse(validAiPayload);
  assert.equal(parsed.success, true);
});

test("GeminiSpeakingOutputSchema validates valid AI audio assessment output", () => {
  const validAiPayload = {
    hasAudibleSpeech: true,
    isEnglish: true,
    isRelevant: true,
    criteria: {
      fluencyAndCoherence: { score: 6.0, feedback: "Maintains flow with occasional self-correction." },
      lexicalResource: { score: 6.0, feedback: "Good range of general and topic vocabulary." },
      grammaticalRangeAndAccuracy: { score: 5.5, feedback: "Accurate simple sentences, some slips in complex." },
      pronunciation: { score: 6.5, feedback: "Clear rhythm, easy to understand throughout." },
    },
    overallBand: 6.0,
    transcripts: { S1: "I live in a peaceful neighborhood." },
    improvements: ["Extend Part 3 answers with more abstract justification."],
    evaluationSummary: "Natural conversational pace with clear pronunciation.",
  };

  const parsed = GeminiSpeakingOutputSchema.safeParse(validAiPayload);
  assert.equal(parsed.success, true);
});

test("scoreWriting evaluates word counts and paragraph structure", () => {
  const emptyResult = scoreWriting({ task1: "", task2: "" });
  assert.equal(emptyResult.band, 3.0);

  const fullEssay = Array(160).fill("word").join(" ");
  const fullTask2 = Array(260).fill("academic").join(" ");
  const goodResult = scoreWriting({
    task1: `${fullEssay}\n\n${fullEssay}`,
    task2: `${fullTask2}\n\n${fullTask2}`,
  });
  assert.ok(goodResult.band !== null && goodResult.band >= 6.0);
});

test("scoreSpeaking evaluates recordings count and duration", () => {
  const emptySpeaking = scoreSpeaking({});
  assert.equal(emptySpeaking.band, 3.0);

  const fullSpeaking = scoreSpeaking({
    S1: { hasRecorded: true, durationSeconds: 30, timestamp: "" },
    S2: { hasRecorded: true, durationSeconds: 35, timestamp: "" },
    S3: { hasRecorded: true, durationSeconds: 30, timestamp: "" },
    part2_cue_card: { hasRecorded: true, durationSeconds: 90, timestamp: "" },
    S4: { hasRecorded: true, durationSeconds: 45, timestamp: "" },
    S5: { hasRecorded: true, durationSeconds: 45, timestamp: "" },
  });
  assert.ok(fullSpeaking.band !== null && fullSpeaking.band >= 6.0);
});

test("calculatePlacementTestResult combines all skills and identifies strongest and weakest", () => {
  const answers: PlacementTestAnswers = {
    listening: {
      L1: "single room",
      L2: "15th",
      L3: "credit card",
      L4: "B",
      L5: "B",
      L6: "B",
      L7: "A",
      L8: "B",
      L9: "predictability",
      L10: "cooling",
    },
    reading: {
      R1: "TRUE",
      R2: "FALSE",
      R3: "C",
    },
    writing: {
      task1: Array(155).fill("sample").join(" "),
      task2: Array(255).fill("sample").join(" "),
    },
    speakingRecordings: {
      S1: { hasRecorded: true, durationSeconds: 30, timestamp: "" },
    },
  };

  const result = calculatePlacementTestResult(answers);
  assert.equal(result.skills.listening.band, 8.5);
  assert.equal(result.strongestSkill, "listening");
  assert.ok(result.overallBand !== null && result.overallBand > 0);
  assert.ok(result.recommendations.tips.length > 0);
});
