import type { SupabaseClient } from "@supabase/supabase-js";
import type { Skill } from "@/lib/goals";
import { PROFILE_SKILLS } from "@/lib/learner-skill-profile";

export type RoadmapAllocationSummary = Record<
  Skill,
  { desiredPercent: number; actualPercent: number; allocatedItems: number; availableItems: number }
>;

export type ActiveRoadmap = {
  id: string;
  title: string;
  summary: string;
  currentPhase: number;
  version: number;
  latestAdjustment: {
    id: string;
    phaseNumber: number;
    notification: string;
    paceRecommendation: string | null;
    scheduleRisk: boolean;
    totalMinutes: number;
    weeklyBudgetMinutes: number;
  } | null;
  allocation: RoadmapAllocationSummary | null;
  milestones: Array<{
    id: string;
    skill: Skill;
    title: string;
    description: string;
    position: number;
    phaseNumber: number;
    phaseTargetBand: number | null;
    scheduledWeek: number;
    activities: Array<{
      id: string;
      skill: Skill;
      resourceSlug: string | null;
      title: string;
      description: string | null;
      estimatedMinutes: number | null;
      position: number;
      completedAt: string | null;
      scheduledWeek: number;
      difficultyBandMin: number | null;
      difficultyBandMax: number | null;
      adjustmentKind: "standard" | "accelerated" | "foundation_review" | "targeted_review" | "continue";
    }>;
  }>;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNonNegativeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function allocationFromDatabase(value: unknown): RoadmapAllocationSummary | null {
  if (!isRecord(value) || !isRecord(value.allocations)) return null;
  const source = value.allocations;
  const entries = PROFILE_SKILLS.map((skill) => {
    const item = source[skill];
    if (!isRecord(item)) return null;
    const desiredPercent = asNonNegativeNumber(item.desiredPercent);
    const actualPercent = asNonNegativeNumber(item.actualPercent);
    const allocatedItems = asNonNegativeNumber(item.allocatedItems);
    const availableItems = asNonNegativeNumber(item.availableItems);
    if (desiredPercent === null || actualPercent === null || allocatedItems === null || availableItems === null) return null;
    return [skill, { desiredPercent, actualPercent, allocatedItems, availableItems }] as const;
  });
  const validEntries = entries.filter(
    (entry): entry is NonNullable<typeof entry> => entry !== null,
  );
  if (validEntries.length !== PROFILE_SKILLS.length) return null;
  return Object.fromEntries(validEntries) as RoadmapAllocationSummary;
}

/** Loads exactly one learner-owned active roadmap; RLS also enforces ownership. */
export async function loadActiveRoadmap(
  supabase: SupabaseClient,
  userId: string,
): Promise<ActiveRoadmap | null> {
  const { data: roadmap, error: roadmapError } = await supabase
    .from("roadmaps")
    .select("id, title, summary, allocation_snapshot, current_phase, roadmap_version")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (roadmapError) throw new Error("ActiveRoadmapLookupError");
  if (!roadmap) return null;

  const { data: latestAdjustment, error: adjustmentError } = await supabase
    .from("roadmap_adjustments")
    .select("id, phase_number, notification, pace_recommendation, schedule_risk, total_minutes, weekly_budget_minutes")
    .eq("roadmap_id", roadmap.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (adjustmentError) throw new Error("RoadmapAdjustmentLookupError");

  const { data: milestones, error: milestonesError } = await supabase
    .from("roadmap_milestones")
    .select("id, skill, title, description, position, phase_number, phase_target_band, scheduled_week")
    .eq("roadmap_id", roadmap.id)
    .order("position");
  if (milestonesError) throw new Error("RoadmapMilestonesLookupError");

  const milestoneIds = (milestones ?? []).map((milestone) => milestone.id);
  const { data: activities, error: activitiesError } = milestoneIds.length
    ? await supabase
        .from("roadmap_activities")
        .select("id, milestone_id, resource_slug, skill, title, description, estimated_minutes, position, completed_at, scheduled_week, difficulty_band_min, difficulty_band_max, adjustment_kind")
        .in("milestone_id", milestoneIds)
        .order("position")
    : { data: [], error: null };
  if (activitiesError) throw new Error("RoadmapActivitiesLookupError");

  return {
    id: roadmap.id,
    title: roadmap.title,
    summary: roadmap.summary,
    currentPhase: Number(roadmap.current_phase ?? 1),
    version: Number(roadmap.roadmap_version ?? 1),
    latestAdjustment: latestAdjustment
      ? {
          id: latestAdjustment.id,
          phaseNumber: Number(latestAdjustment.phase_number),
          notification: latestAdjustment.notification,
          paceRecommendation: latestAdjustment.pace_recommendation,
          scheduleRisk: latestAdjustment.schedule_risk,
          totalMinutes: latestAdjustment.total_minutes,
          weeklyBudgetMinutes: latestAdjustment.weekly_budget_minutes,
        }
      : null,
    allocation: allocationFromDatabase(roadmap.allocation_snapshot),
    milestones: (milestones ?? []).map((milestone) => ({
      id: milestone.id,
      skill: milestone.skill as Skill,
      title: milestone.title,
      description: milestone.description,
      position: milestone.position,
      phaseNumber: Number(milestone.phase_number),
      phaseTargetBand: milestone.phase_target_band === null ? null : Number(milestone.phase_target_band),
      scheduledWeek: Number(milestone.scheduled_week ?? 1),
      activities: (activities ?? [])
        .filter((activity) => activity.milestone_id === milestone.id)
        .map((activity) => ({
          id: activity.id,
          skill: activity.skill as Skill,
          resourceSlug: activity.resource_slug,
          title: activity.title,
          description: activity.description,
          estimatedMinutes: activity.estimated_minutes,
          position: activity.position,
          completedAt: activity.completed_at,
          scheduledWeek: Number(activity.scheduled_week ?? 1),
          difficultyBandMin: activity.difficulty_band_min === null ? null : Number(activity.difficulty_band_min),
          difficultyBandMax: activity.difficulty_band_max === null ? null : Number(activity.difficulty_band_max),
          adjustmentKind: activity.adjustment_kind as ActiveRoadmap["milestones"][number]["activities"][number]["adjustmentKind"],
        })),
    })),
  };
}
