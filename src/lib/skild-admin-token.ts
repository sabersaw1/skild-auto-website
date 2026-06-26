// Browser helper: returns the current Supabase access token for admin server fns.
import { skildSupabase } from "./skild-supabase";

export async function getAdminAccessToken(): Promise<string> {
  const { data } = await skildSupabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  return token;
}
