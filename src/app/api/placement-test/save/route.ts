import { json } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

type SavePlacementPayload = {
  id?: unknown;
  current_skill?: unknown;
  completed_skills?: unknown;
  listening_answers?: unknown;
  reading_answers?: unknown;
  writing_response?: unknown;
  speaking_recordings?: unknown;
  target_band?: unknown;
  expected_exam_date?: unknown;
  assessment_results?: unknown;
  overall_band?: unknown;
  assessment_kind?: unknown;
  status?: unknown;
};

const SKILLS = new Set(["listening", "reading", "writing", "speaking"]);
const STATUSES = new Set(["in_progress", "evaluating", "completed"]);
const KINDS = new Set(["placement", "reassessment"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Bạn cần đăng nhập để xem Placement Test." }, 401);

    const { data, error } = await supabase
      .from("placement_tests")
      .select("id, current_skill, completed_skills, listening_answers, reading_answers, writing_response, speaking_recordings, assessment_results, overall_band, assessment_kind, status, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    const test = data?.find((row) => row.status === "completed" && row.assessment_results) ?? data?.[0] ?? null;
    return json({ test });
  } catch (error) {
    console.error("Placement test load route failed:", error);
    return json({ error: "Không thể tải Placement Test đã lưu." }, 503);
  }
}

/**
 * Saves the browser's placement attempt through the authenticated server
 * session. The browser cannot read the app's httpOnly Supabase auth cookie,
 * so writing directly from a client-side Supabase instance is unreliable.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as SavePlacementPayload;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return json({ error: "Bạn cần đăng nhập để đồng bộ kết quả Placement Test." }, 401);
    }

    const currentSkill =
      typeof body.current_skill === "string" && SKILLS.has(body.current_skill)
        ? body.current_skill
        : "listening";
    const completedSkills = Array.isArray(body.completed_skills)
      ? body.completed_skills.filter(
          (skill): skill is string => typeof skill === "string" && SKILLS.has(skill),
        )
      : [];
    const status =
      typeof body.status === "string" && STATUSES.has(body.status)
        ? body.status
        : "in_progress";
    const assessmentKind =
      typeof body.assessment_kind === "string" && KINDS.has(body.assessment_kind)
        ? body.assessment_kind
        : "placement";

    const row: Record<string, unknown> = {
      user_id: user.id,
      current_skill: currentSkill,
      completed_skills: completedSkills,
      listening_answers: isRecord(body.listening_answers) ? body.listening_answers : {},
      reading_answers: isRecord(body.reading_answers) ? body.reading_answers : {},
      writing_response: isRecord(body.writing_response) ? body.writing_response : { task2: "" },
      speaking_recordings: isRecord(body.speaking_recordings) ? body.speaking_recordings : {},
      target_band: typeof body.target_band === "number" ? body.target_band : null,
      expected_exam_date:
        typeof body.expected_exam_date === "string" ? body.expected_exam_date : null,
      assessment_kind: assessmentKind,
      status,
      updated_at: new Date().toISOString(),
    };

    if (isRecord(body.assessment_results)) row.assessment_results = body.assessment_results;
    if (typeof body.overall_band === "number" || body.overall_band === null) {
      row.overall_band = body.overall_band;
    }
    if (typeof body.id === "string" && UUID.test(body.id)) {
      // A browser pointer is only a convenience cache. Never let a pointer
      // copied from another account select or overwrite that learner's row.
      const { data: ownedAttempt, error: lookupError } = await supabase
        .from("placement_tests")
        .select("id")
        .eq("id", body.id)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (ownedAttempt) row.id = ownedAttempt.id;
    }

    const { data, error } = await supabase
      .from("placement_tests")
      .upsert(row)
      .select("id")
      .single();

    if (error) {
      console.warn("Placement test save failed:", error.code, error.message);
      return json({ error: `Không thể lưu Placement Test: ${error.message}` }, 422);
    }

    return json({ success: true, id: data.id });
  } catch (error) {
    console.error("Placement test save route failed:", error);
    return json({ error: "Không thể lưu Placement Test. Vui lòng thử lại." }, 503);
  }
}
