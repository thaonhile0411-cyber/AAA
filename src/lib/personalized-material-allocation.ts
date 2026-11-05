import type { Skill } from "@/lib/goals";
import { PROFILE_SKILLS, type LearnerSkillProfile } from "@/lib/learner-skill-profile";

export type MaterialInventory = Record<Skill, number>;

export type SkillMaterialAllocation = {
  skill: Skill;
  currentBand: number;
  priorityScore: number;
  desiredPercent: number;
  availableItems: number;
  allocatedItems: number;
  actualPercent: number;
  limitedByInventory: boolean;
};

export type MaterialAllocationPlan = {
  requestedItems: number;
  allocatedItems: number;
  totalAvailableItems: number;
  targetBand: number | null;
  allocations: Record<Skill, SkillMaterialAllocation>;
};

type ResourceWithSkill = { skill: string };

const EMPTY_INVENTORY: MaterialInventory = {
  listening: 0,
  reading: 0,
  writing: 0,
  speaking: 0,
};

function isValidTargetBand(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 9;
}

function normaliseInventory(inventory: Partial<MaterialInventory>): MaterialInventory {
  return Object.fromEntries(
    PROFILE_SKILLS.map((skill) => {
      const quantity = inventory[skill];
      return [skill, typeof quantity === "number" && Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0];
    }),
  ) as MaterialInventory;
}

/** Counts any current or future resource collection by its four IELTS skills. */
export function inventoryFromResources(resources: readonly ResourceWithSkill[]): MaterialInventory {
  const inventory = { ...EMPTY_INVENTORY };
  for (const resource of resources) {
    if (PROFILE_SKILLS.includes(resource.skill as Skill)) inventory[resource.skill as Skill] += 1;
  }
  return inventory;
}

/**
 * Creates a capacity-aware study allocation.
 *
 * The desired percentage prioritizes a larger gap to the target band. The
 * allocated count is constrained by the actual number of resources available
 * per skill, so adding resources later automatically changes the plan.
 */
export function createMaterialAllocationPlan(
  profile: LearnerSkillProfile,
  inventoryInput: Partial<MaterialInventory>,
  options: { targetBand?: number | null; requestedItems?: number } = {},
): MaterialAllocationPlan | null {
  if (!profile.isComplete || PROFILE_SKILLS.some((skill) => profile.skills[skill] === null)) {
    return null;
  }

  const inventory = normaliseInventory(inventoryInput);
  const totalAvailableItems = PROFILE_SKILLS.reduce((total, skill) => total + inventory[skill], 0);
  const requested = options.requestedItems === undefined
    ? totalAvailableItems
    : Math.max(0, Math.floor(options.requestedItems));
  const allocatedItems = Math.min(requested, totalAvailableItems);
  const targetBand = isValidTargetBand(options.targetBand) ? options.targetBand : null;
  const highestCurrentBand = Math.max(...PROFILE_SKILLS.map((skill) => profile.skills[skill]!));
  const referenceBand = targetBand ?? highestCurrentBand;

  const weights = Object.fromEntries(
    PROFILE_SKILLS.map((skill) => {
      const gap = Math.max(0, referenceBand - profile.skills[skill]!);
      // A base weight keeps a small amount of practice for already-strong skills.
      return [skill, 1 + gap * 2];
    }),
  ) as Record<Skill, number>;
  const totalWeight = PROFILE_SKILLS.reduce((total, skill) => total + weights[skill], 0);
  const targetCounts = Object.fromEntries(
    PROFILE_SKILLS.map((skill) => [skill, (weights[skill] / totalWeight) * allocatedItems]),
  ) as Record<Skill, number>;
  const allocated = { ...EMPTY_INVENTORY };

  // Allocate one item at a time to the largest remaining quota. This both
  // preserves the desired percentage and redistributes a missing skill's quota
  // when its resource library is too small.
  for (let slot = 0; slot < allocatedItems; slot += 1) {
    const candidate = PROFILE_SKILLS
      .filter((skill) => allocated[skill] < inventory[skill])
      .sort((left, right) => {
        const leftNeed = targetCounts[left] - allocated[left];
        const rightNeed = targetCounts[right] - allocated[right];
        if (rightNeed !== leftNeed) return rightNeed - leftNeed;
        return weights[right] - weights[left];
      })[0];
    if (!candidate) break;
    allocated[candidate] += 1;
  }

  const allocations = Object.fromEntries(
    PROFILE_SKILLS.map((skill) => {
      const desiredPercent = (weights[skill] / totalWeight) * 100;
      return [
        skill,
        {
          skill,
          currentBand: profile.skills[skill]!,
          priorityScore: weights[skill],
          desiredPercent: Math.round(desiredPercent * 10) / 10,
          availableItems: inventory[skill],
          allocatedItems: allocated[skill],
          actualPercent:
            allocatedItems === 0 ? 0 : Math.round((allocated[skill] / allocatedItems) * 1000) / 10,
          limitedByInventory: inventory[skill] < targetCounts[skill],
        } satisfies SkillMaterialAllocation,
      ];
    }),
  ) as Record<Skill, SkillMaterialAllocation>;

  return {
    requestedItems: requested,
    allocatedItems,
    totalAvailableItems,
    targetBand,
    allocations,
  };
}
