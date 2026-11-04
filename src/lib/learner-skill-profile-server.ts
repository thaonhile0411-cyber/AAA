import type { SupabaseClient } from "@supabase/supabase-js";
import {
  profileFromPlacementAssessment,
  type LearnerSkillProfile,
} from "./learner-skill-profile";

/** Returns the most recent completed placement-test profile for one learner. */
export async function loadLatestPlacementSkillProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<LearnerSkillProfile | null> {
  const { data, error } = await supabase
    .from("placement_tests")
    .select("assessment_results")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error("PlacementProfileLookupError");
  return profileFromPlacementAssessment(data?.assessment_results);
}
