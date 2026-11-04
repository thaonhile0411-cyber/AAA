import type { supabaseServer } from "@/lib/supabase/server";

export function applicationOrigin() {
  return new URL(process.env.AUTH_SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")).origin;
}

export async function destination(client: Awaited<ReturnType<typeof supabaseServer>>, userId: string) {
  const { data } = await client.from("learning_goals")
    .select("id").eq("user_id", userId).maybeSingle();
  return data ? "/dashboard" : "/onboarding/goals";
}
