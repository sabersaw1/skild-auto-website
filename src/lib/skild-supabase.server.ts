// Server-only admin Supabase client. Service-role key bypasses RLS — never
// import this from a component or a route loader. Use only inside
// createServerFn handlers or server route handlers (api/public/*).
//
// Required env:
//   SKILD_SUPABASE_SERVICE_ROLE_KEY  (stored via the secure secrets system)
//
// Public URL is shared with the browser client.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SKILD_SUPABASE_URL } from "./skild-supabase";

let cached: SupabaseClient | null = null;

export function getSkildAdmin(): SupabaseClient {
  if (cached) return cached;
  const key = process.env.SKILD_SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SKILD_SUPABASE_SERVICE_ROLE_KEY is not configured on the server.",
    );
  }
  cached = createClient(SKILD_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function hasSkildAdmin(): boolean {
  return !!process.env.SKILD_SUPABASE_SERVICE_ROLE_KEY;
}
