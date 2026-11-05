import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const login = () => NextResponse.redirect(new URL("/login", request.url));
  if (!url || !key) return login();

  const supabase = createServerClient(url, key, {
    cookieOptions: { httpOnly: true },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data, error } = await supabase.auth.getClaims();
  if (data?.claims.sub) return response;
  if (error?.status === 401) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    if (refreshed.session) return response;
  }
  const redirect = login();
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: [
    "/profile",
    "/dashboard",
    "/onboarding/:path*",
    "/settings/:path*",
    "/writing/:path*",
  ],
};
