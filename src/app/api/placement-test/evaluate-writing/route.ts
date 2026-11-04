import { NextResponse } from "next/server";
import type { WritingAssessmentResponse } from "@/lib/placement-ai-types";
import { validateWritingInput } from "@/lib/placement-ai-validation";
import { countWords } from "@/lib/placement-scoring";
import { evaluateWritingWithFailover } from "@/lib/ai-provider-manager";
import {
  createEvaluationJob,
  updateEvaluationJob,
} from "@/lib/ai-evaluation-queue";
import { getWritingTask } from "@/data/placement-test-data";

export const maxDuration = 60; // 60 seconds timeout for AI evaluation

type EvaluateWritingRequestBody = {
  essay?: string;
  prompt?: string;
  questionId?: string;
  attemptId?: string;
  submissionId?: string;
  idempotencyKey?: string;
};

export async function POST(request: Request) {
  try {
    const body =
      (await request.json().catch(() => ({}))) as EvaluateWritingRequestBody;
    const { essay, prompt, questionId, attemptId, submissionId, idempotencyKey } =
      body;

    const wordCount = countWords(essay || "");

    // 1. Strict Pre-validation (Language, Gibberish, Length)
    // Do not invoke AI or retry across providers if input itself is invalid
    const validation = validateWritingInput(essay);
    if (!validation.valid) {
      const responsePayload: WritingAssessmentResponse = {
        status: validation.status,
        skill: "writing",
        overallBand: null,
        criteria: null,
        criteriaFeedback: null,
        feedback: null,
        wordCount,
        message: validation.message,
      };
      return NextResponse.json(responsePayload, { status: 200 });
    }

    // 2. Resolve Task Prompt from Payload or Official Data Source
    // NEVER substitute or default to an unrelated prompt (e.g. AI employment)
    let effectiveTaskPrompt = "";
    const effectiveQuestionId = questionId || "writing_task_2";

    if (prompt && prompt.trim().length >= 15) {
      effectiveTaskPrompt = prompt.trim();
    } else {
      // Lookup official prompt from data dictionary using questionId
      const officialTask = getWritingTask(effectiveQuestionId);
      if (officialTask?.prompt) {
        effectiveTaskPrompt = officialTask.prompt.trim();
      }
    }

    if (!effectiveTaskPrompt) {
      const errorPayload: WritingAssessmentResponse = {
        status: "invalid_response",
        skill: "writing",
        overallBand: null,
        criteria: null,
        criteriaFeedback: null,
        feedback: null,
        wordCount,
        message:
          "Thiếu đề bài (Task Prompt) hoặc questionId không hợp lệ. Vui lòng cung cấp đúng thông tin đề bài để đánh giá.",
      };
      return NextResponse.json(errorPayload, { status: 400 });
    }

    // 3. Persistent Job Creation & Attempt Identification
    const effectiveAttemptId =
      attemptId || submissionId || `attempt_${Date.now()}`;
    const effectiveSubmissionId = submissionId || effectiveAttemptId;
    const effectiveIdempotencyKey =
      idempotencyKey || `writing_${effectiveAttemptId}_${effectiveQuestionId}`;
    const evalRequestId = `eval_w_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // Detailed Logging in non-production for prompt verification and audit
    if (process.env.NODE_ENV !== "production") {
      console.log("[Writing Evaluation Request]", {
        evalRequestId,
        attemptId: effectiveAttemptId,
        questionId: effectiveQuestionId,
        promptSnippet: effectiveTaskPrompt.slice(0, 100) + "...",
        essayWordCount: wordCount,
        submittedAt: new Date().toISOString(),
      });
    }

    const { job, isDuplicate } = await createEvaluationJob({
      submissionId: effectiveSubmissionId,
      idempotencyKey: effectiveIdempotencyKey,
      skill: "writing",
      payload: {
        essay,
        prompt: effectiveTaskPrompt,
        questionId: effectiveQuestionId,
        attemptId: effectiveAttemptId,
      },
    });

    // If job was previously completed AND the essay/prompt content matches, return cached result.
    // If the essay or prompt changed in this attempt, do not return stale cache.
    if (
      isDuplicate &&
      job.status === "completed" &&
      job.result &&
      job.payload?.essay === essay &&
      job.payload?.prompt === effectiveTaskPrompt
    ) {
      return NextResponse.json(job.result as WritingAssessmentResponse, {
        status: 200,
      });
    }

    // Mark job as processing
    await updateEvaluationJob(job.id, {
      status: "processing",
      attemptCount: job.attemptCount + 1,
      payload: {
        essay,
        prompt: effectiveTaskPrompt,
        questionId: effectiveQuestionId,
        attemptId: effectiveAttemptId,
      },
    });

    // 4. Multi-Provider Evaluation with Failover
    // Gemini (primary) -> OpenAI (secondary) -> Groq (third)
    const result = await evaluateWritingWithFailover({
      essayText: essay!,
      taskPrompt: effectiveTaskPrompt,
    });

    // 5. Update Persistent Job Status
    if (result.status === "success") {
      await updateEvaluationJob(job.id, {
        status: "completed",
        provider: result.provider,
        modelUsed: result.modelUsed,
        result: result as unknown as Record<string, unknown>,
        tokensUsed: Math.round((essay!.length + effectiveTaskPrompt.length) / 4),
      });
    } else {
      await updateEvaluationJob(job.id, {
        status: "failed",
        errorCode: result.status,
        errorMessage: result.message,
      });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("evaluate-writing unexpected error:", error);
    const message =
      error instanceof Error ? error.message : "Internal evaluation error";

    const errorPayload: WritingAssessmentResponse = {
      status: "api_error",
      skill: "writing",
      overallBand: null,
      criteria: null,
      criteriaFeedback: null,
      feedback: null,
      message:
        "Không thể hoàn thành đánh giá bài viết do lỗi nội bộ hệ thống.",
      error: message,
    };
    return NextResponse.json(errorPayload, { status: 200 });
  }
}
