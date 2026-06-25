// Browser-safe Supabase client for the Skild Auto site.
// Uses the publishable (anon) key only — safe to ship to the browser.
// RLS on the Supabase project is the source of truth for what this client can do.

import { createClient } from "@supabase/supabase-js";

export const SKILD_SUPABASE_URL = "https://xukkcixylfasoerjnkra.supabase.co";
export const SKILD_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_1j_fdwCdPM-y1d2T7WJDjA_ciiqaEne";

export const skildSupabase = createClient(
  SKILD_SUPABASE_URL,
  SKILD_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: "skild-auto-auth",
    },
  },
);
