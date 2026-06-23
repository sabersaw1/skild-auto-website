// Skild Auto — browser-side Supabase client.
//
// Uses the project's publishable (anon) key only. Safe to ship in the
// repo and Vercel build. Service-role keys must NEVER live here.
//
// Override at deploy time with:
//   VITE_SKILD_SUPABASE_URL
//   VITE_SKILD_SUPABASE_PUBLISHABLE_KEY
//
// Designed to stay portable across:
//   - GitHub repo
//   - Vercel hosting
//   - Neon database (future customer records)
//   - Skild OS (future AI layer)

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  import.meta.env.VITE_SKILD_SUPABASE_URL ??
  "https://xukkcixylfasoerjnkra.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SKILD_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_1j_fdwCdPM-y1d2T7WJDjA_ciiqaEne";

export const SKILD_QUOTE_BUCKET = "quote-photos";

/** Endpoint that triggers the customer-quote notification email. */
export const SKILD_QUOTE_NOTIFY_URL = `${SUPABASE_URL}/functions/v1/send-quote-notification`;

export const skildSupabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const skildSupabaseAnonKey = SUPABASE_PUBLISHABLE_KEY;
