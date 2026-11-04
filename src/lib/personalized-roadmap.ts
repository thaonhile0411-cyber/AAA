import { originalPracticeTests, type OriginalPracticeTest } from "@/data/original-practice-tests";
import type { Skill } from "@/lib/goals";
import type { LearnerSkillProfile } from "@/lib/learner-skill-profile";
import {
  createMaterialAllocationPlan,
  inventoryFromResources,
  type MaterialAllocationPlan,
} from "@/lib/personalized-material-allocation";

const DEFAULT_CYCLE_SIZE = 12;

const ESTIMATED_MINUTES: Record<Skill, number> = {
  listening: 25,
  reading: 35,
  writing: 40,
  speaking: 25,
};

const SKILL_LABELS: Record<Skill, string> = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  speaking: "Speaking",
};

export type RoadmapActivityDraft = {
  skill: Skill;
  resourceSlug: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  position: number;
};

export type RoadmapMilestoneDraft = {
  skill: Skill;
  title: string;
  description: string;
  position: number;
  activities: RoadmapActivityDraft[];
};

export type PersonalizedRoadmapDraft = {
  title: string;
  summary: string;
  allocation: MaterialAllocationPlan;
  milestones: RoadmapMilestoneDraft[];
};

function resourceOrder(left: OriginalPracticeTest, right: OriginalPracticeTest) {
  return left.slug.localeCompare(right.slug);
}

/**
 * Builds the first personalized learning cycle from the currently available
 * practice resources. The cycle size is intentionally separate from inventory:
 * a larger library will not force a learner to receive every resource at once.
 */
export function createPersonalizedRoadmapDraft(
  profile: LearnerSkillProfile,
  targetBand: number | null,
  resources: readonly OriginalPracticeTest[] = originalPracticeTests,
  requestedItems = DEFAULT_CYCLE_SIZE,
): PersonalizedRoadmapDraft | null {
  const allocation = createMaterialAllocationPlan(
    profile,
    inventoryFromResources(resources),
    { targetBand, requestedItems },
  );
  if (!allocation || allocation.allocatedItems === 0) return null;

  const skillOrder = [...Object.values(allocation.allocations)]
    .filter((item) => item.allocatedItems > 0)
    .sort((left, right) => right.priorityScore - left.priorityScore)
    .map((item) => item.skill);

  const milestones = skillOrder.map((skill, milestoneIndex) => {
    const materialCount = allocation.allocations[skill].allocatedItems;
    const selected = resources
      .filter((resource) => resource.skill === skill)
      .sort(resourceOrder)
      .slice(0, materialCount);
    return {
      skill,
      title: `Củng cố ${SKILL_LABELS[skill]}`,
      description: `Ưu tiên ${allocation.allocations[skill].desiredPercent}% tài liệu cho kỹ năng ${SKILL_LABELS[skill]}.`,
      position: milestoneIndex + 1,
      activities: selected.map((resource, activityIndex) => ({
        skill,
        resourceSlug: resource.slug,
        title: resource.title,
        description: resource.summary,
        estimatedMinutes: ESTIMATED_MINUTES[skill],
        position: activityIndex + 1,
      })),
    } satisfies RoadmapMilestoneDraft;
  });

  return {
    title: `Lộ trình cá nhân hóa · Mục tiêu Band ${targetBand?.toFixed(1) ?? "chưa đặt"}`,
    summary: `Chu kỳ đầu gồm ${allocation.allocatedItems} tài liệu, ưu tiên các kỹ năng có khoảng cách lớn hơn tới mục tiêu.`,
    allocation,
    milestones,
  };
}
