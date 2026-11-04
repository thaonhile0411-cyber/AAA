import { apiFailure, json } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ activityId: string }> }) {
  try {
    const body = (await request.json().catch(() => null)) as { completed?: unknown } | null;
    if (!body || typeof body.completed !== "boolean") return json({ error: "completed phải là true hoặc false." }, 400);
    const { activityId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Bạn cần đăng nhập để cập nhật tiến độ." }, 401);
    const { data, error } = await supabase.from("roadmap_activities").update({ completed_at: body.completed ? new Date().toISOString() : null }).eq("id", activityId).select("id, completed_at").maybeSingle();
    if (error) throw new Error("RoadmapActivityUpdateError");
    if (!data) return json({ error: "Không tìm thấy task của bạn." }, 404);
    return json({ activityId: data.id, completedAt: data.completed_at });
  } catch (error) {
    return apiFailure(error);
  }
}
