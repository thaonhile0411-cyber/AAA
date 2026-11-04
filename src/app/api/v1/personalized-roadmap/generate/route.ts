import { apiFailure, json } from "@/lib/api-response";
import { profileFromPlacementAssessment } from "@/lib/learner-skill-profile";
import { createPersonalizedRoadmapDraft } from "@/lib/personalized-roadmap";
import { savePersonalizedRoadmap } from "@/lib/personalized-roadmap-server";
import { createClient } from "@/lib/supabase/server";

type GenerateRequest = { requestedItems?: unknown; replaceActive?: unknown };

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as GenerateRequest;
    const requestedItems = body.requestedItems;
    const replaceActive = body.replaceActive === true;
    if (
      requestedItems !== undefined &&
      (!Number.isInteger(requestedItems) || (requestedItems as number) < 1 || (requestedItems as number) > 100)
    ) {
      return json({ error: "Số lượng tài liệu cần tạo phải là số nguyên từ 1 đến 100." }, 400);
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: "Bạn cần đăng nhập để tạo lộ trình." }, 401);

    const [goalResult, placementResult, activeResult] = await Promise.all([
      supabase
        .from("learning_goals")
        .select("target_band")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("placement_tests")
        .select("id, assessment_results, assessment_kind")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("roadmaps")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle(),
    ]);
    if (goalResult.error || placementResult.error || activeResult.error) throw new Error("RoadmapLookupError");
    if (activeResult.data && !replaceActive) return json({ roadmapId: activeResult.data.id, reused: true });
    if (replaceActive && placementResult.data?.assessment_kind !== "reassessment") {
      return json({ error: "Cần có kết quả đánh giá lại trước khi tạo chu kỳ mới." }, 422);
    }

    const profile = profileFromPlacementAssessment(placementResult.data?.assessment_results);
    const targetBand = goalResult.data ? Number(goalResult.data.target_band) : null;
    const roadmap = profile
      ? createPersonalizedRoadmapDraft(profile, targetBand, undefined, requestedItems as number | undefined)
      : null;
    if (!roadmap || !placementResult.data) {
      return json(
        { error: "Bạn cần hoàn thành bài Placement Test với đủ 4 kỹ năng trước khi tạo lộ trình." },
        422,
      );
    }

    if (activeResult.data) {
      const { error: archiveError } = await supabase
        .from("roadmaps")
        .update({ status: "archived" })
        .eq("id", activeResult.data.id);
      if (archiveError) throw new Error("RoadmapArchiveError");
    }

    const roadmapId = await savePersonalizedRoadmap(
      supabase,
      user.id,
      placementResult.data.id,
      roadmap,
    );
    return json({ roadmapId, reused: false, allocation: roadmap.allocation }, 201);
  } catch (error) {
    return apiFailure(error);
  }
}
