import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

export async function supabaseServer() {
  const store = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const restUrl = `${url.replace(/\/+$/, "")}/rest/v1/`;
  const client: SupabaseClient = createServerClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll(values) {
          try {
            values.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            // Server Components receive refreshed cookies from the proxy.
          }
        },
      },
      cookieOptions: { httpOnly: true },
      global: {
        async fetch(input, init) {
          const response = await fetch(input, init);
          // Only retry PostgREST calls. Refreshing an Auth request would recurse.
          if (response.status !== 401 || typeof input !== "string" || !input.startsWith(restUrl)) {
            return response;
          }
          const { data } = await client.auth.refreshSession();
          if (!data.session) return response;
          const headers = new Headers(init?.headers);
          headers.set("Authorization", `Bearer ${data.session.access_token}`);
          return fetch(input, { ...init, headers });
        },
      },
    },
  );
  return client;
}

/** Compatibility helper used by Route Handlers that need the authenticated server client. */
export async function createClient() {
  return supabaseServer();
}

export async function authenticatedClient() {
  await connection();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    redirect("/login");
  }
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) redirect("/login");
  return { supabase, userId: data.claims.sub };
}

