// Browser-safe Supabase client for the Skild Auto site.
// URL + publishable (anon) key are injected at build time from the
// SKILD_SUPABASE_URL and SKILD_SUPABASE_PUBLISHABLE_KEY secrets (see vite.config.ts).
// Never put the service-role key here — that lives only in server-only code.

import { createClient } from "@supabase/supabase-js";

declare const __SKILD_SUPABASE_URL__: string;
declare const __SKILD_SUPABASE_PUBLISHABLE_KEY__: string;

export const SKILD_SUPABASE_URL: string = __SKILD_SUPABASE_URL__;
export const SKILD_SUPABASE_PUBLISHABLE_KEY: string = __SKILD_SUPABASE_PUBLISHABLE_KEY__;

export const skildSupabase = createClient(SKILD_SUPABASE_URL, SKILD_SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "skild-auto-auth",
  },
});
