// Server-side admin authorization for protected server functions.
// The browser passes the current Supabase access token; we verify it with the
// publishable client (so RLS-safe getUser) and then check the `admin` role via
// the SECURITY DEFINER has_role RPC using the service-role client.

import { createClient } from "@supabase/supabase-js";
import { SKILD_SUPABASE_URL, SKILD_SUPABASE_PUBLISHABLE_KEY } from "./skild-supabase";
import { getSkildAdmin } from "./skild-supabase.server";

export async function requireSkildAdmin(accessToken: string | undefined | null): Promise<string> {
  if (!accessToken) throw new Error("Unauthorized");
  const anon = createClient(SKILD_SUPABASE_URL, SKILD_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: userRes, error } = await anon.auth.getUser(accessToken);
  if (error || !userRes.user) throw new Error("Unauthorized");
  const sb = getSkildAdmin();
  const { data: isAdmin, error: rErr } = await sb.rpc("has_role", {
    _user_id: userRes.user.id,
    _role: "admin",
  });
  if (rErr || isAdmin !== true) throw new Error("Forbidden");
  return userRes.user.id;
}
