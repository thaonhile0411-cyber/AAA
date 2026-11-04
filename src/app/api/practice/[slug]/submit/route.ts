import { apiFailure, json } from "@/lib/api-response";
import { validatePracticeSubmission, type PracticeResult } from "@/lib/practice-results";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const started = performance.now();
  try {
    const { slug } = await params;
    if (!/^[a-z0-9-]{1,100}$/.test(slug))
      return json({ error: "Không tìm thấy bài luyện." }, 404);

    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user)
      return json({ error: "Bạn cần đăng nhập trước khi nộp bài." }, 401);

    const parsed = validatePracticeSubmission(await request.json().catch(() => null));
    if (!parsed.ok) return json({ error: parsed.error }, 400);

    const { data, error } = await supabase.rpc("grade_practice_attempt", {
      p_slug: slug,
      p_submission_id: parsed.data.submissionId,
      p_answers: parsed.data.answers,
    });
    if (error) {
      if (error.message.includes("EXERCISE_NOT_FOUND"))
        return json({ error: "Bài luyện không tồn tại hoặc chưa xuất bản." }, 404);
      if (error.message.includes("ANSWER_KEYS_INCOMPLETE"))
        return json({ error: "Bài luyện chưa có đủ đáp án để chấm." }, 409);
      if (error.message.includes("INVALID_BAND_SCALE"))
        return json({ error: "Thang quy đổi band của bài luyện chưa hợp lệ." }, 409);
      throw error;
    }

    const processingMs = Math.round((performance.now() - started) * 100) / 100;
    return Response.json(
      { ...(data as unknown as PracticeResult), processingMs },
      {
        headers: {
          "Cache-Control": "private, no-store",
          "Server-Timing": `grade;dur=${processingMs}`,
        },
      },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
