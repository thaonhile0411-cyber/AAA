export const TARGET_BANDS = Array.from({ length: 13 }, (_, i) => 3 + i * 0.5);
export const SCORE_BANDS = Array.from({ length: 19 }, (_, i) => i * 0.5);
export const STUDY_OPTIONS = [
  { value: 15, label: "15 phút", caption: "Từng chút mỗi ngày" },
  { value: 30, label: "30 phút", caption: "Xây thói quen" },
  { value: 60, label: "1 giờ", caption: "Học đều, tiến xa" },
  { value: 120, label: "2 giờ", caption: "Tập trung bứt phá" },
  { value: 180, label: "> 2 giờ", caption: "Tăng tốc về đích" },
] as const;
export const SKILLS = ["listening", "reading", "writing", "speaking"] as const;
export type Skill = (typeof SKILLS)[number];
export type Scores = Record<Skill, number>;
export type GoalInput = {
  targetBand: number;
  examDate: string;
  dailyStudyMinutes: number;
  useExistingScores: boolean;
  scores: Scores | null;
};
export type UserProfile = GoalInput & {
  currentBand: number | null;
  scoreSource: "self_reported" | null;
  updatedAt: string;
};
export type FieldErrors = Partial<Record<keyof GoalInput | Skill, string>>;
export type GoalResponse = {
  profile: UserProfile | null;
  today: string;
  minExamDate: string;
};

/** Calendar dates use the application's Vietnamese timezone, never the host timezone. */
export function todayInVietnam(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function overallBand(scores: Scores): number {
  return (
    Math.round(
      (SKILLS.reduce((sum, skill) => sum + scores[skill], 0) / 4) * 2,
    ) / 2
  );
}

export function goalWarning(
  target: number,
  current: number | null,
): string | null {
  if (current === null || target > current) return null;
  return current >= 9
    ? "Bạn đã đạt band 9.0. Hãy duy trì phong độ và tập trung vào kỹ năng bạn muốn cải thiện."
    : `Mục tiêu ${target.toFixed(1)} đang thấp hơn hoặc bằng band hiện tại ${current.toFixed(1)}. Bạn có thể thử mục tiêu từ ${(current + 0.5).toFixed(1)} để tiến xa hơn.`;
}

export function validateGoals(
  raw: unknown,
  today = todayInVietnam(),
): { ok: true; data: GoalInput } | { ok: false; errors: FieldErrors } {
  const body =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const errors: FieldErrors = {};
  if (
    typeof body.targetBand !== "number" ||
    !TARGET_BANDS.includes(body.targetBand)
  ) {
    errors.targetBand = "Chọn band mục tiêu từ 3.0 đến 9.0, theo bước 0.5.";
  }
  if (!isCalendarDate(body.examDate)) {
    errors.examDate = "Vui lòng chọn ngày thi hợp lệ.";
  } else if (body.examDate < addDays(today, 7)) {
    errors.examDate = "Ngày thi phải cách hôm nay ít nhất 7 ngày.";
  }
  if (
    !STUDY_OPTIONS.some((option) => option.value === body.dailyStudyMinutes)
  ) {
    errors.dailyStudyMinutes = "Chọn thời gian tự học mỗi ngày.";
  }
  if (typeof body.useExistingScores !== "boolean") {
    errors.useExistingScores =
      "Vui lòng xác nhận bạn có điểm IELTS gần đây hay chưa.";
  }
  let scores: Scores | null = null;
  if (body.useExistingScores === true) {
    const values =
      body.scores && typeof body.scores === "object"
        ? (body.scores as Record<string, unknown>)
        : {};
    for (const skill of SKILLS) {
      if (
        typeof values[skill] !== "number" ||
        !SCORE_BANDS.includes(values[skill] as number)
      ) {
        errors[skill] = "Chọn điểm từ 0.0 đến 9.0, theo bước 0.5.";
      }
    }
    if (!SKILLS.some((skill) => errors[skill])) scores = values as Scores;
  } else if (body.scores !== null && body.scores !== undefined) {
    errors.scores = "Tắt lựa chọn điểm có sẵn thì không gửi điểm kỹ năng.";
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      targetBand: body.targetBand as number,
      examDate: body.examDate as string,
      dailyStudyMinutes: body.dailyStudyMinutes as number,
      useExistingScores: body.useExistingScores as boolean,
      scores,
    },
  };
}

export function formatDate(date: string): string {
  if (!isCalendarDate(date)) return "Chưa chọn ngày hợp lệ";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
