import type { SupabaseClient } from "@supabase/supabase-js";
import type { Skill } from "@/lib/goals";
import { PROFILE_SKILLS, profileFromPlacementAssessment, type LearnerSkillProfile } from "@/lib/learner-skill-profile";

export type AssessmentHistoryRow = {
  id: string;
  assessment_kind: "placement" | "reassessment";
  assessment_results: unknown;
  created_at: string;
};

export type AssessmentComparison = {
  baseline: { id: string; createdAt: string; profile: LearnerSkillProfile };
  reassessment: { id: string; createdAt: string; profile: LearnerSkillProfile };
  skillChanges: Record<Skill, number>;
  overallChange: number | null;
};

/** Creates the before/after view from valid completed attempts only. */
export function comparisonFromAssessmentRows(rows: AssessmentHistoryRow[]): AssessmentComparison | null {
  const valid = rows.flatMap((row) => {
    const profile = profileFromPlacementAssessment(row.assessment_results);
    return profile?.isComplete ? [{ ...row, profile }] : [];
  });
  const baseline = valid.find((row) => row.assessment_kind === "placement") ?? valid[0];
  const reassessment = [...valid].reverse().find((row) => row.assessment_kind === "reassessment");
  if (!baseline || !reassessment || baseline.id === reassessment.id) return null;

  return {
    baseline: { id: baseline.id, createdAt: baseline.created_at, profile: baseline.profile },
    reassessment: { id: reassessment.id, createdAt: reassessment.created_at, profile: reassessment.profile },
    skillChanges: Object.fromEntries(
      PROFILE_SKILLS.map((skill) => [
        skill,
        Math.round((reassessment.profile.skills[skill]! - baseline.profile.skills[skill]!) * 10) / 10,
      ]),
    ) as Record<Skill, number>,
    overallChange:
      baseline.profile.overallBand === null || reassessment.profile.overallBand === null
        ? null
        : Math.round((reassessment.profile.overallBand - baseline.profile.overallBand) * 10) / 10,
  };
}

export async function loadAssessmentComparison(
  supabase: SupabaseClient,
  userId: string,
): Promise<AssessmentComparison | null> {
  const { data, error } = await supabase
    .from("placement_tests")
    .select("id, assessment_kind, assessment_results, created_at")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("created_at");
  if (error) throw new Error("AssessmentComparisonLookupError");
  return comparisonFromAssessmentRows((data ?? []) as AssessmentHistoryRow[]);
}
