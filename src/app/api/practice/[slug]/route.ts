import { createClient } from "@/lib/supabase/server";
import { apiFailure, json } from "@/lib/api-response";
import { EXERCISE_COLUMNS, practiceContext } from "@/lib/practice-server";

export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    if (!/^[a-z0-9-]{1,100}$/.test(slug))
      return json({ error: "Không tìm thấy bài luyện." }, 404);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("practice_exercises")
      .select(
        `${EXERCISE_COLUMNS}, passage, audio_path, audio_mime, audio_bytes, content_version`,
      )
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error) return json({ error: "Chưa thể tải bài luyện." }, 500);
    if (!data)
      return json(
        { error: "Bài luyện không tồn tại hoặc chưa được xuất bản." },
        404,
      );
    const [questions, context] = await Promise.all([
      supabase
        .from("practice_questions")
        .select("id, position, type, prompt, options, instruction")
        .eq("exercise_id", data.id)
        .order("position"),
      practiceContext(supabase),
    ]);
    if (questions.error) return json({ error: "Chưa thể tải câu hỏi." }, 500);
    return json({ exercise: { ...data, questions: questions.data }, context });
  } catch (error) {
    return apiFailure(error);
  }
}
