import { apiFailure, json } from "@/lib/api-response";
import { loadActiveRoadmap } from "@/lib/active-roadmap";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns the signed-in learner's current roadmap. The route is deliberately
 * no-store because a prefetched roadmap page may predate roadmap creation.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Bạn cần đăng nhập để xem lộ trình." }, 401);

    const roadmap = await loadActiveRoadmap(supabase, user.id);
    return json({ roadmap });
  } catch (error) {
    return apiFailure(error);
  }
}
