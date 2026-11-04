import { apiFailure, json } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  try {
    const { attemptId } = await params;
    if (!UUID.test(attemptId)) return json({ error: "Kết quả không hợp lệ." }, 400);
    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user)
      return json({ error: "Bạn cần đăng nhập để xem kết quả." }, 401);
    const { data, error } = await supabase
      .from("practice_attempts")
      .select("result_snapshot")
      .eq("id", attemptId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return json({ error: "Không tìm thấy kết quả của bạn." }, 404);
    return Response.json(data.result_snapshot, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiFailure(error);
  }
}
