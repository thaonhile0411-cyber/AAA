-- AAA - Your IELTS Journey
-- Supabase Database Migration: Persistent AI Evaluation Queue (US-103)
-- File: supabase/migrations/20261104_ai_evaluation_jobs_v4.sql

-- 1. Create ai_evaluation_jobs table for persistent AI grading
CREATE TABLE IF NOT EXISTS public.ai_evaluation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  skill TEXT NOT NULL CHECK (skill IN ('writing', 'speaking')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'retrying', 'completed', 'failed')),
  provider TEXT DEFAULT NULL, -- 'gemini' | 'openai' | 'groq'
  model_used TEXT DEFAULT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB DEFAULT NULL,
  error_code TEXT DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.000000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ DEFAULT NULL
);

-- 2. Indexes for queue polling and lookup
CREATE INDEX IF NOT EXISTS idx_ai_evaluation_jobs_submission_id ON public.ai_evaluation_jobs(submission_id);
CREATE INDEX IF NOT EXISTS idx_ai_evaluation_jobs_status ON public.ai_evaluation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_evaluation_jobs_skill ON public.ai_evaluation_jobs(skill);
CREATE INDEX IF NOT EXISTS idx_ai_evaluation_jobs_idempotency_key ON public.ai_evaluation_jobs(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_ai_evaluation_jobs_created_at ON public.ai_evaluation_jobs(created_at);

-- 3. Automatic updated_at trigger
DROP TRIGGER IF EXISTS set_ai_evaluation_jobs_updated_at ON public.ai_evaluation_jobs;
CREATE TRIGGER set_ai_evaluation_jobs_updated_at
  BEFORE UPDATE ON public.ai_evaluation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. Row Level Security
ALTER TABLE public.ai_evaluation_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow reading jobs associated with submission
CREATE POLICY "Public read ai_evaluation_jobs by submission"
  ON public.ai_evaluation_jobs
  FOR SELECT
  USING (true);

-- Policy: Service role or server insert/update
CREATE POLICY "Service insert ai_evaluation_jobs"
  ON public.ai_evaluation_jobs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service update ai_evaluation_jobs"
  ON public.ai_evaluation_jobs
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

