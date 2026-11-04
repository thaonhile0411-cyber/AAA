import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  todayInVietnam,
  validateGoals,
  goalWarning,
  type GoalResponse,
} from "@/lib/goals";
import { GOAL_COLUMNS, profileFromRow, type GoalRow } from "@/lib/goal-record";
import { apiFailure, json } from "@/lib/api-response";

async function handle(request?: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user)
      return json(
        {
          error: "Bạn cần đăng nhập bằng tài khoản AAA để lưu và xem mục tiêu.",
        },
        401,
      );

    const { data: attempt, error: placementError } = await supabase
      .from("placement_attempts")
      .select("estimated_band")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (placementError)
      return json({ error: "Chưa thể tải band hiện tại của bạn." }, 500);
    const assessedBand =
      attempt?.estimated_band == null ? null : Number(attempt.estimated_band);

    let row: GoalRow | null;
    if (request) {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Dữ liệu JSON không hợp lệ." }, 400);
      }
      const valid = validateGoals(body);
      if (!valid.ok)
        return json(
          {
            error: "Vui lòng kiểm tra các trường được đánh dấu.",
            errors: valid.errors,
          },
          422,
        );
      const input = valid.data;
      const { data, error } = await supabase
        .from("learning_goals")
        .upsert(
          {
            user_id: user.id,
            target_band: input.targetBand,
            expected_exam_date: input.examDate,
            available_minutes_per_day: input.dailyStudyMinutes,
            self_reported_scores: input.scores,
          },
          { onConflict: "user_id" },
        )
        .select(GOAL_COLUMNS)
        .single();
      if (error)
        return json(
          {
            error:
              "Chưa lưu được mục tiêu. Thông tin trên form vẫn được giữ lại.",
          },
          500,
        );
      row = data as GoalRow;
    } else {
      const { data, error } = await supabase
        .from("learning_goals")
        .select(GOAL_COLUMNS)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error)
        return json({ error: "Chưa thể tải mục tiêu từ cơ sở dữ liệu." }, 500);
      row = data as GoalRow | null;
    }

    const profile = row ? profileFromRow(row, assessedBand) : null;
    const today = todayInVietnam();
    const nextStep = profile?.scores ? "roadmap" : "placement";
    const configuredPath =
      nextStep === "roadmap"
        ? process.env.AAA_ROADMAP_PATH
        : process.env.AAA_PLACEMENT_PATH;
    const nextPath =
      configuredPath?.startsWith("/") &&
      !configuredPath.startsWith("//") &&
      !configuredPath.includes("\\")
        ? configuredPath
        : null;
    const body: GoalResponse = {
      profile,
      today,
      minExamDate: addDays(today, 7),
      demoMode: false,
      warning: profile
        ? goalWarning(profile.targetBand, profile.currentBand)
        : null,
      nextStep,
      nextPath,
    };
    return json(body);
  } catch (error) {
    return apiFailure(error);
  }
}

export async function GET() {
  return handle();
}
export async function PUT(request: Request) {
  return handle(request);
}
