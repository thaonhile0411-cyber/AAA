import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const schema = z.object({ timeZone: z.string().trim().min(1).max(64) }).strict();

export async function PUT(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid timezone" }, { status: 400 });

  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims.sub) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.rpc("set_user_time_zone", {
    p_time_zone: parsed.data.timeZone,
  });
  if (error) return Response.json({ error: "Invalid timezone" }, { status: 400 });
  return Response.json({ timeZone: data }, { headers: { "Cache-Control": "no-store" } });
}
