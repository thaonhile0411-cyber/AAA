import type { WritingPrompt } from "./prompts";

export const MAX_ESSAY_LENGTH = 8_000;
export const MIN_GRADING_TIME_MS = 5_000;
export const CLIENT_GRADING_TIMEOUT_MS = 14_500;
const wordPattern = new RegExp(
  "\\p{N}+(?:[.,]\\p{N}+)+|[\\p{L}\\p{N}][\\p{L}\\p{M}\\p{N}]*(?:['’\\u2010\\u2011-][\\p{L}\\p{N}][\\p{L}\\p{M}\\p{N}]*)*",
  "gu",
);

export const criteria = ["task", "coherence", "lexical", "grammar"] as const;
export const criterionLabels = {
  coherence: "Coherence & Cohesion",
  lexical: "Lexical Resource",
  grammar: "Grammatical Range & Accuracy",
};

export function taskCriterionLabel(task: WritingPrompt["task"]) {
  return task === 1 ? "Task Achievement" : "Task Response";
}

export type Correction = {
  start: number;
  end: number;
  replacement: string;
  explanation: string;
};

export type WritingAssessment = {
  overall: number;
  scores: Record<(typeof criteria)[number], number>;
  feedback: Record<(typeof criteria)[number], { issue: string; improvement: string }>;
  strengths: string[];
  taskFit: "on_topic" | "partially_on_topic" | "off_topic" | "unassessable";
  summary: string;
  corrections: Correction[];
  vocabulary: { original: string; replacement: string; explanation: string }[];
  rewrite: string;
};

export type WritingSubmission = {
  id: string;
  essay: string;
  status: "processing" | "completed" | "failed";
  assessment: WritingAssessment | null;
};

export type WritingSubmissionVersion = WritingSubmission & {
  createdAt: string;
  wordCount: number;
  leaseExpiresAt: string;
};

export function minimumWords(task: WritingPrompt["task"]) {
  return task === "practice" ? 120 : task === 1 ? 150 : 250;
}

export function countWords(essay: string) {
  return essay.match(wordPattern)?.length ?? 0;
}
