import { apiFailure, json } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ activityId: string }> }) {
  try {
    const body = (await request.json().catch(() => null)) as { completed?: unknown; resourceSlug?: unknown } | null;
    if (!body || typeof body.completed !== "boolean") return json({ error: "completed phải là true hoặc false." }, 400);
    const { activityId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Bạn cần đăng nhập để cập nhật tiến độ." }, 401);
    if (body.resourceSlug !== undefined && typeof body.resourceSlug !== 'string') return json({ error: 'Resource không hợp lệ.' }, 400);
    const lookup = supabase.from('roadmap_activities').select('id,completed_at,resource_slug').eq('id',activityId);
    if (body.resourceSlug) lookup.eq('resource_slug',body.resourceSlug);
    const { data: existing, error: lookupError } = await lookup.maybeSingle();
    if (lookupError) throw lookupError;
    if (!existing) return json({ error: 'Không tìm thấy task của bạn.' }, 404);
    const { data, error } = await supabase.from("roadmap_activities").update({ completed_at: body.completed ? existing.completed_at ?? new Date().toISOString() : null }).eq("id", activityId).select("id, completed_at").maybeSingle();
    if (error) throw new Error("RoadmapActivityUpdateError");
    if (!data) return json({ error: "Không tìm thấy task của bạn." }, 404);
    return json({ activityId: data.id, completedAt: data.completed_at });
  } catch (error) {
    return apiFailure(error);
  }
}
