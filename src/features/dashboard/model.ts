export const skills = ["listening", "reading", "writing", "speaking"] as const;
export type Task = {
  task_id: string;
  title: string;
  skill: string;
  resource_slug: string | null;
  scheduled_date: string | null;
};
export type StreakOverview = {
  current: number;
  todayActive: boolean;
  localDate: string;
  timeZone: string;
  week: Array<{ date: string; completions: number; active: boolean }>;
};
export type Overview = {
  totalSeconds: number;
  total: number;
  completed: number;
  targetBand: number | null;
  currentBand: number | null;
  assessmentDate: string | null;
  placementResult: {
    overallBand: number | null;
    date: string;
    kind: "placement" | "reassessment";
    results: {
      skills?: Record<
        string,
        {
          band: number | null;
          status?: string;
          evaluationDetails?: { isAiEvaluated?: boolean };
        }
      >;
    };
  } | null;
  streak?: StreakOverview;
  tasks: Task[];
  unscheduled: Task[];
};
export function progress(completed: number, total: number) {
  return total > 0
    ? Math.min(100, Math.max(0, Math.round((completed / total) * 1000) / 10))
    : 0;
}
export function studyTime(seconds: number) {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  return {
    hours: Math.round(seconds / 360) / 10,
    label: `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`,
  };
}
export function availableBand(band: unknown, status?: string) {
  return typeof band === "number" &&
    Number.isFinite(band) &&
    band >= 1 &&
    band <= 9 &&
    (!status || status === "success" || status === "completed")
    ? band
    : null;
}
export function currentAssessment(data: Overview) {
  const placement = data.placementResult;
  if (
    placement &&
    (!data.assessmentDate ||
      Date.parse(placement.date) > Date.parse(data.assessmentDate))
  ) {
    // Overall is meaningful only when every skill has an available assessment.
    const complete = skills.every(
      (skill) =>
        availableBand(
          placement.results.skills?.[skill]?.band,
          placement.results.skills?.[skill]?.status,
        ) !== null,
    );
    const bands = skills.map((skill) =>
      availableBand(
        placement.results.skills?.[skill]?.band,
        placement.results.skills?.[skill]?.status,
      ),
    );
    const mean = complete
      ? Math.round(
          (bands.reduce<number>((sum, band) => sum + (band ?? 0), 0) / 4) * 2,
        ) / 2
      : null;
    return {
      band: mean,
      date: placement.date,
      source: `${placement.kind === "reassessment" ? "Đánh giá lại" : "Placement"} · 4 kỹ năng`,
    };
  }
  return {
    band: availableBand(data.currentBand),
    date: data.assessmentDate,
    source: "Placement · Reading & Listening",
  };
}
export function taskHref(
  task: Pick<Task, "task_id" | "resource_slug" | "skill">,
) {
  if (!task.resource_slug) return "/roadmap";
  return `/practice/${encodeURIComponent(task.resource_slug)}?task=${encodeURIComponent(task.task_id)}&skill=${encodeURIComponent(task.skill)}`;
}
