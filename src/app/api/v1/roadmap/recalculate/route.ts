import { apiFailure, json } from "@/lib/api-response";
import { createAdaptiveRoadmapPlan } from "@/lib/adaptive-roadmap";
import { profileFromPlacementAssessment } from "@/lib/learner-skill-profile";
import { createClient } from "@/lib/supabase/server";

type RecalculateRequest = {
  reassessmentId?: unknown;
  roadmapId?: unknown;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function optionalUuid(value: unknown) {
  return typeof value === "string" && UUID.test(value) ? value : null;
}

export async function POST(request: Request) {
  const startedAt = performance.now();
  try {
    const body = (await request.json().catch(() => ({}))) as RecalculateRequest;
    if (body.reassessmentId !== undefined && !optionalUuid(body.reassessmentId)) {
      return json({ error: "reassessmentId phải là UUID hợp lệ." }, 400);
    }
    if (body.roadmapId !== undefined && !optionalUuid(body.roadmapId)) {
      return json({ error: "roadmapId phải là UUID hợp lệ." }, 400);
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Bạn cần đăng nhập để điều chỉnh lộ trình." }, 401);

    let roadmapQuery = supabase
      .from("roadmaps")
      .select("id, source_placement_test_id, last_adjustment_assessment_id, current_phase")
      .eq("user_id", user.id)
      .eq("status", "active");
    const requestedRoadmapId = optionalUuid(body.roadmapId);
    if (requestedRoadmapId) roadmapQuery = roadmapQuery.eq("id", requestedRoadmapId);

    const [roadmapResult, goalResult] = await Promise.all([
      roadmapQuery.maybeSingle(),
      supabase
        .from("learning_goals")
        .select("target_band, available_minutes_per_day")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    if (roadmapResult.error || goalResult.error) throw new Error("RoadmapRecalculationLookupError");
    if (!roadmapResult.data) return json({ error: "Không tìm thấy lộ trình đang hoạt động của bạn." }, 404);
    if (!goalResult.data?.available_minutes_per_day) {
      return json({ error: "Hãy lưu thời gian học mỗi ngày trước khi điều chỉnh lộ trình." }, 422);
    }

    const roadmap = roadmapResult.data;
    const previousAssessmentId = roadmap.last_adjustment_assessment_id ?? roadmap.source_placement_test_id;
    if (!previousAssessmentId) return json({ error: "Lộ trình chưa có mốc đánh giá ban đầu để so sánh." }, 422);

    let assessmentQuery = supabase
      .from("placement_tests")
      .select("id, assessment_kind, assessment_results, created_at")
      .eq("user_id", user.id)
      .eq("assessment_kind", "reassessment")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1);
    const requestedAssessmentId = optionalUuid(body.reassessmentId);
    if (requestedAssessmentId) assessmentQuery = assessmentQuery.eq("id", requestedAssessmentId);
    const reassessmentResult = await assessmentQuery.maybeSingle();
    if (reassessmentResult.error) throw new Error("ReassessmentLookupError");
    if (!reassessmentResult.data) {
      return json({ error: "Chưa có Progress Test (reassessment) hoàn thành để điều chỉnh lộ trình." }, 422);
    }

    const existingAdjustmentResult = await supabase
      .from("roadmap_adjustments")
      .select("id, phase_number, notification, schedule_risk, pace_recommendation")
      .eq("roadmap_id", roadmap.id)
      .eq("source_assessment_id", reassessmentResult.data.id)
      .maybeSingle();
    if (existingAdjustmentResult.error) throw new Error("RoadmapAdjustmentIdempotencyLookupError");
    if (existingAdjustmentResult.data) {
      return json({
        adjustmentId: existingAdjustmentResult.data.id,
        idempotent: true,
        phaseNumber: existingAdjustmentResult.data.phase_number,
        notification: existingAdjustmentResult.data.notification,
        scheduleRisk: existingAdjustmentResult.data.schedule_risk,
        paceRecommendation: existingAdjustmentResult.data.pace_recommendation,
        durationMs: Math.round(performance.now() - startedAt),
      });
    }

    const previousResult = await supabase
      .from("placement_tests")
      .select("id, assessment_results, created_at")
      .eq("user_id", user.id)
      .eq("id", previousAssessmentId)
      .eq("status", "completed")
      .maybeSingle();
    if (previousResult.error) throw new Error("BaselineLookupError");
    if (!previousResult.data) return json({ error: "Không tìm thấy kết quả nền hợp lệ của phase hiện tại." }, 422);
    if (previousResult.data.id === reassessmentResult.data.id) {
      return json({ error: "Progress Test phải là một lần đánh giá mới hơn kết quả nền của phase hiện tại." }, 422);
    }
    if (new Date(reassessmentResult.data.created_at).getTime() <= new Date(previousResult.data.created_at).getTime()) {
      return json({ error: "Progress Test phải diễn ra sau kết quả nền của phase hiện tại." }, 422);
    }

    const baseline = profileFromPlacementAssessment(previousResult.data.assessment_results);
    const reassessment = profileFromPlacementAssessment(reassessmentResult.data.assessment_results);
    if (!baseline?.isComplete || !reassessment?.isComplete) {
      return json({ error: "Chỉ có thể điều chỉnh khi hai lần đánh giá đều có đủ điểm bốn kỹ năng." }, 422);
    }

    const plan = createAdaptiveRoadmapPlan({
      baseline: baseline.skills,
      reassessment: reassessment.skills,
      targetBand: goalResult.data.target_band === null ? null : Number(goalResult.data.target_band),
      dailyStudyMinutes: Number(goalResult.data.available_minutes_per_day),
      nextPhaseNumber: Number(roadmap.current_phase ?? 1) + 1,
    });
    if (!plan) return json({ error: "Kết quả chưa thể so sánh an toàn; lộ trình hiện tại không bị thay đổi." }, 422);

    const { data, error } = await supabase.rpc("apply_roadmap_recalculation", {
      p_roadmap_id: roadmap.id,
      p_source_assessment_id: reassessmentResult.data.id,
      p_previous_assessment_id: previousResult.data.id,
      p_plan: plan,
    });
    if (error || !data) throw new Error("RoadmapRecalculationSaveError");

    const result = data as { adjustmentId: string; idempotent: boolean; phaseNumber: number; notification: string };
    return json({
      ...result,
      scheduleRisk: plan.scheduleRisk,
      paceRecommendation: plan.paceRecommendation,
      durationMs: Math.round(performance.now() - startedAt),
    }, result.idempotent ? 200 : 201);
  } catch (error) {
    return apiFailure(error);
  }
}
