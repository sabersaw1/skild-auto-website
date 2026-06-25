// Google OAuth 2.0 callback for the Skild Auto OS Calendar integration.
// This is the redirect URI that must be registered in Google Cloud Console.
// It receives the authorization code from Google and exchanges it for a
// long-lived refresh token, which is stored server-side only.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/google/oauth-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");

        if (error) {
          return new Response(
            `<h1>Google Calendar connection failed</h1><p>${error}${errorDescription ? `: ${errorDescription}` : ""}</p>`,
            { status: 400, headers: { "Content-Type": "text/html" } },
          );
        }

        if (!code) {
          return new Response(
            `<h1>Missing authorization code</h1><p>Google did not return an authorization code.</p>`,
            { status: 400, headers: { "Content-Type": "text/html" } },
          );
        }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI;
        const calendarId = process.env.GOOGLE_CALENDAR_ID;

        if (!clientId || !clientSecret || !redirectUri) {
          return new Response(
            `<h1>Google Calendar is not configured</h1><p>GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REDIRECT_URI is missing on the server.</p>`,
            { status: 500, headers: { "Content-Type": "text/html" } },
          );
        }

        try {
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

          const tokenData = (await tokenRes.json()) as {
            access_token?: string;
            refresh_token?: string;
            expires_in?: number;
            scope?: string;
            error?: string;
            error_description?: string;
          };

          if (!tokenRes.ok || tokenData.error) {
            console.error("[google-oauth-callback] token exchange failed", tokenData);
            return new Response(
              `<h1>Token exchange failed</h1><p>${tokenData.error || "unknown"}: ${tokenData.error_description || ""}</p>`,
              { status: 500, headers: { "Content-Type": "text/html" } },
            );
          }

          if (!tokenData.refresh_token) {
            return new Response(
              `<h1>No refresh token received</h1><p>Google returned an access token but no refresh token. Re-authorize and make sure to include <code>access_type=offline</code> and <code>prompt=consent</code> in the authorization URL.</p>`,
              { status: 500, headers: { "Content-Type": "text/html" } },
            );
          }

          // Store the refresh token and calendar ID server-side in Supabase.
          // The frontend never sees these values.
          const { getSkildAdmin } = await import("@/lib/skild-supabase.server");
          const sb = getSkildAdmin();
          await sb
            .from("business_settings")
            .upsert(
              {
                key: "google_calendar",
                value: {
                  refresh_token: tokenData.refresh_token,
                  calendar_id: calendarId || null,
                  scope: tokenData.scope,
                  connected_at: new Date().toISOString(),
                },
              },
              { onConflict: "key" },
            );

          return new Response(
            `<h1>Google Calendar connected</h1><p>Refresh token stored server-side. You can close this tab and return to the admin dashboard.</p>`,
            { status: 200, headers: { "Content-Type": "text/html" } },
          );
        } catch (err) {
          console.error("[google-oauth-callback] unexpected error", err);
          return new Response(
            `<h1>Unexpected error</h1><p>Could not complete Google Calendar connection. Check server logs.</p>`,
            { status: 500, headers: { "Content-Type": "text/html" } },
          );
        }
      },
    },
  },
});
