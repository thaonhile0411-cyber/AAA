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
  return Response.json(data, {
    headers: {
      "Cache-Control": "private, no-store",
      "Server-Timing": `dashboard;dur=${(performance.now() - start).toFixed(1)}`,
    },
  });
}
