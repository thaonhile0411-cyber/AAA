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
  allocation: RoadmapAllocationSummary | null;
  milestones: Array<{
    id: string;
    skill: Skill;
    title: string;
    description: string;
    position: number;
    activities: Array<{
      id: string;
      skill: Skill;
      resourceSlug: string | null;
      title: string;
      description: string | null;
      estimatedMinutes: number | null;
      position: number;
      completedAt: string | null;
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
    .select("id, title, summary, allocation_snapshot")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (roadmapError) throw new Error("ActiveRoadmapLookupError");
  if (!roadmap) return null;

  const { data: milestones, error: milestonesError } = await supabase
    .from("roadmap_milestones")
    .select("id, skill, title, description, position")
    .eq("roadmap_id", roadmap.id)
    .order("position");
  if (milestonesError) throw new Error("RoadmapMilestonesLookupError");

  const milestoneIds = (milestones ?? []).map((milestone) => milestone.id);
  const { data: activities, error: activitiesError } = milestoneIds.length
    ? await supabase
        .from("roadmap_activities")
        .select("id, milestone_id, resource_slug, skill, title, description, estimated_minutes, position, completed_at")
        .in("milestone_id", milestoneIds)
        .order("position")
    : { data: [], error: null };
  if (activitiesError) throw new Error("RoadmapActivitiesLookupError");

  return {
    id: roadmap.id,
    title: roadmap.title,
    summary: roadmap.summary,
    allocation: allocationFromDatabase(roadmap.allocation_snapshot),
    milestones: (milestones ?? []).map((milestone) => ({
      id: milestone.id,
      skill: milestone.skill as Skill,
      title: milestone.title,
      description: milestone.description,
      position: milestone.position,
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
        })),
    })),
  };
}
