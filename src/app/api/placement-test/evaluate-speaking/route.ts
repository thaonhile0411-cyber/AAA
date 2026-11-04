import { NextResponse } from "next/server";
import type { SpeakingAssessmentResponse } from "@/lib/placement-ai-types";
import {
  sanitizeAudioBase64,
  validateSpeakingInput,
} from "@/lib/placement-ai-validation";
import { evaluateSpeakingWithFailover } from "@/lib/ai-provider-manager";
import {
  createEvaluationJob,
  updateEvaluationJob,
} from "@/lib/ai-evaluation-queue";
import {
  createMockSpeakingAssessment,
  isMockAiEvaluationEnabled,
} from "@/lib/development-mock-ai";

export const maxDuration = 60; // 60 seconds timeout for audio AI analysis

type SpeakingAudioPayload = {
  recordings: Record<
    string,
    {
      audioBase64?: string;
      mimeType?: string;
      durationSeconds?: number;
      questionPrompt?: string;
      hasRecorded?: boolean;
    }
  >;
  submissionId?: string;
  idempotencyKey?: string;
};

export async function POST(request: Request) {
  try {
    const body =
      (await request.json().catch(() => ({}))) as SpeakingAudioPayload;
    const { recordings, submissionId, idempotencyKey } = body;

    // 1. Strict Pre-validation (Audio presence, duration >= 3s)
    const validation = validateSpeakingInput(recordings);
    if (!validation.valid) {
      const responsePayload: SpeakingAssessmentResponse = {
        status: validation.status,
        skill: "speaking",
        overallBand: null,
        criteria: null,
        criteriaFeedback: null,
        feedback: null,
        message: validation.message,
      };
      return NextResponse.json(responsePayload, { status: 200 });
    }

    // Filter valid recordings
    const validKeys = Object.keys(recordings || {}).filter((key) => {
      const rec = recordings[key];
      if (!rec || !rec.hasRecorded || !rec.audioBase64) return false;
      const clean = sanitizeAudioBase64(rec.audioBase64);
      return clean.length > 50 && (rec.durationSeconds ?? 0) >= 2;
    });

    if (validKeys.length === 0) {
      const responsePayload: SpeakingAssessmentResponse = {
        status: "insufficient_response",
        skill: "speaking",
        overallBand: null,
        criteria: null,
        criteriaFeedback: null,
        feedback: null,
        message:
          "Không tìm thấy dữ liệu âm thanh hợp lệ trong các phần ghi âm để gửi lên AI.",
      };
      return NextResponse.json(responsePayload, { status: 200 });
    }

    // 2. Persistent Job Creation & Idempotency Check
    const effectiveSubmissionId = submissionId || `sub_${Date.now()}`;
    const effectiveIdempotencyKey =
      idempotencyKey || `speaking_${effectiveSubmissionId}`;

    const { job, isDuplicate } = await createEvaluationJob({
      submissionId: effectiveSubmissionId,
      idempotencyKey: effectiveIdempotencyKey,
      skill: "speaking",
      payload: {
        keys: validKeys,
        durations: validKeys.map((k) => recordings[k]?.durationSeconds),
      },
    });

    if (isDuplicate && job.status === "completed" && job.result) {
      return NextResponse.json(job.result as SpeakingAssessmentResponse, {
        status: 200,
      });
    }

    await updateEvaluationJob(job.id, {
      status: "processing",
      attemptCount: job.attemptCount + 1,
    });

    // 3. The development-only mock still requires a valid recording, but never
    // uploads it to an AI provider. Production always uses real providers.
    const result = isMockAiEvaluationEnabled()
      ? createMockSpeakingAssessment(validKeys.length)
      : await evaluateSpeakingWithFailover({ recordings });

    // 4. Update Persistent Job Status
    if (result.status === "success") {
      await updateEvaluationJob(job.id, {
        status: "completed",
        provider: result.provider,
        modelUsed: result.modelUsed,
        result: result as unknown as Record<string, unknown>,
        tokensUsed: 1200,
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
    console.error("evaluate-speaking unexpected error:", error);
    const message =
      error instanceof Error ? error.message : "Internal evaluation error";

    const errorPayload: SpeakingAssessmentResponse = {
      status: "api_error",
      skill: "speaking",
      overallBand: null,
      criteria: null,
      criteriaFeedback: null,
      feedback: null,
      message: "Không thể hoàn thành đánh giá bài nói do lỗi nội bộ hệ thống.",
      error: message,
    };
    return NextResponse.json(errorPayload, { status: 200 });
  }
}
