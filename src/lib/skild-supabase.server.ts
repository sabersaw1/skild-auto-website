// Server-only admin Supabase client. Service-role key bypasses RLS — never
// import this from a component or a route loader. Use only inside
// createServerFn handlers or server route handlers (api/public/*).
//
// Required env (read at runtime so newly-added runtime secrets take effect
// without a rebuild):
//   SKILD_SUPABASE_URL
//   SKILD_SUPABASE_SERVICE_ROLE_KEY

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;
let cachedKeyFingerprint: string | null = null;

function currentFingerprint() {
  const url = process.env.SKILD_SUPABASE_URL ?? "";
  const key = process.env.SKILD_SUPABASE_SERVICE_ROLE_KEY ?? "";
  return `${url}::${key.length}::${key.slice(-6)}`;
}

export function getSkildAdmin(): SupabaseClient {
  const url = process.env.SKILD_SUPABASE_URL?.trim();
  const key = process.env.SKILD_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url) {
    throw new Error("SKILD_SUPABASE_URL is not configured on the server.");
  }
  if (!key) {
    throw new Error("SKILD_SUPABASE_SERVICE_ROLE_KEY is not configured on the server.");
  }
  const fp = currentFingerprint();
  if (cached && cachedKeyFingerprint === fp) return cached;
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  cachedKeyFingerprint = fp;
  return cached;
}

export function hasSkildAdmin(): boolean {
  return !!process.env.SKILD_SUPABASE_URL && !!process.env.SKILD_SUPABASE_SERVICE_ROLE_KEY;
}
