import {
  countWords,
  type WritingAssessment as DetailedWritingAssessment,
} from "@/features/writing/assessment";
import { submitWritingAssessment } from "@/features/writing/submit-assessment";
import { getCentralGeminiModel } from "@/lib/gemini-server";
import {
  createMockWritingAssessment,
  isMockAiEvaluationEnabled,
} from "@/lib/development-mock-ai";
import type { WritingAssessmentResponse } from "@/lib/placement-ai-types";

export const maxDuration = 15;

export async function POST(request: Request) {
  if (isMockAiEvaluationEnabled()) {
    const { essay } = await request.clone().json().catch(() => ({ essay: "" })) as {
      essay?: string;
    };
    const wordCount = countWords(essay ?? "");
    if (wordCount < 250) {
      const payload: WritingAssessmentResponse = {
        status: "insufficient_response",
        skill: "writing",
        overallBand: null,
        criteria: null,
        criteriaFeedback: null,
        feedback: null,
        wordCount,
        message: `Bài viết cần tối thiểu 250 từ. Còn thiếu ${250 - wordCount} từ.`,
      };
      return Response.json(payload, { status: 422 });
    }
    return Response.json(createMockWritingAssessment(wordCount));
  }

  const response = await submitWritingAssessment(request, "placement");
  const data: {
    id?: string;
    assessment?: DetailedWritingAssessment;
    wordCount?: number;
    message?: string;
  } = await response.json();
  const assessment = data.assessment;
  const scored = assessment && assessment.taskFit !== "unassessable";
  const { scores, feedback } = assessment ?? {};

  const payload: WritingAssessmentResponse = {
    skill: "writing",
    status: scored ? "success"
      : assessment ? "invalid_response"
      : response.status === 422 ? "insufficient_response"
      : "api_error",
    overallBand: scored ? assessment.overall : null,
    criteria: scored && scores ? {
      taskResponse: scores.task,
      coherenceAndCohesion: scores.coherence,
      lexicalResource: scores.lexical,
      grammaticalRangeAndAccuracy: scores.grammar,
    } : null,
    criteriaFeedback: scored && feedback ? {
      taskResponse: feedback.task.issue,
      coherenceAndCohesion: feedback.coherence.issue,
      lexicalResource: feedback.lexical.issue,
      grammaticalRangeAndAccuracy: feedback.grammar.issue,
    } : null,
    feedback: assessment ? {
      strengths: assessment.strengths,
      weaknesses: Object.values(assessment.feedback).map(({ issue }) => issue),
      improvements: Object.values(assessment.feedback).map(({ improvement }) => improvement),
      summary: assessment.summary,
    } : null,
    wordCount: data.wordCount,
    provider: "gemini",
    modelUsed: getCentralGeminiModel(),
    message: data.message ?? assessment?.summary,
    ...(data.id && assessment && { submission: { id: data.id, assessment } }),
  };
  return Response.json(payload, { status: response.status, headers: response.headers });
}
