import {
  addDays,
  overallBand,
  todayInVietnam,
  validateGoals,
  type GoalInput,
  type GoalResponse,
  type UserProfile,
} from "./goals.ts";

export const GOAL_STORAGE_KEY = "aaa:us102:goals:v1";
type GoalStorage = Pick<Storage, "getItem" | "setItem">;

/** Frontend preview adapter only. Replace with the team's authenticated API later. */
export function readBrowserProfile(
  storage: GoalStorage = window.localStorage,
): UserProfile | null {
  const raw = storage.getItem(GOAL_STORAGE_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as UserProfile;
    // Saved dates may have expired; keep them editable instead of silently deleting the goal.
    const valid = validateGoals(value, "0001-01-01");
    if (!valid.ok || typeof value.updatedAt !== "string") return null;
    return {
      ...valid.data,
      currentBand: valid.data.scores ? overallBand(valid.data.scores) : null,
      scoreSource: valid.data.useExistingScores ? "self_reported" : null,
      updatedAt: value.updatedAt,
    };
  } catch {
    return null;
  }
}

export function loadBrowserGoals(
  storage: GoalStorage = window.localStorage,
): GoalResponse {
  const today = todayInVietnam();
  return {
    profile: readBrowserProfile(storage),
    today,
    minExamDate: addDays(today, 7),
    demoMode: true,
  };
}

export function saveBrowserGoals(
  input: GoalInput,
  storage: GoalStorage = window.localStorage,
) {
  const validation = validateGoals(input);
  if (!validation.ok)
    throw new Error(
      "Vui lòng kiểm tra lại mục tiêu và ngày thi trước khi lưu.",
    );
  const profile: UserProfile = {
    ...validation.data,
    currentBand: input.scores ? overallBand(input.scores) : null,
    scoreSource: input.useExistingScores ? "self_reported" : null,
    updatedAt: new Date().toISOString(),
  };
  try {
    storage.setItem(GOAL_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    throw new Error(
      "Trình duyệt chưa thể lưu mục tiêu. Kiểm tra quyền lưu trữ rồi thử lại; thông tin trên form vẫn được giữ.",
    );
  }
  return { profile };
}
