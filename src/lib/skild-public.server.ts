// Server-side publishable (anon) Supabase client for PUBLIC read-only data.
// RLS applies exactly as it does for an anonymous browser visitor.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getSkildPublicDb(): SupabaseClient {
  const url = process.env.SKILD_SUPABASE_URL?.trim();
  const key = process.env.SKILD_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) throw new Error("Supabase public config missing");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
