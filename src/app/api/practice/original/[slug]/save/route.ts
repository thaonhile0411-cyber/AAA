import { findOriginalPracticeTest } from "@/data/original-practice-tests";
import { apiFailure, json } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SaveBody = {
  response?: unknown;
  taskId?: unknown;
  audioBase64?: unknown;
  audioMimeType?: unknown;
  audioDurationSeconds?: unknown;
};

const AUDIO_MIME_TYPES = new Set([
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    if (!findOriginalPracticeTest(slug)) return json({ error: "Không tìm thấy bài luyện." }, 404);
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Bạn cần đăng nhập để xem bài đã lưu." }, 401);

    const { data, error } = await supabase
      .from("practice_saved_work")
      .select("response_text, audio_base64, audio_mime_type, audio_duration_seconds, saved_at, completed_at")
      .eq("user_id", user.id)
      .eq("resource_slug", slug)
      .maybeSingle();
    if (error) throw error;
    return json({
      response: data?.response_text ?? "",
      audioBase64: data?.audio_base64 ?? null,
      audioMimeType: data?.audio_mime_type ?? null,
      audioDurationSeconds: data?.audio_duration_seconds ?? null,
      savedAt: data?.saved_at ?? null,
      completedAt: data?.completed_at ?? null,
    });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const test = findOriginalPracticeTest(slug);
    if (!test) return json({ error: "Không tìm thấy bài luyện." }, 404);

    const body = (await request.json().catch(() => null)) as SaveBody | null;
    if (!body || typeof body.response !== "string" || body.response.length > 10000)
      return json({ error: "Nội dung bài làm không hợp lệ." }, 400);
    const audioBase64 = typeof body.audioBase64 === "string" ? body.audioBase64.replace(/^data:[^,]+,/, "") : null;
    const audioMimeType = typeof body.audioMimeType === "string" ? body.audioMimeType : null;
    const audioDurationSeconds = typeof body.audioDurationSeconds === "number" ? Math.round(body.audioDurationSeconds) : null;
    const hasValidAudio = Boolean(
      audioBase64 && audioBase64.length <= 6000000 && /^[A-Za-z0-9+/=]+$/.test(audioBase64) &&
      audioMimeType && AUDIO_MIME_TYPES.has(audioMimeType) &&
      audioDurationSeconds && audioDurationSeconds >= 1 && audioDurationSeconds <= 120,
    );
    if (test.skill === "speaking" && !hasValidAudio)
      return json({ error: "Hãy thu âm câu trả lời trước khi lưu bài Speaking." }, 400);
    if (test.skill !== "speaking" && body.response.trim().length === 0)
      return json({ error: "Hãy nhập câu trả lời trước khi lưu bài." }, 400);
    const taskId = typeof body.taskId === "string" && UUID.test(body.taskId) ? body.taskId : null;
    if (body.taskId !== undefined && taskId === null) return json({ error: "Task không hợp lệ." }, 400);

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Bạn cần đăng nhập để lưu bài." }, 401);

    if (taskId) {
      const { data: task, error: taskError } = await supabase
        .from("roadmap_activities")
        .select("id, resource_slug")
        .eq("id", taskId)
        .maybeSingle();
      if (taskError) throw taskError;
      if (!task || task.resource_slug !== slug) return json({ error: "Task không thuộc bài luyện này." }, 403);
    }

    const now = new Date().toISOString();
    const { error } = await supabase.from("practice_saved_work").upsert(
      {
        user_id: user.id,
        resource_slug: slug,
        skill: test.skill,
        response_text: test.skill === "speaking" ? "" : body.response,
        audio_base64: test.skill === "speaking" ? audioBase64 : null,
        audio_mime_type: test.skill === "speaking" ? audioMimeType : null,
        audio_duration_seconds: test.skill === "speaking" ? audioDurationSeconds : null,
        task_id: taskId,
        saved_at: now,
        completed_at: now,
      },
      { onConflict: "user_id,resource_slug" },
    );
    if (error) throw error;

    // A practice opened from the dashboard/roadmap carries its assigned task.
    // Complete only that learner-owned task after the work itself is safely saved.
    if (taskId) {
      const { error: completionError } = await supabase
        .from("roadmap_activities")
        .update({ completed_at: now })
        .eq("id", taskId)
        .eq("resource_slug", slug)
        .is("completed_at", null);
      if (completionError) throw completionError;
    }

    return json({ savedAt: now, skill: test.skill, taskId });
  } catch (error) {
    return apiFailure(error);
  }
}
