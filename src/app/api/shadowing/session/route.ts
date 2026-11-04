import { shadowingUser } from "@/features/shadowing/session";

export async function GET() {
  try {
    return Response.json(
      { userId: await shadowingUser() },
      { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } },
    );
  } catch {
    return Response.json(
      { error: "Chưa xác minh được tài khoản. Hãy đăng nhập lại." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
