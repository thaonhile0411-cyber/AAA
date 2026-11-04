import {
  ALL_LISTENING_QUESTIONS,
  ALL_READING_QUESTIONS,
  SPEAKING_CONTENT,
  WRITING_TASKS,
} from "../data/placement-test-data.ts";
import { countWords } from "./placement-scoring.ts";
import type { PlacementTestAnswers, TestSkill } from "../types/placement-test.ts";

export const SPEAKING_PART1_KEYS = SPEAKING_CONTENT.part1.questions.map(
  (q) => q.id,
); // ["S1", "S2", "S3"]

export const SPEAKING_PART2_KEY = "part2_cue_card";

export const SPEAKING_PART3_KEYS = SPEAKING_CONTENT.part3.questions.map(
  (q) => q.id,
); // ["S4", "S5"]

export const ALL_SPEAKING_KEYS: string[] = [
  ...SPEAKING_PART1_KEYS,
  SPEAKING_PART2_KEY,
  ...SPEAKING_PART3_KEYS,
]; // exactly 6 recording keys

/**
 * Returns the exact total number of questions/tasks for a given skill.
 * Derived directly from placement-test-data, never hardcoded.
 */
export function getTotalQuestions(skill: TestSkill): number {
  switch (skill) {
    case "listening":
      return ALL_LISTENING_QUESTIONS.length; // 10
    case "reading":
      return ALL_READING_QUESTIONS.length; // 12
    case "writing":
      return 1; // 1 Task (Task 2: Academic Essay)
    case "speaking":
      return ALL_SPEAKING_KEYS.length; // 6 recording parts
  }
}

/**
 * Validates whether a speaking recording entry is valid with real audio.
 * A recording is NOT counted as answered if it lacks audio data or is marked unrecorded.
 */
export function isSpeakingRecordingValid(
  rec: PlacementTestAnswers["speakingRecordings"][string] | undefined,
): boolean {
  if (!rec) return false;
  const hasAudio = Boolean(rec.blobUrl || rec.audioBase64 || rec.storagePath);
  return Boolean(rec.hasRecorded && rec.durationSeconds > 0 && hasAudio);
}

/**
 * Returns the count of answered questions/tasks for a given skill.
 */
export function getAnsweredQuestions(
  skill: TestSkill,
  answers: PlacementTestAnswers,
): number {
  switch (skill) {
    case "listening":
      return ALL_LISTENING_QUESTIONS.filter((q) =>
        Boolean(answers.listening[q.id]?.trim()),
      ).length;
    case "reading":
      return ALL_READING_QUESTIONS.filter((q) =>
        Boolean(answers.reading[q.id]?.trim()),
      ).length;
    case "writing":
      return Boolean(answers.writing.task2?.trim()) ? 1 : 0;
    case "speaking":
      return ALL_SPEAKING_KEYS.filter((key) =>
        isSpeakingRecordingValid(answers.speakingRecordings[key]),
      ).length;
  }
}

/**
 * Word count helper for writing response
 */
export function getWritingWordCount(answers: PlacementTestAnswers): number {
  return countWords(answers.writing.task2 || "");
}

/**
 * Minimum required word count for Task 2
 */
export function getWritingMinWords(): number {
  return WRITING_TASKS.find((t) => t.taskNumber === 2)?.minWords || 250;
}

/**
 * Comprehensive progress info for a single skill
 */
export function getSectionProgress(
  skill: TestSkill,
  answers: PlacementTestAnswers,
): {
  answered: number;
  total: number;
  percentage: number;
  isComplete: boolean;
  label: string;
} {
  const total = getTotalQuestions(skill);
  const answered = getAnsweredQuestions(skill, answers);
  const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;
  const isComplete = answered >= total;

  let label = `${answered}/${total} câu`;
  if (skill === "writing") {
    const words = getWritingWordCount(answers);
    const min = getWritingMinWords();
    label = `${words}/${min} từ`;
  } else if (skill === "speaking") {
    label = `${answered}/${total} phần`;
  }

  return { answered, total, percentage, isComplete, label };
}

/**
 * Full completion status across all 4 skills.
 * Used uniformly by SectionStepper, ReviewModal, and PlacementTestContainer.
 */
export function getCompletionStatus(answers: PlacementTestAnswers): {
  hasIncomplete: boolean;
  allComplete: boolean;
  hasAnyAnswer: boolean;
  skills: Record<
    TestSkill,
    {
      answered: number;
      total: number;
      isComplete: boolean;
      detailText: string;
    }
  >;
} {
  const listening = getSectionProgress("listening", answers);
  const reading = getSectionProgress("reading", answers);
  const writingWords = getWritingWordCount(answers);
  const writingMin = getWritingMinWords();
  const writingComplete = writingWords >= writingMin;
  const speaking = getSectionProgress("speaking", answers);

  const hasIncomplete =
    !listening.isComplete ||
    !reading.isComplete ||
    !writingComplete ||
    !speaking.isComplete;

  const hasAnyAnswer =
    listening.answered > 0 ||
    reading.answered > 0 ||
    writingWords > 0 ||
    speaking.answered > 0;

  return {
    hasIncomplete,
    allComplete: !hasIncomplete,
    hasAnyAnswer,
    skills: {
      listening: {
        answered: listening.answered,
        total: listening.total,
        isComplete: listening.isComplete,
        detailText: `${listening.answered}/${listening.total} câu đã trả lời`,
      },
      reading: {
        answered: reading.answered,
        total: reading.total,
        isComplete: reading.isComplete,
        detailText: `${reading.answered}/${reading.total} câu đã trả lời`,
      },
      writing: {
        answered: writingWords,
        total: writingMin,
        isComplete: writingComplete,
        detailText: `${writingWords} từ`,
      },
      speaking: {
        answered: speaking.answered,
        total: speaking.total,
        isComplete: speaking.isComplete,
        detailText: `${speaking.answered}/${speaking.total} phần đã ghi âm`,
      },
    },
  };
}
