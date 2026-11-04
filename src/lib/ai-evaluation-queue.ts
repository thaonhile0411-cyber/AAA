/**
 * AAA - Persistent AI Evaluation Queue (US-103)
 * Provides persistent job queuing, idempotency, duplicate prevention,
 * and graceful fallback to in-memory queue when Supabase is offline or unconfigured.
 */

import { getSupabaseAdminClient } from "./supabase-server.ts";

export type EvaluationJobStatus =
  | "pending"
  | "processing"
  | "retrying"
  | "completed"
  | "failed";

export type EvaluationJobRecord = {
  id: string;
  submissionId: string;
  idempotencyKey?: string;
  skill: "writing" | "speaking";
  status: EvaluationJobStatus;
  provider?: string;
  modelUsed?: string;
  attemptCount: number;
  maxAttempts: number;
  payload: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  tokensUsed: number;
  estimatedCostUsd: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
};

// In-memory fallback map when Supabase is unconfigured or unavailable
const inMemoryJobs = new Map<string, EvaluationJobRecord>();

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "job_" + Math.random().toString(36).substring(2, 15);
}

/**
 * Creates or retrieves an evaluation job.
 * Ensures idempotency: if an idempotencyKey is provided and already exists,
 * the existing record is returned to prevent duplicate processing.
 */
export async function createEvaluationJob(params: {
  submissionId: string;
  idempotencyKey?: string;
  skill: "writing" | "speaking";
  payload: Record<string, unknown>;
  maxAttempts?: number;
}): Promise<{ job: EvaluationJobRecord; isDuplicate: boolean }> {
  const { submissionId, idempotencyKey, skill, payload, maxAttempts = 3 } = params;

  // 1. Check in-memory first for idempotency
  if (idempotencyKey) {
    for (const job of inMemoryJobs.values()) {
      if (job.idempotencyKey === idempotencyKey) {
        return { job, isDuplicate: true };
      }
    }
  }

  const supabase = getSupabaseAdminClient();

  // 2. Check Supabase if configured
  if (supabase && idempotencyKey) {
    try {
      const { data: existing } = await supabase
        .from("ai_evaluation_jobs")
        .select("*")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existing) {
        const mappedJob: EvaluationJobRecord = {
          id: existing.id,
          submissionId: existing.submission_id,
          idempotencyKey: existing.idempotency_key,
          skill: existing.skill,
          status: existing.status,
          provider: existing.provider,
          modelUsed: existing.model_used,
          attemptCount: existing.attempt_count,
          maxAttempts: existing.max_attempts,
          payload: existing.payload,
          result: existing.result,
          errorCode: existing.error_code,
          errorMessage: existing.error_message,
          tokensUsed: existing.tokens_used,
          estimatedCostUsd: Number(existing.estimated_cost_usd || 0),
          createdAt: existing.created_at,
          updatedAt: existing.updated_at,
          completedAt: existing.completed_at,
        };
        inMemoryJobs.set(mappedJob.id, mappedJob);
        return { job: mappedJob, isDuplicate: true };
      }
    } catch {
      // Supabase table may not exist yet, fallback to memory
    }
  }

  // 3. Create new job
  const now = new Date().toISOString();
  const newJob: EvaluationJobRecord = {
    id: generateId(),
    submissionId,
    idempotencyKey,
    skill,
    status: "pending",
    attemptCount: 0,
    maxAttempts,
    payload,
    result: null,
    errorCode: null,
    errorMessage: null,
    tokensUsed: 0,
    estimatedCostUsd: 0,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };

  inMemoryJobs.set(newJob.id, newJob);

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("ai_evaluation_jobs")
        .insert({
          id: newJob.id,
          submission_id: newJob.submissionId,
          idempotency_key: newJob.idempotencyKey,
          skill: newJob.skill,
          status: newJob.status,
          attempt_count: newJob.attemptCount,
          max_attempts: newJob.maxAttempts,
          payload: newJob.payload,
          result: null,
          tokens_used: 0,
          estimated_cost_usd: 0,
        })
        .select()
        .single();

      if (!error && data) {
        newJob.createdAt = data.created_at;
        newJob.updatedAt = data.updated_at;
      }
    } catch {
      // Supabase unavailable, inMemory fallback holds record
    }
  }

  return { job: newJob, isDuplicate: false };
}

/**
 * Updates an evaluation job's status and results
 */
export async function updateEvaluationJob(
  id: string,
  updates: Partial<Omit<EvaluationJobRecord, "id" | "submissionId" | "skill" | "createdAt">>,
): Promise<EvaluationJobRecord | null> {
  const current = inMemoryJobs.get(id);
  const now = new Date().toISOString();

  const updated: EvaluationJobRecord = {
    ...(current || {
      id,
      submissionId: "unknown",
      skill: "writing",
      attemptCount: 0,
      maxAttempts: 3,
      payload: {},
      tokensUsed: 0,
      estimatedCostUsd: 0,
      createdAt: now,
      status: "pending",
    }),
    ...updates,
    updatedAt: now,
    completedAt:
      updates.status === "completed" || updates.status === "failed"
        ? now
        : current?.completedAt || null,
  };

  inMemoryJobs.set(id, updated);

  const supabase = getSupabaseAdminClient();
  if (supabase) {
    try {
      // Map back to snake_case for Supabase
      const dbUpdates: Record<string, unknown> = {
        updated_at: now,
      };
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.provider !== undefined) dbUpdates.provider = updates.provider;
      if (updates.modelUsed !== undefined) dbUpdates.model_used = updates.modelUsed;
      if (updates.attemptCount !== undefined) dbUpdates.attempt_count = updates.attemptCount;
      if (updates.result !== undefined) dbUpdates.result = updates.result;
      if (updates.errorCode !== undefined) dbUpdates.error_code = updates.errorCode;
      if (updates.errorMessage !== undefined) dbUpdates.error_message = updates.errorMessage;
      if (updates.tokensUsed !== undefined) dbUpdates.tokens_used = updates.tokensUsed;
      if (updates.estimatedCostUsd !== undefined) dbUpdates.estimated_cost_usd = updates.estimatedCostUsd;
      if (updated.completedAt) dbUpdates.completed_at = updated.completedAt;

      await supabase.from("ai_evaluation_jobs").update(dbUpdates).eq("id", id);
    } catch {
      // Fail silently to memory
    }
  }

  return updated;
}

/**
 * Retrieves an evaluation job by ID or Idempotency Key
 */
export async function getEvaluationJob(idOrKey: string): Promise<EvaluationJobRecord | null> {
  // Check memory first
  if (inMemoryJobs.has(idOrKey)) {
    return inMemoryJobs.get(idOrKey)!;
  }
  for (const job of inMemoryJobs.values()) {
    if (job.idempotencyKey === idOrKey) {
      return job;
    }
  }

  const supabase = getSupabaseAdminClient();
  if (supabase) {
    try {
      const { data } = await supabase
        .from("ai_evaluation_jobs")
        .select("*")
        .or(`id.eq.${idOrKey},idempotency_key.eq.${idOrKey}`)
        .maybeSingle();

      if (data) {
        const mapped: EvaluationJobRecord = {
          id: data.id,
          submissionId: data.submission_id,
          idempotencyKey: data.idempotency_key,
          skill: data.skill,
          status: data.status,
          provider: data.provider,
          modelUsed: data.model_used,
          attemptCount: data.attempt_count,
          maxAttempts: data.max_attempts,
          payload: data.payload,
          result: data.result,
          errorCode: data.error_code,
          errorMessage: data.error_message,
          tokensUsed: data.tokens_used,
          estimatedCostUsd: Number(data.estimated_cost_usd || 0),
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          completedAt: data.completed_at,
        };
        inMemoryJobs.set(mapped.id, mapped);
        return mapped;
      }
    } catch {
      // Supabase error
    }
  }

  return null;
}

/**
 * Retrieves all evaluation jobs associated with a submission
 */
export async function getEvaluationJobsBySubmission(
  submissionId: string,
): Promise<EvaluationJobRecord[]> {
  const result: EvaluationJobRecord[] = [];
  for (const job of inMemoryJobs.values()) {
    if (job.submissionId === submissionId) {
      result.push(job);
    }
  }

  const supabase = getSupabaseAdminClient();
  if (supabase) {
    try {
      const { data } = await supabase
        .from("ai_evaluation_jobs")
        .select("*")
        .eq("submission_id", submissionId)
        .order("created_at", { ascending: true });

      if (data && data.length > 0) {
        return data.map((d) => ({
          id: d.id,
          submissionId: d.submission_id,
          idempotencyKey: d.idempotency_key,
          skill: d.skill,
          status: d.status,
          provider: d.provider,
          modelUsed: d.model_used,
          attemptCount: d.attempt_count,
          maxAttempts: d.max_attempts,
          payload: d.payload,
          result: d.result,
          errorCode: d.error_code,
          errorMessage: d.error_message,
          tokensUsed: d.tokens_used,
          estimatedCostUsd: Number(d.estimated_cost_usd || 0),
          createdAt: d.created_at,
          updatedAt: d.updated_at,
          completedAt: d.completed_at,
        }));
      }
    } catch {
      // Supabase error
    }
  }

  return result;
}

/**
 * Recovers stuck or pending jobs (e.g. jobs in 'pending' or 'retrying' status,
 * or jobs stuck in 'processing' for more than 2 minutes).
 */
export async function recoverPendingJobs(): Promise<EvaluationJobRecord[]> {
  const jobsToRecover: EvaluationJobRecord[] = [];
  const now = Date.now();

  for (const job of inMemoryJobs.values()) {
    if (
      job.status === "pending" ||
      job.status === "retrying" ||
      (job.status === "processing" && now - new Date(job.updatedAt).getTime() > 120_000)
    ) {
      if (job.attemptCount < job.maxAttempts) {
        job.status = "retrying";
        job.updatedAt = new Date().toISOString();
        jobsToRecover.push(job);
      } else {
        job.status = "failed";
        job.errorMessage = "Exceeded maximum retry attempts during recovery.";
      }
    }
  }

  return jobsToRecover;
}

/**
 * Resets in-memory jobs store (primarily for unit testing isolation)
 */
export function clearInMemoryJobs(): void {
  inMemoryJobs.clear();
}
