import {
  overallBand,
  SCORE_BANDS,
  SKILLS,
  type Scores,
  type UserProfile,
} from "./goals.ts";

export const GOAL_COLUMNS =
  "target_band, expected_exam_date, available_minutes_per_day, self_reported_scores, updated_at";
export type GoalRow = {
  target_band: number | string;
  expected_exam_date: string;
  available_minutes_per_day: number;
  self_reported_scores: unknown;
  updated_at: string;
};

export function scoresFromDatabase(value: unknown): Scores | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  if (
    !SKILLS.every(
      (skill) =>
        typeof source[skill] === "number" &&
        SCORE_BANDS.includes(source[skill] as number),
    )
  )
    return null;
  return Object.fromEntries(
    SKILLS.map((skill) => [skill, source[skill]]),
  ) as Scores;
}

export function profileFromRow(
  row: GoalRow,
  assessedBand: number | null = null,
): UserProfile {
  const scores = scoresFromDatabase(row.self_reported_scores);
  return {
    targetBand: Number(row.target_band),
    examDate: row.expected_exam_date,
    dailyStudyMinutes: row.available_minutes_per_day,
    useExistingScores: scores !== null,
    scores,
    currentBand: scores ? overallBand(scores) : assessedBand,
    scoreSource: scores
      ? "self_reported"
      : assessedBand !== null
        ? "placement"
        : null,
    updatedAt: row.updated_at,
  };
}
