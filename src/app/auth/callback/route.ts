import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { applicationOrigin, destination } from "@/features/auth/flow";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = applicationOrigin();
  const code = searchParams.get("code");

  if (code && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const path = await destination(supabase, data.user.id);
      return NextResponse.redirect(new URL(path, origin));
    }
  }
  return NextResponse.redirect(new URL("/login?authError=callback", origin));
}
