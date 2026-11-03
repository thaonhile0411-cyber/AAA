import { z } from "zod";

export type AssessmentStatus =
  | "success"
  | "missing_api_key"
  | "invalid_response"
  | "insufficient_response"
  | "audio_processing_error"
  | "api_error";

/**
 * Criterion Score & Feedback Schema (0.0 to 9.0, stepped by 0.5)
 */
export const CriterionEvaluationSchema = z.object({
  score: z.number().min(0).max(9),
  feedback: z.string().min(1),
});

export type CriterionEvaluation = z.infer<typeof CriterionEvaluationSchema>;

/**
 * Raw Gemini Output Schema for Writing Task 2
 */
export const GeminiWritingOutputSchema = z.object({
  isValidEnglishEssay: z.boolean(),
  isRelevantToTopic: z.boolean(),
  isMeaningfulContent: z.boolean(),
  rejectionReason: z.string().optional(),
  criteria: z
    .object({
      taskResponse: CriterionEvaluationSchema,
      coherenceAndCohesion: CriterionEvaluationSchema,
      lexicalResource: CriterionEvaluationSchema,
      grammaticalRangeAndAccuracy: CriterionEvaluationSchema,
    })
    .optional(),
  overallBand: z.number().min(0).max(9).optional(),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  improvements: z.array(z.string()).default([]),
  evaluationSummary: z.string().optional(),
});

export type GeminiWritingOutput = z.infer<typeof GeminiWritingOutputSchema>;

/**
 * Normalized Writing API Response
 */
export type WritingAssessmentResponse = {
  status: AssessmentStatus;
  skill: "writing";
  overallBand: number | null;
  criteria: {
    taskResponse: number;
    coherenceAndCohesion: number;
    lexicalResource: number;
    grammaticalRangeAndAccuracy: number;
  } | null;
  criteriaFeedback: {
    taskResponse: string;
    coherenceAndCohesion: string;
    lexicalResource: string;
    grammaticalRangeAndAccuracy: string;
  } | null;
  feedback: {
    strengths: string[];
    weaknesses: string[];
    improvements: string[];
    summary: string;
  } | null;
  wordCount?: number;
  message?: string;
  error?: string;
};

/**
 * Raw Gemini Output Schema for Speaking Multimodal Audio
 */
export const GeminiSpeakingOutputSchema = z.object({
  hasAudibleSpeech: z.boolean(),
  isEnglish: z.boolean(),
  isRelevant: z.boolean(),
  rejectionReason: z.string().optional(),
  criteria: z
    .object({
      fluencyAndCoherence: CriterionEvaluationSchema,
      lexicalResource: CriterionEvaluationSchema,
      grammaticalRangeAndAccuracy: CriterionEvaluationSchema,
      pronunciation: CriterionEvaluationSchema,
    })
    .optional(),
  overallBand: z.number().min(0).max(9).optional(),
  transcripts: z.record(z.string(), z.string()).optional(),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  improvements: z.array(z.string()).default([]),
  evaluationSummary: z.string().optional(),
});

export type GeminiSpeakingOutput = z.infer<typeof GeminiSpeakingOutputSchema>;

/**
 * Normalized Speaking API Response
 */
export type SpeakingAssessmentResponse = {
  status: AssessmentStatus;
  skill: "speaking";
  overallBand: number | null;
  criteria: {
    fluencyAndCoherence: number;
    lexicalResource: number;
    grammaticalRangeAndAccuracy: number;
    pronunciation: number;
  } | null;
  criteriaFeedback: {
    fluencyAndCoherence: string;
    lexicalResource: string;
    grammaticalRangeAndAccuracy: string;
    pronunciation: string;
  } | null;
  feedback: {
    strengths: string[];
    weaknesses: string[];
    improvements: string[];
    summary: string;
  } | null;
  transcripts?: Record<string, string>;
  message?: string;
  error?: string;
};
