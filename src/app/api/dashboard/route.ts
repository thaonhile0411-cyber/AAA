import { supabaseServer } from "@/lib/supabase/server";
export async function GET() {
  const start = performance.now();
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims.sub)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.rpc("dashboard_overview");
  if (error)
    return Response.json(
      { error: "Không tải được tiến độ học tập." },
      { status: 503 },
    );
  const { data: savedWork, error: savedWorkError } = await supabase
    .from("practice_saved_work")
    .select("resource_slug, skill, saved_at, completed_at")
    .order("saved_at", { ascending: false })
    .limit(20);
  if (savedWorkError) {
    return Response.json(
      { error: "Không tải được bài luyện đã lưu." },
      { status: 503 },
    );
  }
  return Response.json({
    ...(data as Record<string, unknown>),
    savedWork: (savedWork ?? []).map((work) => ({
      resourceSlug: work.resource_slug,
      skill: work.skill,
      savedAt: work.saved_at,
      completedAt: work.completed_at,
    })),
  }, {
    headers: {
      "Cache-Control": "private, no-store",
      "Server-Timing": `dashboard;dur=${(performance.now() - start).toFixed(1)}`,
    },
  });
}
