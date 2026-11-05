import { z } from "zod";
import { json, apiFailure } from "@/lib/api-response";
import { findOriginalPracticeTest } from "@/data/original-practice-tests";
import { createClient } from "@/lib/supabase/server";

const contentSchema = z.object({ content: z.string().max(10_000) }).strict();

function isWritingPractice(slug: string) {
  return findOriginalPracticeTest(slug)?.skill === "writing";
}

async function authenticatedDraftContext(slug: string) {
  if (!isWritingPractice(slug)) return { error: json({ error: "Không tìm thấy bài Writing hợp lệ." }, 404) };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return { error: json({ error: "Bạn cần đăng nhập để lưu bài viết." }, 401) };
  return { supabase, userId };
}

export async function GET(_request: Request, context: RouteContext<"/api/practice/drafts/[slug]">) {
  try {
    const { slug } = await context.params;
    const draftContext = await authenticatedDraftContext(slug);
    if ("error" in draftContext) return draftContext.error;

    const { data, error } = await draftContext.supabase
      .from("practice_drafts")
      .select("content, updated_at")
      .eq("user_id", draftContext.userId)
      .eq("resource_slug", slug)
      .maybeSingle();
    if (error) throw error;
    return json({ draft: data ?? null });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PUT(request: Request, context: RouteContext<"/api/practice/drafts/[slug]">) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin) {
      return json({ error: "Yêu cầu không hợp lệ." }, 403);
    }

    const { slug } = await context.params;
    const draftContext = await authenticatedDraftContext(slug);
    if ("error" in draftContext) return draftContext.error;

    const parsed = contentSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Nội dung bài viết không hợp lệ." }, 400);

    const { data, error } = await draftContext.supabase
      .from("practice_drafts")
      .upsert(
        { user_id: draftContext.userId, resource_slug: slug, content: parsed.data.content },
        { onConflict: "user_id,resource_slug" },
      )
      .select("content, updated_at")
      .single();
    if (error) throw error;

    return json({ draft: data });
  } catch (error) {
    return apiFailure(error);
  }
}
