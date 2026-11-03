-- AAA - Your IELTS Journey
-- Supabase Database Migration for US-103: Placement Test (Version 3)
-- File: supabase/migrations/20261104_placement_tests_v3.sql

-- 1. Create placement_tests table
CREATE TABLE IF NOT EXISTS public.placement_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  current_skill TEXT NOT NULL DEFAULT 'listening',
  completed_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  listening_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  reading_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  writing_response JSONB NOT NULL DEFAULT '{"task2": ""}'::jsonb,
  speaking_recordings JSONB NOT NULL DEFAULT '{}'::jsonb,
  assessment_results JSONB DEFAULT NULL,
  overall_band NUMERIC(3, 1) DEFAULT NULL,
  target_band NUMERIC(3, 1) DEFAULT NULL,
  expected_exam_date DATE DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress' | 'evaluating' | 'completed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_placement_tests_user_id ON public.placement_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_placement_tests_session_id ON public.placement_tests(session_id);
CREATE INDEX IF NOT EXISTS idx_placement_tests_status ON public.placement_tests(status);

-- 3. Automatic updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_placement_tests_updated_at ON public.placement_tests;
CREATE TRIGGER set_placement_tests_updated_at
  BEFORE UPDATE ON public.placement_tests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. Row Level Security (RLS)
ALTER TABLE public.placement_tests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can select their own tests
CREATE POLICY "Users can select own placement tests"
  ON public.placement_tests
  FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NULL AND session_id IS NOT NULL)
  );

-- Policy: Users can insert their own tests
CREATE POLICY "Users can insert own placement tests"
  ON public.placement_tests
  FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NULL)
  );

-- Policy: Users can update their own tests
CREATE POLICY "Users can update own placement tests"
  ON public.placement_tests
  FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NULL AND session_id IS NOT NULL)
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NULL AND session_id IS NOT NULL)
  );

-- 5. Storage bucket for speaking audio recordings (Private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'speaking-recordings',
  'speaking-recordings',
  false,
  20971520, -- 20MB limit
  ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy: Users can upload audio to their own directory
CREATE POLICY "Users can upload speaking recordings"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'speaking-recordings'
    AND (
      (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
      OR auth.uid() IS NULL
    )
  );

-- Storage Policy: Users can read their own audio recordings
CREATE POLICY "Users can read own speaking recordings"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'speaking-recordings'
    AND (
      (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
      OR auth.uid() IS NULL
    )
  );

