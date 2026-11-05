import type { Skill } from "@/lib/goals";
import type { WritingAssessment } from "@/features/writing/assessment";

export type { Skill };
export type TestSkill = Skill; // "listening" | "reading" | "writing" | "speaking"

export type SectionStatus = "not_started" | "in_progress" | "completed";

export type ListeningQuestionType = "fill_blank" | "multiple_choice";

export type ListeningQuestion = {
  id: string; // e.g., "L1"..."L10"
  part: 1 | 2 | 3 | 4;
  questionNumber: number;
  type: ListeningQuestionType;
  prompt: string;
  context?: string;
  options?: { label: string; text: string }[];
  correctAnswer: string | string[]; // case-insensitive match, or array of acceptable answers
  explanation?: string;
};

export type ListeningPart = {
  part: 1 | 2 | 3 | 4;
  title: string;
  topic: string;
  scenario: string;
  audioScript: string;
  estimatedDurationSeconds: number;
  questions: ListeningQuestion[];
};

export type ReadingQuestionType =
  | "multiple_choice"
  | "true_false_not_given"
  | "matching_headings";

export type ReadingQuestion = {
  id: string; // e.g., "R1"..."R12"
  part: 1 | 2 | 3;
  questionNumber: number;
  type: ReadingQuestionType;
  prompt: string;
  paragraphRef?: string;
  options?: { label: string; text: string }[];
  correctAnswer: string;
  explanation?: string;
};

export type ReadingPart = {
  part: 1 | 2 | 3;
  title: string;
  passageTitle: string;
  passageSubtitle?: string;
  paragraphs: { label?: string; text: string }[];
  headingsList?: { label: string; heading: string }[];
  questions: ReadingQuestion[];
};

export type WritingTaskChart = {
  title: string;
  description: string;
  xAxisLabel: string;
  yAxisLabel: string;
  unit: string;
  years: string[];
  series: {
    country: string;
    color: string;
    data: number[];
  }[];
};

export type WritingTaskData = {
  id?: string;
  taskNumber: 1 | 2;
  title: string;
  type: "academic_chart" | "essay";
  prompt: string;
  instructions: string;
  minWords: number;
  recommendedMinutes: number;
  chart?: WritingTaskChart;
};

export type SpeakingPart1Question = {
  id: string;
  prompt: string;
  tip?: string;
};

export type SpeakingPart2CueCard = {
  topic: string;
  intro: string;
  bulletPoints: string[];
  followUp: string;
  prepTimeSeconds: number;
  maxRecordTimeSeconds: number;
};

export type SpeakingPart3Question = {
  id: string;
  prompt: string;
  followUpContext?: string;
};

export type SpeakingTestContent = {
  part1: {
    title: string;
    instructions: string;
    questions: SpeakingPart1Question[];
  };
  part2: {
    title: string;
    instructions: string;
    cueCard: SpeakingPart2CueCard;
  };
  part3: {
    title: string;
    instructions: string;
    questions: SpeakingPart3Question[];
  };
};

export type SpeakingRecordingInfo = {
  hasRecorded: boolean;
  durationSeconds: number;
  timestamp: string;
  blobUrl?: string;
  audioBase64?: string;
  mimeType?: string;
  storagePath?: string;
};

export type PlacementTestAnswers = {
  listening: Record<string, string>;
  reading: Record<string, string>;
  writing: {
    task1: string;
    task2: string;
  };
  speakingRecordings: Record<string, SpeakingRecordingInfo>;
};

import type { AssessmentStatus } from "@/lib/placement-ai-types";

export type SkillScoreResult = {
  skill: TestSkill;
  band: number | null;
  status?: AssessmentStatus;
  statusMessage?: string;
  provider?: string;
  modelUsed?: string;
  rawScore?: number;
  totalQuestions?: number;
  percentage?: number;
  details?: Record<string, number | string>;
  criteria?: {
    name: string;
    score: number;
    description: string;
  }[];
  feedback: string;
  writingSubmission?: { id: string; essay: string; assessment: WritingAssessment };
  evaluationDetails?: {
    notableErrors?: string[];
    improvementSuggestions?: string[];
    isAiEvaluated?: boolean;
    evaluationSummary?: string;
    strengths?: string[];
    weaknesses?: string[];
  };
};

export type PlacementTestResult = {
  overallBand: number | null;
  skills: Record<TestSkill, SkillScoreResult>;
  strongestSkill: TestSkill | null;
  weakestSkill: TestSkill | null;
  recommendations: {
    prioritySkill: TestSkill;
    suggestedLevel: string;
    tips: string[];
  };
  submittedAt: string;
  evaluationStatus?: AssessmentStatus | "completed" | "partial" | "failed";
  errorMessage?: string;
};
