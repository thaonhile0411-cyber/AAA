import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  overallBand,
  SCORE_BANDS,
  SKILLS,
  todayInVietnam,
  validateGoals,
  type GoalInput,
  type GoalResponse,
  type Scores,
  type UserProfile,
} from "@/lib/goals";

export const dynamic = "force-dynamic";

type GoalRow = {
  target_band: number | string;
  expected_exam_date: string;
  available_minutes_per_day: number;
  self_reported_scores: unknown;
  updated_at: string;
};

function surveyResponse(profile: UserProfile | null): GoalResponse {
  const today = todayInVietnam();
  return {
    profile,
    today,
    minExamDate: addDays(today, 7),
  };
}

function scoresFromDatabase(value: unknown): Scores | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const scores = {} as Scores;
  for (const skill of SKILLS) {
    if (
      typeof candidate[skill] !== "number" ||
      !SCORE_BANDS.includes(candidate[skill])
    ) {
      return null;
    }
    scores[skill] = candidate[skill];
  }
  return scores;
}

function profileFromRow(row: GoalRow): UserProfile {
  const scores = scoresFromDatabase(row.self_reported_scores);

  return {
    targetBand: Number(row.target_band),
    examDate: row.expected_exam_date,
    dailyStudyMinutes: row.available_minutes_per_day,
    useExistingScores: scores !== null,
    scores,
    currentBand: scores ? overallBand(scores) : null,
    scoreSource: scores ? "self_reported" : null,
    updatedAt: row.updated_at,
  };
}

async function authenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { supabase, user: error ? null : user };
}

export async function GET() {
  const { supabase, user } = await authenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Bạn cần đăng nhập để xem mục tiêu học tập." },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("learning_goals")
    .select(
      "target_band, expected_exam_date, available_minutes_per_day, self_reported_scores, updated_at",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Chưa thể tải mục tiêu từ cơ sở dữ liệu." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    surveyResponse(data ? profileFromRow(data as GoalRow) : null),
  );
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Dữ liệu gửi lên không hợp lệ." },
      { status: 400 },
    );
  }

  const validation = validateGoals(body);
  if (!validation.ok) {
    return NextResponse.json(
      { error: "Vui lòng kiểm tra lại thông tin mục tiêu.", errors: validation.errors },
      { status: 422 },
    );
  }

  const { supabase, user } = await authenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Bạn cần đăng nhập để lưu mục tiêu học tập." },
      { status: 401 },
    );
  }

  const input: GoalInput = validation.data;
  const scores = input.scores;
  const { data, error } = await supabase
    .from("learning_goals")
    .upsert(
      {
        user_id: user.id,
        target_band: input.targetBand,
        expected_exam_date: input.examDate,
        available_minutes_per_day: input.dailyStudyMinutes,
        self_reported_scores: scores,
      },
      { onConflict: "user_id" },
    )
    .select(
      "target_band, expected_exam_date, available_minutes_per_day, self_reported_scores, updated_at",
    )
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Chưa thể lưu mục tiêu vào cơ sở dữ liệu." },
      { status: 500 },
    );
  }

  return NextResponse.json(surveyResponse(profileFromRow(data as GoalRow)));
}
