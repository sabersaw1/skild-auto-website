// Safe diagnostic for the Google OAuth configuration.
// Returns only redacted / structural info — never the client secret or refresh token.
// Hit this in a browser to verify what the server is actually sending to Google.

import { createFileRoute } from "@tanstack/react-router";

function redact(v: string | undefined | null, keep = 6) {
  if (!v) return null;
  if (v.length <= keep + 4) return `${v.slice(0, 2)}…(${v.length})`;
  return `${v.slice(0, keep)}…${v.slice(-4)} (len=${v.length})`;
}

export const Route = createFileRoute("/api/public/google/diagnose")({
  server: {
    handlers: {
      GET: async () => {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI;
        const calendarId = process.env.GOOGLE_CALENDAR_ID;

        const cidLooksValid =
          !!clientId &&
          /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/i.test(clientId.trim());

        const redirectTrimmed = redirectUri?.trim();
        const redirectHasWhitespace = !!redirectUri && redirectUri !== redirectTrimmed;
        const redirectIsHttps = !!redirectTrimmed && redirectTrimmed.startsWith("https://");
        const redirectPath = redirectTrimmed
          ? (() => {
              try {
                const u = new URL(redirectTrimmed);
                return { origin: u.origin, pathname: u.pathname };
              } catch {
                return { origin: null, pathname: null, parseError: true };
              }
            })()
          : null;

        const expectedPath = "/api/public/google/oauth-callback";
        let businessSettingsCheck:
          | { reachable: true; tableExists: true }
          | { reachable: false; tableExists: false; error: string; code?: string; hint?: string | null };
        let appointmentsCheck:
          | { reachable: true; tableExists: true }
          | { reachable: false; tableExists: false; error: string; code?: string };
        let browserSupabaseUrl: string | null = null;
        const serverSupabaseUrl = process.env.SKILD_SUPABASE_URL?.trim() ?? null;
        const serviceRoleKey = process.env.SKILD_SUPABASE_SERVICE_ROLE_KEY ?? null;
        try {
          const mod = await import("@/lib/skild-supabase");
          browserSupabaseUrl = mod.SKILD_SUPABASE_URL;
          const { getSkildAdmin } = await import("@/lib/skild-supabase.server");
          const sb = getSkildAdmin();
          const { error } = await sb.from("business_settings").select("key").limit(1);
          businessSettingsCheck = error
            ? { reachable: false, tableExists: false, error: error.message, code: error.code, hint: error.hint }
            : { reachable: true, tableExists: true };
          const { error: aptErr } = await sb.from("appointments").select("id").limit(1);
          appointmentsCheck = aptErr
            ? { reachable: false, tableExists: false, error: aptErr.message, code: aptErr.code }
            : { reachable: true, tableExists: true };
        } catch (err) {
          businessSettingsCheck = {
            reachable: false,
            tableExists: false,
            error: err instanceof Error ? err.message : String(err),
          };
          appointmentsCheck = {
            reachable: false,
            tableExists: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }

        // Build the same authorize URL the app uses, with a fake state, so we
        // can inspect exactly what gets sent to Google.
        const params = new URLSearchParams({
          client_id: clientId ?? "",
          redirect_uri: redirectTrimmed ?? "",
          response_type: "code",
          access_type: "offline",
          prompt: "consent",
          include_granted_scopes: "true",
          scope: "https://www.googleapis.com/auth/calendar.events",
          state: "DIAGNOSTIC",
        });
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

        const body = {
          ok: true,
          env: {
            GOOGLE_CLIENT_ID: {
              present: !!clientId,
              redacted: redact(clientId, 12),
              looksLikeGoogleClientId: cidLooksValid,
            },
            GOOGLE_CLIENT_SECRET: {
              present: !!clientSecret,
              redacted: redact(clientSecret, 6),
            },
            GOOGLE_REDIRECT_URI: {
              present: !!redirectUri,
              raw: redirectUri ?? null,
              trimmed: redirectTrimmed ?? null,
              hadWhitespace: redirectHasWhitespace,
              isHttps: redirectIsHttps,
              parsed: redirectPath,
              pathMatchesApp: redirectPath?.pathname === expectedPath,
              expectedPath,
            },
            GOOGLE_CALENDAR_ID: {
              present: !!calendarId,
              redacted: redact(calendarId, 8),
            },
          },
          authorize_url_preview: {
            // Same URL the Connect button sends the admin to (minus the live state nonce).
            url: authUrl,
            params: {
              client_id: redact(clientId, 12),
              redirect_uri: redirectTrimmed ?? null,
              response_type: "code",
              access_type: "offline",
              prompt: "consent",
              include_granted_scopes: "true",
              scope: "https://www.googleapis.com/auth/calendar.events",
            },
          },
          checks: {
            client_id_present: !!clientId,
            client_id_format_ok: cidLooksValid,
            client_secret_present: !!clientSecret,
            redirect_uri_present: !!redirectUri,
            redirect_uri_no_whitespace: !redirectHasWhitespace,
            redirect_uri_is_https: redirectIsHttps,
            redirect_uri_path_matches_app: redirectPath?.pathname === expectedPath,
            business_settings_table_exists: businessSettingsCheck.tableExists,
          },
          supabase: {
            url_in_use: supabaseUrlInUse,
            project_ref: supabaseUrlInUse
              ? supabaseUrlInUse.replace("https://", "").split(".")[0]
              : null,
          },
          storage: {
            business_settings: businessSettingsCheck,
          },
          notes: [
            "If Google shows 403 'access_denied' on the consent screen: the signed-in Google account is NOT on the OAuth consent screen → Test users list (while the app is in Testing).",
            "If Google shows 'Error 400: redirect_uri_mismatch': the GOOGLE_REDIRECT_URI above must match an Authorized redirect URI in the Google Cloud Console OAuth client EXACTLY (scheme, host, path, no trailing slash).",
            "If checks.client_id_format_ok is false: GOOGLE_CLIENT_ID is wrong — it must end with .apps.googleusercontent.com.",
            "If redirect_uri_path_matches_app is false: GOOGLE_REDIRECT_URI must end with /api/public/google/oauth-callback for this app's callback route to receive the code.",
          ],
        };

        return new Response(JSON.stringify(body, null, 2), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
