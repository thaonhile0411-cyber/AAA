import type { SupabaseClient } from "@supabase/supabase-js";
import type { PersonalizedRoadmapDraft } from "./personalized-roadmap";

/** Persists one new active personalized roadmap and its resource-backed tasks. */
export async function savePersonalizedRoadmap(
  supabase: SupabaseClient,
  userId: string,
  placementTestId: string,
  roadmap: PersonalizedRoadmapDraft,
): Promise<string> {
  const { data: roadmapRow, error: roadmapError } = await supabase
    .from("roadmaps")
    .insert({
      user_id: userId,
      source_placement_test_id: placementTestId,
      title: roadmap.title,
      summary: roadmap.summary,
      status: "active",
      allocation_snapshot: roadmap.allocation,
    })
    .select("id")
    .single();
  if (roadmapError || !roadmapRow) throw new Error("RoadmapSaveError");

  try {
    for (const milestone of roadmap.milestones) {
      const { data: milestoneRow, error: milestoneError } = await supabase
        .from("roadmap_milestones")
        .insert({
          roadmap_id: roadmapRow.id,
          phase_number: 1,
          skill: milestone.skill,
          title: milestone.title,
          description: milestone.description,
          position: milestone.position,
          phase_target_band: milestone.phaseTargetBand,
          scheduled_week: milestone.scheduledWeek,
        })
        .select("id")
        .single();
      if (milestoneError || !milestoneRow) throw new Error("RoadmapMilestoneSaveError");

      if (milestone.activities.length > 0) {
        const { error: activityError } = await supabase
          .from("roadmap_activities")
          .insert(
            milestone.activities.map((activity) => ({
              milestone_id: milestoneRow.id,
              resource_slug: activity.resourceSlug,
              skill: activity.skill,
              title: activity.title,
              description: activity.description,
              position: activity.position,
              estimated_minutes: activity.estimatedMinutes,
              scheduled_week: activity.scheduledWeek,
              difficulty_band_min: activity.difficultyBandMin,
              difficulty_band_max: activity.difficultyBandMax,
              adjustment_kind: activity.adjustmentKind,
            })),
          );
        if (activityError) throw new Error("RoadmapActivitySaveError");
      }
    }
    return roadmapRow.id;
  } catch (error) {
    // Cascading deletion removes child records, avoiding a half-created roadmap.
    await supabase.from("roadmaps").delete().eq("id", roadmapRow.id);
    throw error;
  }
}
