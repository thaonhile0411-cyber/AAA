import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ALL_SPEAKING_KEYS,
  getAnsweredQuestions,
  getCompletionStatus,
  getSectionProgress,
  getTotalQuestions,
  getWritingMinWords,
  getWritingWordCount,
  isSpeakingRecordingValid,
} from "../src/lib/placement-progress.ts";
import {
  LISTENING_PARTS,
  READING_PARTS,
} from "../src/data/placement-test-data.ts";
import type { PlacementTestAnswers } from "../src/types/placement-test.ts";

// Helper function to test option prefix stripping logic
function stripOptionPrefix(label: string, text: string): string {
  if (!text) return "";
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const prefixRegex = new RegExp(`^${escapedLabel}\\s*[:.)-]\\s*`, "i");
  return text.replace(prefixRegex, "").trim();
}

// ==========================================
// 1. QUESTION COUNT & PROGRESS CALCULATION
// ==========================================

test("Total questions are dynamically derived from test data", () => {
  assert.equal(getTotalQuestions("listening"), 10, "Listening must have 10 questions");
  assert.equal(getTotalQuestions("reading"), 12, "Reading must have 12 questions");
  assert.equal(getTotalQuestions("writing"), 1, "Writing has 1 Task");
  assert.equal(getTotalQuestions("speaking"), 6, "Speaking has 6 recorded prompts");
  assert.equal(ALL_SPEAKING_KEYS.length, 6, "All speaking keys must count to 6");
});

test("Listening answered question counter ignores empty or whitespace-only answers", () => {
  const partialAnswers: PlacementTestAnswers = {
    listening: {
      L1: "Single",
      L2: "   ", // whitespace only
      L3: "Breakfast",
      L4: "",
    },
    reading: {},
    writing: { task1: "", task2: "" },
    speakingRecordings: {},
  };

  const answered = getAnsweredQuestions("listening", partialAnswers);
  assert.equal(answered, 2, "Only non-whitespace answers should count as answered");
  const progress = getSectionProgress("listening", partialAnswers);
  assert.equal(progress.answered, 2);
  assert.equal(progress.total, 10);
  assert.equal(progress.label, "2/10 câu");
});

test("Reading answered question counter accurately handles all 12 questions", () => {
  const fullReading: Record<string, string> = {};
  for (let i = 1; i <= 12; i++) {
    fullReading[`R${i}`] = "Answer";
  }

  const answers: PlacementTestAnswers = {
    listening: {},
    reading: fullReading,
    writing: { task1: "", task2: "" },
    speakingRecordings: {},
  };

  const progress = getSectionProgress("reading", answers);
  assert.equal(progress.answered, 12);
  assert.equal(progress.total, 12);
  assert.equal(progress.label, "12/12 câu");
});

test("Writing word count and requirement logic", () => {
  const answers: PlacementTestAnswers = {
    listening: {},
    reading: {},
    writing: {
      task1: "",
      task2: "In modern society, education plays an indispensable role in individual and collective prosperity.",
    },
    speakingRecordings: {},
  };

  const wordCount = getWritingWordCount(answers);
  assert.equal(wordCount, 13);
  assert.equal(getWritingMinWords(), 250);
  assert.equal(getAnsweredQuestions("writing", answers), 1);
});

test("Speaking recording validator requires valid duration and hasRecorded flag", () => {
  const dummyTime = "2026-11-04T00:00:00Z";
  assert.equal(isSpeakingRecordingValid(undefined), false);
  assert.equal(isSpeakingRecordingValid({ hasRecorded: false, durationSeconds: 0, timestamp: dummyTime }), false);
  assert.equal(isSpeakingRecordingValid({ hasRecorded: true, durationSeconds: 0, blobUrl: "blob:test", timestamp: dummyTime }), false);
  assert.equal(isSpeakingRecordingValid({ hasRecorded: true, durationSeconds: 5, timestamp: dummyTime }), false); // missing audio
  assert.equal(isSpeakingRecordingValid({ hasRecorded: true, durationSeconds: 5, blobUrl: "blob:test", timestamp: dummyTime }), true);

  const answers: PlacementTestAnswers = {
    listening: {},
    reading: {},
    writing: { task1: "", task2: "" },
    speakingRecordings: {
      S1: { hasRecorded: true, durationSeconds: 15, blobUrl: "blob:1", timestamp: dummyTime },
      S2: { hasRecorded: true, durationSeconds: 0, blobUrl: "blob:2", timestamp: dummyTime }, // invalid duration
      part2_cue_card: { hasRecorded: true, durationSeconds: 65, blobUrl: "blob:3", timestamp: dummyTime },
    },
  };

  const answered = getAnsweredQuestions("speaking", answers);
  assert.equal(answered, 2);
  const progress = getSectionProgress("speaking", answers);
  assert.equal(progress.answered, 2);
  assert.equal(progress.total, 6);
  assert.equal(progress.label, "2/6 phần");
});

test("getCompletionStatus detects partial and full completion correctly without blocking", () => {
  const dummyTime = "2026-11-04T00:00:00Z";
  const emptyAnswers: PlacementTestAnswers = {
    listening: {},
    reading: {},
    writing: { task1: "", task2: "" },
    speakingRecordings: {},
  };

  const emptyStatus = getCompletionStatus(emptyAnswers);
  assert.equal(emptyStatus.allComplete, false);
  assert.equal(emptyStatus.hasAnyAnswer, false);
  assert.equal(emptyStatus.skills.listening.isComplete, false);
  assert.equal(emptyStatus.skills.reading.isComplete, false);
  assert.equal(emptyStatus.skills.writing.isComplete, false);
  assert.equal(emptyStatus.skills.speaking.isComplete, false);

  // Partial test: User answered 8 listening, 10 reading, 200 words writing, 4 speaking
  const partialAnswers: PlacementTestAnswers = {
    listening: { L1: "a", L2: "b", L3: "c", L4: "d", L5: "e", L6: "f", L7: "g", L8: "h" },
    reading: { R1: "a", R2: "b", R3: "c", R4: "d", R5: "e", R6: "f", R7: "g", R8: "h", R9: "i", R10: "j" },
    writing: { task1: "", task2: new Array(260).fill("academic").join(" ") },
    speakingRecordings: {
      S1: { hasRecorded: true, durationSeconds: 10, blobUrl: "blob:1", timestamp: dummyTime },
      S2: { hasRecorded: true, durationSeconds: 10, blobUrl: "blob:2", timestamp: dummyTime },
      S3: { hasRecorded: true, durationSeconds: 10, blobUrl: "blob:3", timestamp: dummyTime },
      part2_cue_card: { hasRecorded: true, durationSeconds: 60, blobUrl: "blob:4", timestamp: dummyTime },
    },
  };

  const partialStatus = getCompletionStatus(partialAnswers);
  assert.equal(partialStatus.hasAnyAnswer, true);
  assert.equal(partialStatus.allComplete, false);
  assert.equal(partialStatus.skills.listening.answered, 8);
  assert.equal(partialStatus.skills.listening.total, 10);
  assert.equal(partialStatus.skills.reading.answered, 10);
  assert.equal(partialStatus.skills.reading.total, 12);
  assert.equal(partialStatus.skills.writing.isComplete, true); // >= 250 words
  assert.equal(partialStatus.skills.speaking.answered, 4);
  assert.equal(partialStatus.skills.speaking.total, 6);
});

// ==========================================
// 2. READING OPTION DUPLICATION FIX
// ==========================================

test("Reading Matching Headings options do NOT have duplicate roman numerals in text", () => {
  const headingsSection = READING_PARTS[1];
  assert.ok(headingsSection, "Section 2 should exist");

  const headingQuestions = headingsSection.questions.filter(
    (q) => q.type === "matching_headings",
  );
  assert.ok(headingQuestions.length > 0, "Matching headings questions should exist");

  for (const q of headingQuestions) {
    if (q.options) {
      for (const opt of q.options) {
        // Option label is e.g. "i", "ii", "iii"
        // opt.text should NOT start with "i. ", "ii. ", etc.
        const label = opt.label.trim();
        const text = opt.text.trim();
        const startsWithDuplicateLabel = new RegExp(`^${label}\\s*[:.)-]`, "i").test(text);
        assert.equal(
          startsWithDuplicateLabel,
          false,
          `Option text '${text}' should not repeat label '${label}'`,
        );
      }
    }
  }
});

test("stripOptionPrefix cleanly removes redundant label prefix without altering text", () => {
  // Test matching headings formats
  assert.equal(
    stripOptionPrefix("i", "Bureaucratic hurdles in university research"),
    "Bureaucratic hurdles in university research",
  );
  assert.equal(
    stripOptionPrefix("ii", "Funding disparities between faculties"),
    "Funding disparities between faculties",
  );
  assert.equal(
    stripOptionPrefix("iv", "The transition from laboratory to market"),
    "The transition from laboratory to market",
  );
  // Test clean text without prefix remains untouched
  assert.equal(
    stripOptionPrefix("i", "Bureaucratic hurdles in university research"),
    "Bureaucratic hurdles in university research",
  );
  // Test True/False/Not Given
  assert.equal(stripOptionPrefix("TRUE", "TRUE. True"), "True");
});

test("Reading True/False/Not Given options have correct labels", () => {
  const tfngSection = READING_PARTS[0];
  const tfngQuestions = tfngSection.questions.filter(
    (q) => q.type === "true_false_not_given",
  );
  assert.ok(tfngQuestions.length > 0, "TFNG questions should exist");

  for (const q of tfngQuestions) {
    const labels = q.options?.map((o) => o.label);
    assert.deepEqual(labels, ["TRUE", "FALSE", "NOT GIVEN"]);
  }
});

test("Actual question data matches required totals (Listening 10, Reading 12)", () => {
  const listeningCount = LISTENING_PARTS.reduce(
    (sum, part) => sum + part.questions.length,
    0,
  );
  const readingCount = READING_PARTS.reduce(
    (sum, part) => sum + part.questions.length,
    0,
  );
  assert.equal(listeningCount, 10);
  assert.equal(readingCount, 12);
});

// ==========================================
// 4. TIMER & STORAGE PERSISTENCE
// ==========================================

import {
  clearPlacementTestStorage,
  isTestSubmitted,
  loadSavedAnswers,
  loadTestTimer,
  loadUnlockedSkills,
  saveAnswersToStorage,
  saveTestTimer,
  saveUnlockedSkills,
  setTestSubmitted,
} from "../src/lib/placement-storage.ts";

function createMockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

test("Timer persistence saves startTime and deadlineMs, and recovers accurately across simulated refresh", () => {
  const mockStorage = createMockStorage();
  const now = 1700000000000;
  const deadline = now + 3300 * 1000; // 55 minutes

  saveTestTimer(now, deadline, mockStorage);

  const recovered = loadTestTimer(mockStorage);
  assert.equal(recovered.startTimeMs, now);
  assert.equal(recovered.deadlineMs, deadline);

  // Simulated elapsed time: 300 seconds passed
  const simulatedCurrentTime = now + 300 * 1000;
  const remainingSeconds = Math.max(
    0,
    Math.floor((recovered.deadlineMs! - simulatedCurrentTime) / 1000),
  );
  assert.equal(remainingSeconds, 3000, "Should have 3000 seconds remaining after 300 seconds");
});

test("Test submitted state prevents duplicate submissions and persists correctly", () => {
  const mockStorage = createMockStorage();
  assert.equal(isTestSubmitted(mockStorage), false);

  setTestSubmitted(true, mockStorage);
  assert.equal(isTestSubmitted(mockStorage), true);

  setTestSubmitted(false, mockStorage);
  assert.equal(isTestSubmitted(mockStorage), false);
});

test("Unlocked skills progress sequentially from listening and persist", () => {
  const mockStorage = createMockStorage();
  // Default when empty
  assert.deepEqual(loadUnlockedSkills(mockStorage), ["listening"]);

  // Unlock reading
  saveUnlockedSkills(["listening", "reading"], mockStorage);
  assert.deepEqual(loadUnlockedSkills(mockStorage), ["listening", "reading"]);

  // Unlock all
  saveUnlockedSkills(["listening", "reading", "writing", "speaking"], mockStorage);
  assert.deepEqual(loadUnlockedSkills(mockStorage), [
    "listening",
    "reading",
    "writing",
    "speaking",
  ]);
});

test("clearPlacementTestStorage cleans all answers, timer, submitted flag, and unlocked state", () => {
  const mockStorage = createMockStorage();
  saveTestTimer(1000, 2000, mockStorage);
  setTestSubmitted(true, mockStorage);
  saveUnlockedSkills(["listening", "reading"], mockStorage);
  saveAnswersToStorage(
    {
      listening: { L1: "test" },
      reading: {},
      writing: { task1: "", task2: "test" },
      speakingRecordings: {},
    },
    mockStorage,
  );

  clearPlacementTestStorage(mockStorage);

  assert.equal(isTestSubmitted(mockStorage), false);
  assert.equal(loadTestTimer(mockStorage).deadlineMs, null);
  assert.deepEqual(loadUnlockedSkills(mockStorage), ["listening"]);
  const answers = loadSavedAnswers(mockStorage);
  assert.deepEqual(answers.listening, {});
  assert.equal(answers.writing.task2, "");
});

