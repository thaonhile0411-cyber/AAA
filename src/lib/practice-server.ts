import type { SupabaseClient } from "@supabase/supabase-js";
import { overallBand } from "./goals";
import { scoresFromDatabase } from "./goal-record";
import type { PracticeContext } from "./practice";

export const EXERCISE_COLUMNS =
  "id, slug, title, summary, skill, band_group, question_types, duration_minutes, question_count, source_title, source_url, source_license, source_attribution";
export async function practiceContext(
  supabase: SupabaseClient,
): Promise<PracticeContext> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, currentBand: null, bandSource: null };
  const [goal, placement] = await Promise.all([
    supabase
      .from("learning_goals")
      .select("self_reported_scores")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("placement_attempts")
      .select("estimated_band")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (goal.error || placement.error) throw new Error("BandLookupError");
  const scores = scoresFromDatabase(goal.data?.self_reported_scores);
  const assessed = placement.data?.estimated_band;
  return {
    userId: user.id,
    currentBand: scores
      ? overallBand(scores)
      : assessed == null
        ? null
        : Number(assessed),
    bandSource: scores
      ? "self_reported"
      : assessed == null
        ? null
        : "placement",
  };
}
