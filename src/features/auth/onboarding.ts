"use server";

import { addDays, overallBand, todayInVietnam, validateGoals, type GoalInput, type GoalResponse, type Scores } from "@/lib/goals";
import { authenticatedClient } from "@/lib/supabase/server";

export async function loadGoals(): Promise<GoalResponse> {
  const { supabase, userId } = await authenticatedClient();
  const { data, error } = await supabase.from("learning_goals")
    .select("target_band, expected_exam_date, available_minutes_per_day, self_reported_scores, updated_at")
    .eq("user_id", userId).maybeSingle();
  if (error) throw new Error("Không thể tải mục tiêu học tập.");
  const scores = data?.self_reported_scores as Scores | null | undefined;
  const today = todayInVietnam();
  const nextStep = scores ? "roadmap" : "placement";
  return {
    demoMode: false,
    today,
    minExamDate: addDays(today, 7),
    warning: null,
    nextStep,
    nextPath: nextStep === "placement" ? "/onboarding/placement-test" : "/practice",
    profile: data ? {
      targetBand: Number(data.target_band),
      examDate: data.expected_exam_date,
      dailyStudyMinutes: data.available_minutes_per_day,
      useExistingScores: Boolean(scores),
      scores: scores ?? null,
      currentBand: scores ? overallBand(scores) : null,
      scoreSource: scores ? "self_reported" : null,
      updatedAt: data.updated_at,
    } : null,
  };
}

export async function saveGoals(input: GoalInput) {
  const validation = validateGoals(input);
  if (!validation.ok) return { error: "Vui lòng kiểm tra lại mục tiêu và ngày thi." };
  const { supabase, userId } = await authenticatedClient();
  const goal = validation.data;
  const { error } = await supabase.from("learning_goals").upsert({
    user_id: userId,
    target_band: goal.targetBand,
    expected_exam_date: goal.examDate,
    available_minutes_per_day: goal.dailyStudyMinutes,
    self_reported_scores: goal.scores,
  }, { onConflict: "user_id" });
  return error ? { error: "Chưa lưu được mục tiêu. Hãy thử lại." } : {};
}
