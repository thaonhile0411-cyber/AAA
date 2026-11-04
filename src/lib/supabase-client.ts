"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TestSkill } from "@/types/placement-test";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (!supabaseUrl || !supabasePublishableKey) return null;
  if (!clientInstance) {
    clientInstance = createBrowserClient(supabaseUrl, supabasePublishableKey);
  }
  return clientInstance;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

export type PlacementTestCloudPayload = {
  id?: string;
  session_id?: string;
  current_skill: TestSkill;
  completed_skills: TestSkill[];
  listening_answers: Record<string, string>;
  reading_answers: Record<string, string>;
  writing_response: { task1?: string; task2: string };
  speaking_recordings: Record<
    string,
    {
      hasRecorded: boolean;
      durationSeconds: number;
      timestamp: string;
      storagePath?: string;
      audioUrl?: string;
    }
  >;
  target_band?: number | null;
  expected_exam_date?: string | null;
  status?: "in_progress" | "evaluating" | "completed";
};

/**
 * Autosaves the placement test state to Supabase database.
 * Falls back safely if Supabase is unconfigured or offline.
 */
export async function savePlacementTestCloud(
  payload: PlacementTestCloudPayload,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      success: false,
      error: "Supabase is not configured (missing URL or Anon Key).",
    };
  }

  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || null;

    // Use test ID or generate a stable local session ID
    let testId = payload.id;
    if (!testId) {
      testId = window.localStorage.getItem("aaa:us103:placement:test_id") || undefined;
    }

    const upsertData: Record<string, unknown> = {
      user_id: userId,
      current_skill: payload.current_skill,
      completed_skills: payload.completed_skills,
      listening_answers: payload.listening_answers,
      reading_answers: payload.reading_answers,
      writing_response: payload.writing_response,
      speaking_recordings: payload.speaking_recordings,
      target_band: payload.target_band,
      expected_exam_date: payload.expected_exam_date,
      status: payload.status || "in_progress",
      updated_at: new Date().toISOString(),
    };

    if (testId) {
      upsertData.id = testId;
    }

    const { data, error } = await supabase
      .from("placement_tests")
      .upsert(upsertData)
      .select("id")
      .single();

    if (error) {
      console.warn("Supabase autosave error:", error.message);
      return { success: false, error: error.message };
    }

    if (data?.id) {
      window.localStorage.setItem("aaa:us103:placement:test_id", data.id);
      return { success: true, id: data.id };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn("Failed to autosave to Supabase:", message);
    return { success: false, error: message };
  }
}

/**
 * Uploads audio recording blob to Supabase Storage bucket 'speaking-recordings'.
 */
export async function uploadSpeakingAudio(
  audioBlob: Blob,
  questionKey: string,
  testId?: string,
): Promise<{ storagePath?: string; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      error: "Supabase Storage is not configured.",
    };
  }

  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || "guest";
    const tid = testId || window.localStorage.getItem("aaa:us103:placement:test_id") || "demo_session";
    const ext = audioBlob.type.includes("mp4") ? "mp4" : "webm";
    const filePath = `${userId}/${tid}/${questionKey}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("speaking-recordings")
      .upload(filePath, audioBlob, {
        upsert: true,
        contentType: audioBlob.type || "audio/webm",
      });

    if (uploadError) {
      console.warn("Supabase Storage audio upload error:", uploadError.message);
      return { error: uploadError.message };
    }

    return { storagePath: filePath };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.warn("Audio upload exception:", message);
    return { error: message };
  }
}
