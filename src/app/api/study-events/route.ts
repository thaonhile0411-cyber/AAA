import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
const eventSchema = z
  .object({
    resourceSlug: z.string().regex(/^[a-z0-9-]{1,100}$/),
    taskId: z.uuid().nullable(),
    eventId: z.uuid(),
    seconds: z.number().int().min(1).max(30),
  })
  .strict();
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  const parsed = eventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "Invalid event" }, { status: 400 });
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims.sub)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { taskId, eventId, resourceSlug, seconds } = parsed.data;
  const { data, error } = await supabase.rpc("record_active_study", {
    p_task_id: taskId,
    p_event_id: eventId,
    p_resource_slug: resourceSlug,
    p_seconds: seconds,
  });
  if (error)
    return Response.json(
      {
        error:
          error.code === "42501"
            ? "Task not available"
            : "Không lưu được hoạt động.",
      },
      { status: error.code === "42501" ? 403 : 503 },
    );
  return Response.json(
    { saved: data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
