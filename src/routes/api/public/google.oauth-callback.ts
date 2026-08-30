// Google OAuth 2.0 callback for the Skild Auto OS Calendar integration.
// This is the redirect URI that must be registered in Google Cloud Console.
// It receives the authorization code from Google and exchanges it for a
// long-lived refresh token, which is stored server-side only.

import { createFileRoute } from "@tanstack/react-router";

const HTML_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
};

function escapeHtml(value: string | null | undefined) {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function failureResponse(
  title: string,
  status: number,
  details: Record<string, string | number | boolean | null | undefined>,
) {
  console.error("[google-oauth-callback] failure", { title, status, ...details });
  const rows = Object.entries(details)
    .map(([key, value]) => `<li><b>${escapeHtml(key)}:</b> ${escapeHtml(String(value ?? "(none)"))}</li>`)
    .join("");
  return new Response(
    `<h1>${escapeHtml(title)}</h1><p>Google Calendar connection did not complete.</p><ul>${rows}</ul><p>Return to <a href="/admin/settings">Schedule settings</a> and try connecting again.</p>`,
    { status, headers: HTML_HEADERS },
  );
}

function redirectToSettings(requestUrl: URL) {
  const location = new URL("/admin/settings", requestUrl.origin);
  location.searchParams.set("google_calendar_connected", "true");
  const href = location.toString();
  console.log("[google-oauth-callback] redirecting after success", { location: href });
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${escapeHtml(href)}"><title>Google Calendar Connected</title></head><body><h1>Google Calendar Connected</h1><p>Redirecting back to Skild Auto settings…</p><p><a href="${escapeHtml(href)}">Return to Schedule settings</a></p><script>window.location.replace(${JSON.stringify(href)});</script></body></html>`,
    {
      status: 200,
      headers: HTML_HEADERS,
    },
  );
}

function redirectFallback(requestUrl: URL) {
  const location = new URL("/admin/settings", requestUrl.origin);
  location.searchParams.set("google_calendar_connected", "true");
  return new Response(null, {
    status: 303,
    headers: {
      Location: location.toString(),
      "Cache-Control": "no-store",
    },
  });
}

export const Route = createFileRoute("/api/public/google/oauth-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");

        console.log("[google-oauth-callback] callback received", {
          callback_origin: url.origin,
          callback_path: url.pathname,
          code_present: !!code,
          state_present: !!state,
          error_present: !!error,
        });

        if (error) {
          const errorUri = url.searchParams.get("error_uri");
          const hint =
            error === "access_denied"
              ? "The Google account that approved the consent screen is not on the Test users list, OR the user declined. In Google Cloud Console open APIs & Services → OAuth consent screen and add this Google account under Test users (while the app is in Testing)."
              : error === "admin_policy_enforced"
                ? "A Google Workspace admin policy is blocking this OAuth client or the calendar.events scope."
                : error === "redirect_uri_mismatch"
                  ? "GOOGLE_REDIRECT_URI does not match an Authorized redirect URI on the OAuth client. They must match exactly (scheme, host, path, no trailing slash)."
                  : "See error_description for details.";
          return failureResponse("Google Calendar connection failed", 400, {
            step: "google_authorization",
            callback_received: true,
            error,
            error_description: errorDescription,
            error_uri: errorUri,
            state_present: !!state,
            next_step: hint,
          });
        }

        if (!code) {
          return failureResponse("Missing authorization code", 400, {
            step: "google_callback",
            callback_received: true,
            code_present: false,
            state_present: !!state,
            reason: "Google did not return a code parameter.",
          });
        }

        const { consumeOauthStateDetailed } = await import("@/lib/google-calendar.server");
        const stateResult = await consumeOauthStateDetailed(state);
        if (!stateResult.valid) {
          return failureResponse("Invalid OAuth state", 400, {
            step: "csrf_state_validation",
            callback_received: true,
            code_present: true,
            state_present: !!state,
            state_result: stateResult.reason,
            state_age_ms: stateResult.ageMs,
            details: stateResult.details,
          });
        }

        const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
        const calendarId = process.env.GOOGLE_CALENDAR_ID?.trim();
        // Same resolver used to build the authorize URL: derive from this
        // request's origin so the exchange matches byte-for-byte.
        const { resolveGoogleRedirectUri } = await import("@/lib/google-calendar.server");
        let redirectUri: string | undefined;
        try {
          redirectUri = resolveGoogleRedirectUri(request.url);
        } catch {
          redirectUri = undefined;
        }

        if (!clientId || !clientSecret || !redirectUri) {
          return failureResponse("Google Calendar is not configured", 500, {
            step: "server_configuration",
            client_id_present: !!clientId,
            client_secret_present: !!clientSecret,
            redirect_uri_present: !!redirectUri,
          });
        }


        try {
          console.log("[google-oauth-callback] exchanging code for tokens", {
            redirect_uri: redirectUri,
            state_age_ms: stateResult.ageMs,
          });
          const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "authorization_code",
              code,
              client_id: clientId,
              client_secret: clientSecret,
              redirect_uri: redirectUri,
            }).toString(),
          });

          const tokenText = await tokenRes.text();
          let tokenData: {
            access_token?: string;
            refresh_token?: string;
            expires_in?: number;
            scope?: string;
            error?: string;
            error_description?: string;
          };
          try {
            tokenData = JSON.parse(tokenText);
          } catch {
            return failureResponse("Token exchange returned invalid JSON", 500, {
              step: "google_token_exchange",
              token_status: tokenRes.status,
              token_response: tokenText.slice(0, 500),
            });
          }

          console.log("[google-oauth-callback] token exchange result", {
            ok: tokenRes.ok,
            status: tokenRes.status,
            access_token_present: !!tokenData.access_token,
            refresh_token_present: !!tokenData.refresh_token,
            expires_in: tokenData.expires_in ?? null,
            scope: tokenData.scope ?? null,
            error: tokenData.error ?? null,
          });

          if (!tokenRes.ok || tokenData.error || !tokenData.access_token) {
            return failureResponse("Token exchange failed", 500, {
              step: "google_token_exchange",
              token_status: tokenRes.status,
              google_error: tokenData.error,
              google_error_description: tokenData.error_description,
              access_token_present: !!tokenData.access_token,
              refresh_token_present: !!tokenData.refresh_token,
            });
          }

          if (!tokenData.refresh_token) {
            return failureResponse("No refresh token received", 500, {
              step: "google_token_exchange",
              access_token_present: true,
              refresh_token_present: false,
              access_type: "offline",
              prompt: "consent",
              reason: "Google returned an access token but no refresh token.",
            });
          }

          // Store the refresh token and calendar ID server-side in Supabase.
          // The frontend never sees these values.
          const { getSkildAdmin } = await import("@/lib/skild-supabase.server");
          const sb = getSkildAdmin();
          const expiresAt = new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000).toISOString();
          const { error: saveError } = await sb
            .from("business_settings")
            .upsert(
              {
                key: "google_calendar",
                value: {
                  refresh_token: tokenData.refresh_token,
                  access_token: tokenData.access_token,
                  access_token_expires_at: expiresAt,
                  calendar_id: calendarId || null,
                  scope: tokenData.scope,
                  connected_at: new Date().toISOString(),
                },
              },
              { onConflict: "key" },
            );
          if (saveError) {
            return failureResponse("Google token storage failed", 500, {
              step: "supabase_business_settings_save",
              database_error: saveError.message,
              database_code: saveError.code,
              database_hint: saveError.hint,
              refresh_token_present: true,
              next_step:
                saveError.code === "PGRST205"
                  ? "Apply docs/supabase/schema.sql in Supabase so public.business_settings exists, then reconnect Google Calendar."
                  : "Check Supabase service-role access and business_settings RLS/grants.",
            });
          }

          const { data: saved, error: verifyError } = await sb
            .from("business_settings")
            .select("value")
            .eq("key", "google_calendar")
            .maybeSingle();
          const savedValue = saved?.value as { refresh_token?: string; calendar_id?: string | null } | undefined;
          if (verifyError || !savedValue?.refresh_token) {
            return failureResponse("Google token storage verification failed", 500, {
              step: "supabase_business_settings_verify",
              database_error: verifyError?.message,
              refresh_token_saved: !!savedValue?.refresh_token,
            });
          }

          console.log("[google-oauth-callback] refresh token stored", {
            step: "complete",
            calendar_id_present: !!savedValue.calendar_id,
            scope: tokenData.scope ?? null,
            redirect_result: "/admin/settings?google_calendar_connected=true",
          });

          return redirectToSettings(url);
        } catch (err) {
          console.error("[google-oauth-callback] unexpected error", err);
          return failureResponse("Unexpected Google OAuth callback error", 500, {
            step: "unexpected_exception",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      },
    },
  },
});
