import { createClient } from "@/lib/supabase/server";
import { apiFailure, json } from "@/lib/api-response";
import { isBandGroup, isQuestionType, bandGroupFor } from "@/lib/practice";
import { EXERCISE_COLUMNS, practiceContext } from "@/lib/practice-server";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const skill = params.get("skill");
    const band = params.get("band");
    const type = params.get("type");
    if (
      (skill && !["reading", "listening"].includes(skill)) ||
      (band && band !== "all" && !isBandGroup(band)) ||
      (type && !isQuestionType(type))
    )
      return json({ error: "Bộ lọc không hợp lệ." }, 400);
    const supabase = await createClient();
    const context = await practiceContext(supabase);
    const selectedBand =
      band === "all" ? null : (band ?? bandGroupFor(context.currentBand));
    let query = supabase
      .from("practice_exercises")
      .select(EXERCISE_COLUMNS)
      .eq("is_published", true)
      .order("title");
    if (skill) query = query.eq("skill", skill);
    if (selectedBand) query = query.eq("band_group", selectedBand);
    if (type) query = query.contains("question_types", [type]);
    const { data, error } = await query.limit(100);
    if (error)
      return json(
        { error: "Chưa thể tải kho bài luyện. Vui lòng thử lại." },
        500,
      );
    return json({ exercises: data, context, selectedBand });
  } catch (error) {
    return apiFailure(error);
  }
}
