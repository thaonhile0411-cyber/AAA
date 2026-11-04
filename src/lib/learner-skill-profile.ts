import { overallBand } from "@/lib/goals";
import type { Skill } from "@/lib/goals";

/** The only axes used by the learner profile and radar chart. */
export const PROFILE_SKILLS = ["listening", "reading", "writing", "speaking"] as const;

export type LearnerSkillProfile = {
  skills: Record<Skill, number | null>;
  overallBand: number | null;
  strongestSkill: Skill | null;
  weakestSkill: Skill | null;
  isComplete: boolean;
  recordedAt: string | null;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validBand(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 9;
}

/**
 * Converts the JSON saved in placement_tests.assessment_results to the single
 * four-skill contract used by personalization features. Invalid/missing scores
 * become null; they are never silently converted to a band score.
 */
export function profileFromPlacementAssessment(
  assessment: unknown,
): LearnerSkillProfile | null {
  if (!isRecord(assessment) || !isRecord(assessment.skills)) return null;

  const rawSkills = assessment.skills;
  const skills = Object.fromEntries(
    PROFILE_SKILLS.map((skill) => {
      const raw = rawSkills[skill];
      const band = isRecord(raw) && validBand(raw.band) ? raw.band : null;
      return [skill, band];
    }),
  ) as Record<Skill, number | null>;

  const scored = PROFILE_SKILLS.flatMap((skill) =>
    skills[skill] === null ? [] : ([[skill, skills[skill]] as const]),
  );
  if (scored.length === 0) return null;

  const isComplete = scored.length === PROFILE_SKILLS.length;
  const orderedByBand = [...scored].sort(([, left], [, right]) => right - left);
  const completeScores = isComplete ? (skills as Record<Skill, number>) : null;

  return {
    skills,
    // Recalculate only from the four individual scores so a stale/tampered
    // overall_band value never reaches the learner profile.
    overallBand: completeScores ? overallBand(completeScores) : null,
    strongestSkill: orderedByBand[0]?.[0] ?? null,
    weakestSkill: orderedByBand.at(-1)?.[0] ?? null,
    isComplete,
    recordedAt: typeof assessment.submittedAt === "string" ? assessment.submittedAt : null,
  };
}
