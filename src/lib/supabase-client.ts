"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PLACEMENT_CLOUD_TEST_ID_KEY } from "@/lib/placement-storage";
import type { PlacementTestResult, TestSkill } from "@/types/placement-test";

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
  assessment_results?: PlacementTestResult;
  overall_band?: number | null;
  assessment_kind?: "placement" | "reassessment";
  status?: "in_progress" | "evaluating" | "completed";
};

/**
 * Autosaves the placement test state to Supabase database.
 * Falls back safely if Supabase is unconfigured or offline.
 */
export async function savePlacementTestCloud(
  payload: PlacementTestCloudPayload,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // The authenticated app session is stored in an httpOnly cookie. Delegate
    // the write to a Route Handler so it can use that cookie reliably.
    let testId = payload.id;
    if (!testId && typeof window !== "undefined") {
      testId = window.localStorage.getItem(PLACEMENT_CLOUD_TEST_ID_KEY) || undefined;
    }
    const response = await fetch("/api/placement-test/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, id: testId }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      id?: string;
      error?: string;
    };

    if (!response.ok || !data.success || !data.id) {
      return { success: false, error: data.error ?? "Không thể lưu Placement Test." };
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(PLACEMENT_CLOUD_TEST_ID_KEY, data.id);
    }
    return { success: true, id: data.id };
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
    const tid = testId || window.localStorage.getItem(PLACEMENT_CLOUD_TEST_ID_KEY) || "demo_session";
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
