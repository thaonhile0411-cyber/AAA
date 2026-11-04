import type { Skill } from "@/lib/goals";
import { PROFILE_SKILLS } from "@/lib/learner-skill-profile";

export type AdjustmentKind = "accelerated" | "foundation_review" | "targeted_review" | "continue";

export type SkillAdjustment = {
  skill: Skill;
  baselineBand: number;
  newBand: number;
  phaseTargetBand: number;
  change: number;
  kind: AdjustmentKind;
  difficultyBandMin: number;
  difficultyBandMax: number;
  taskCount: number;
  estimatedMinutesPerTask: number;
  reason: string;
};

export type AdaptiveTaskDraft = {
  skill: Skill;
  kind: AdjustmentKind;
  title: string;
  description: string;
  estimatedMinutes: number;
  difficultyBandMin: number;
  difficultyBandMax: number;
  resourceSlug: string;
};

export type AdaptiveRoadmapPlan = {
  phaseNumber: number;
  adjustments: SkillAdjustment[];
  tasks: AdaptiveTaskDraft[];
  totalMinutes: number;
  weeklyBudgetMinutes: number;
  scheduleRisk: boolean;
  notification: string;
  paceRecommendation: string | null;
};

export type AdaptiveRoadmapInput = {
  baseline: Record<Skill, number | null>;
  reassessment: Record<Skill, number | null>;
  targetBand: number | null;
  dailyStudyMinutes: number;
  nextPhaseNumber: number;
};

const SKILL_LABELS: Record<Skill, string> = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  speaking: "Speaking",
};

const CHANGE_EPSILON = 0.01;

function roundBand(value: number) {
  return Math.max(1, Math.min(9, Math.round(value * 2) / 2));
}

function phaseTarget(baselineBand: number, targetBand: number | null) {
  return roundBand(Math.min(targetBand ?? baselineBand + 0.5, baselineBand + 0.5));
}

function taskTitle(skill: Skill, kind: AdjustmentKind) {
  const label = SKILL_LABELS[skill];
  if (kind === "accelerated") return `${label} · thử thách band cao hơn`;
  if (kind === "foundation_review") return `${label} · ôn nền tảng`;
  if (kind === "targeted_review") return `${label} · củng cố trọng tâm`;
  return `${label} · luyện tập tiếp nối`;
}

function taskDescription(skill: Skill, kind: AdjustmentKind, range: [number, number]) {
  const band = `Band ${range[0].toFixed(1)}–${range[1].toFixed(1)}`;
  if (kind === "accelerated") return `Nhiệm vụ ${SKILL_LABELS[skill]} ở độ khó ${band}, tăng theo kết quả Progress Test.`;
  if (kind === "foundation_review") return `Ôn lại kiến thức nền ${SKILL_LABELS[skill]} trước khi tiếp tục lộ trình ${band}.`;
  if (kind === "targeted_review") return `Củng cố đúng kỹ năng ${SKILL_LABELS[skill]} cần cải thiện, với nhịp học nhẹ hơn ở ${band}.`;
  return `Duy trì luyện ${SKILL_LABELS[skill]} ở mức ${band}.`;
}

/**
 * Produces a deterministic, capacity-aware next-phase plan. It intentionally
 * returns no plan when any skill cannot be compared: incomplete data must
 * never cause a speculative roadmap mutation.
 */
export function createAdaptiveRoadmapPlan(input: AdaptiveRoadmapInput): AdaptiveRoadmapPlan | null {
  if (!Number.isFinite(input.dailyStudyMinutes) || input.dailyStudyMinutes < 1 || input.nextPhaseNumber < 2) {
    return null;
  }
  if (PROFILE_SKILLS.some((skill) => input.baseline[skill] === null || input.reassessment[skill] === null)) {
    return null;
  }

  const adjustments = PROFILE_SKILLS.map((skill) => {
    const baselineBand = input.baseline[skill]!;
    const newBand = input.reassessment[skill]!;
    const change = Math.round((newBand - baselineBand) * 10) / 10;
    const target = phaseTarget(baselineBand, input.targetBand);
    let kind: AdjustmentKind;
    let taskCount: number;
    let estimatedMinutesPerTask: number;
    let range: [number, number];
    let reason: string;

    if (change >= 0.5 && newBand >= target) {
      kind = "accelerated";
      taskCount = 1;
      estimatedMinutesPerTask = 15;
      range = [roundBand(newBand + 0.5), roundBand(newBand + 1)];
      reason = `Tăng ${change.toFixed(1)} band và đạt mục tiêu phase ${target.toFixed(1)}.`;
    } else if (Math.abs(change) < CHANGE_EPSILON) {
      kind = "foundation_review";
      taskCount = 2;
      estimatedMinutesPerTask = 10;
      range = [roundBand(newBand - 0.5), roundBand(newBand)];
      reason = "Điểm không đổi; thêm hai nhiệm vụ ôn nền tảng vào đầu phase tiếp theo.";
    } else if (change < 0) {
      kind = "targeted_review";
      taskCount = 2;
      estimatedMinutesPerTask = 10;
      range = [roundBand(newBand - 0.5), roundBand(newBand)];
      reason = `Giảm ${Math.abs(change).toFixed(1)} band; giảm tải và thêm ôn tập đúng kỹ năng.`;
    } else {
      kind = "continue";
      taskCount = 1;
      estimatedMinutesPerTask = 15;
      range = [roundBand(newBand), roundBand(newBand + 0.5)];
      reason = `Tăng ${change.toFixed(1)} band nhưng chưa đủ điều kiện tăng độ khó phase.`;
    }

    return {
      skill,
      baselineBand,
      newBand,
      phaseTargetBand: target,
      change,
      kind,
      difficultyBandMin: range[0],
      difficultyBandMax: range[1],
      taskCount,
      estimatedMinutesPerTask,
      reason,
    } satisfies SkillAdjustment;
  });

  const tasks = adjustments.flatMap((adjustment) =>
    Array.from({ length: adjustment.taskCount }, (_, index) => ({
      skill: adjustment.skill,
      kind: adjustment.kind,
      title: `${taskTitle(adjustment.skill, adjustment.kind)}${adjustment.taskCount > 1 ? ` ${index + 1}` : ""}`,
      description: taskDescription(adjustment.skill, adjustment.kind, [adjustment.difficultyBandMin, adjustment.difficultyBandMax]),
      estimatedMinutes: adjustment.estimatedMinutesPerTask,
      difficultyBandMin: adjustment.difficultyBandMin,
      difficultyBandMax: adjustment.difficultyBandMax,
      // Cambridge is the single remaining practice collection in this product.
      resourceSlug: "cambridge-10",
    })),
  );
  const totalMinutes = tasks.reduce((total, task) => total + task.estimatedMinutes, 0);
  const weeklyBudgetMinutes = input.dailyStudyMinutes * 7;
  const hasDecline = adjustments.some((item) => item.kind === "targeted_review");
  const hasAcceleration = adjustments.some((item) => item.kind === "accelerated");

  return {
    phaseNumber: input.nextPhaseNumber,
    adjustments,
    tasks,
    totalMinutes,
    weeklyBudgetMinutes,
    scheduleRisk: totalMinutes > weeklyBudgetMinutes,
    notification: hasAcceleration
      ? "Lộ trình của bạn đã được tăng tốc dựa trên tiến bộ mới nhất."
      : hasDecline
        ? "Lộ trình đã được điều chỉnh nhẹ hơn và bổ sung ôn tập trọng tâm."
        : "Lộ trình đã được cập nhật theo kết quả Progress Test mới nhất.",
    paceRecommendation: hasDecline
      ? "Điểm một số kỹ năng đang giảm. Hãy ưu tiên hoàn thành các bài ôn trọng tâm với nhịp học nhẹ hơn trước khi tăng tốc."
      : null,
  };
}
