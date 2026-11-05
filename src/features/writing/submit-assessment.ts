import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase-server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  MAX_ESSAY_LENGTH,
  MIN_GRADING_TIME_MS,
  countWords,
  minimumWords,
  type WritingAssessment,
  type WritingSubmissionVersion,
} from "./assessment";
import { gradeEssay } from "./grade-essay";
import { placementWritingPrompt, writingPrompts } from "./prompts";
import { getCentralGeminiModel } from "@/lib/gemini-server";

const bodySchema = z.object({
  promptId: z.string().max(120).optional(),
  essay: z.string().max(MAX_ESSAY_LENGTH).refine((essay) => !essay.includes("\0") && essay.isWellFormed()),
});
const maxBodyBytes = MAX_ESSAY_LENGTH * 6 + 1024;
const submissionFields = "id,essay,status,assessment,created_at,word_count,lease_expires_at";
const leaseMs = 20_000;

const headers = { "Cache-Control": "private, no-store" };

function failure(status: number, message: string, wordCount?: number) {
  return Response.json({ message, wordCount }, { status, headers });
}

async function signedInClient(signal: AbortSignal) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return null;
  }
  const supabase = await supabaseServer(signal);
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ? { supabase, userId: data.claims.sub } : null;
}

async function readBody(request: Request, signal: AbortSignal) {
  if (!request.body || Number(request.headers.get("content-length")) > maxBodyBytes) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", cancel, { once: true });
  let bytes = 0;
  let text = "";
  try {
    for (;;) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) return JSON.parse(text + decoder.decode());
      bytes += value.byteLength;
      if (bytes > maxBodyBytes) {
        cancel();
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
  } catch {
    return null;
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}

export async function loadLatestWritingSubmission(request: Request) {
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(4_000)]);
  const auth = await signedInClient(signal);
  if (!auth) return failure(401, "Bạn cần đăng nhập để xem bài đã gửi.");
  const prompt = writingPrompts.find(({ id }) => id === new URL(request.url).searchParams.get("promptId"));
  if (!prompt) return failure(404, "Không tìm thấy đề Writing.");

  const { data, error } = await auth.supabase.from("writing_submissions")
    .select(submissionFields)
    .eq("user_id", auth.userId)
    .eq("source", "practice")
    .eq("prompt_id", prompt.id)
    .order("created_at", { ascending: false })
    .limit(10)
    .abortSignal(signal)
    .returns<Array<{
      id: string;
      essay: string;
      status: WritingSubmissionVersion["status"];
      assessment: WritingAssessment | null;
      created_at: string;
      word_count: number;
      lease_expires_at: string;
    }>>();
  if (error) return failure(503, "Không thể tải bài đã gửi.");
  const submissions = (data ?? []).map((submission) => ({
    id: submission.id,
    essay: submission.essay,
    status: submission.status,
    assessment: submission.assessment,
    createdAt: submission.created_at,
    wordCount: submission.word_count,
    leaseExpiresAt: submission.lease_expires_at,
  }));
  return Response.json({ submission: submissions[0] ?? null, submissions }, { headers });
}

export async function submitWritingAssessment(request: Request, source: "practice" | "placement") {
  const startedAt = performance.now();
  const gradingSignal = AbortSignal.any([request.signal, AbortSignal.timeout(12_000)]);
  const responseSignal = AbortSignal.any([request.signal, AbortSignal.timeout(14_000)]);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return failure(415, "Yêu cầu gửi bài phải dùng JSON.");
  }
  const auth = await signedInClient(gradingSignal);
  if (gradingSignal.aborted) return failure(504, "Đã hết thời gian kết nối. Hãy thử lại.");
  if (!auth) return failure(401, "Bạn cần đăng nhập lại để gửi bài chấm.");

  const body = bodySchema.safeParse(await readBody(request, gradingSignal));
  if (gradingSignal.aborted) return failure(504, "Đã hết thời gian gửi bài. Hãy thử lại.");
  if (!body.success) return failure(400, `Bài gửi không hợp lệ. Giới hạn ${MAX_ESSAY_LENGTH} ký tự.`);
  const { promptId, essay } = body.data;
  const prompt = source === "placement"
    ? placementWritingPrompt
    : writingPrompts.find(({ id }) => id === promptId);
  if (!prompt) return failure(404, "Không tìm thấy đề Writing.");
  const wordCount = countWords(essay);
  const requiredWords = minimumWords(prompt.task);
  if (wordCount < requiredWords) {
    return failure(422, `Bài viết cần tối thiểu ${requiredWords} từ. Còn thiếu ${requiredWords - wordCount} từ.`, wordCount);
  }

  const db = getSupabaseAdminClient();
  if (!db) return failure(503, "Dịch vụ lưu bài chấm chưa được cấu hình.");
  const token = randomUUID();
  const key = {
    user_id: auth.userId,
    source,
    prompt_id: prompt.id,
    version_hash: createHash("sha256").update(JSON.stringify({ prompt, essay })).digest("hex"),
  };
  const lease = {
    status: "processing",
    attempt_token: token,
    lease_expires_at: new Date(Date.now() + leaseMs).toISOString(),
  };
  const { data: inserted, error: insertError } = await db.from("writing_submissions")
    .upsert({ ...key, ...lease, essay, word_count: wordCount }, {
      onConflict: "user_id,source,prompt_id,version_hash",
      ignoreDuplicates: true,
    })
    .select("id")
    .abortSignal(gradingSignal)
    .maybeSingle();
  if (insertError) return failure(503, "Không thể lưu bài để chấm. Hãy thử lại.");

  async function result(id: string, assessment: WritingAssessment) {
    const remaining = MIN_GRADING_TIME_MS - (performance.now() - startedAt);
    if (remaining > 0) await delay(remaining);
    return Response.json({ id, assessment, wordCount }, { headers });
  }

  let id = inserted?.id;
  if (!id) {
    const { data: existing, error } = await db.from("writing_submissions")
      .select("id,status,assessment,attempt_token,lease_expires_at")
      .match(key)
      .abortSignal(gradingSignal)
      .single();
    if (error) return failure(503, "Không thể kiểm tra bài đã gửi. Hãy thử lại.");
    if (existing.status === "completed") return result(existing.id, existing.assessment);
    if (existing.status === "processing" && Date.parse(existing.lease_expires_at) > Date.now()) {
      return failure(409, "Bài viết này đang được chấm. Hãy thử lại sau ít giây.");
    }

    // Only one request can reclaim this attempt, even across server instances.
    const { data: claimed, error: claimError } = await db.from("writing_submissions")
      .update(lease)
      .match({ ...key, id: existing.id, status: existing.status, attempt_token: existing.attempt_token })
      .select("id")
      .abortSignal(gradingSignal)
      .maybeSingle();
    if (claimError) return failure(503, "Không thể thử chấm lại bài này.");
    if (!claimed) return failure(409, "Bài viết này vừa được gửi chấm. Hãy thử lại sau ít giây.");
    id = claimed.id;
  }

  const ownership = { id, user_id: auth.userId, attempt_token: token, status: "processing" };
  let unavailable = false;
  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    unavailable = !apiKey;
    if (!apiKey) throw new Error("Missing Gemini configuration");
    gradingSignal.throwIfAborted();
    const assessment = await gradeEssay({
      apiKey,
      model: getCentralGeminiModel(),
      prompt,
      essay,
      signal: gradingSignal,
    });
    const { data: saved, error } = await db.from("writing_submissions")
      .update({ status: "completed", assessment })
      .match(ownership)
      .select("id")
      .abortSignal(responseSignal)
      .maybeSingle();
    if (error || !saved) throw new Error("Could not save assessment");
    return result(saved.id, assessment);
  } catch {
    // A browser timeout must not prevent the server from recording a failed attempt.
    await db.from("writing_submissions")
      .update({ status: "failed" })
      .match(ownership)
      .abortSignal(AbortSignal.timeout(900));
    if (unavailable) return failure(503, "Dịch vụ chấm bài AI chưa được cấu hình.", wordCount);
    if (gradingSignal.aborted || responseSignal.aborted) {
      return failure(504, "Đã hết thời gian chờ chấm bài. Bài viết đã lưu, bạn có thể thử lại.", wordCount);
    }
    return failure(502, "Chưa thể hoàn thành chấm bài. Bài viết đã lưu, bạn có thể thử lại.", wordCount);
  }
}
