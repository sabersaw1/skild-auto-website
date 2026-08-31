// Client-callable server functions for Google Calendar admin controls.
// All sensitive actions require an admin Supabase session (access token
// passed from the browser and verified server-side via has_role).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TokenInput = z.object({ accessToken: z.string().min(20) });

export const getGoogleCalendarStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { accessToken: string }) => TokenInput.parse(d))
  .handler(async ({ data }) => {
    const { requireSkildAdmin } = await import("./admin-guard.server");
    await requireSkildAdmin(data.accessToken);
    const { getGoogleSettings } = await import("./google-calendar.server");
    const s = await getGoogleSettings();
    // A revoked/expired refresh token is not a working connection.
    if (!s?.refresh_token || s.invalid_grant_at) return { connected: false as const };
    return {
      connected: true as const,
      calendarId: s.calendar_id ?? null,
      connectedAt: s.connected_at ?? null,
      scope: s.scope ?? null,
    };
  });

export const getGoogleCalendarAuthUrl = createServerFn({ method: "POST" })
  .inputValidator((d: { accessToken: string }) => TokenInput.parse(d))
  .handler(async ({ data }) => {
    const { requireSkildAdmin } = await import("./admin-guard.server");
    await requireSkildAdmin(data.accessToken);
    const { getRequest } = await import("@tanstack/react-start/server");
    const { buildGoogleAuthUrl, createOauthState, resolveGoogleRedirectUri } = await import(
      "./google-calendar.server"
    );
    // Derive the callback from the host the admin is actually on so the
    // authorize request and the token exchange always agree.
    let requestUrl: string | null = null;
    try {
      requestUrl = getRequest()?.url ?? null;
    } catch {
      requestUrl = null;
    }
    const redirectUri = resolveGoogleRedirectUri(requestUrl);
    // Embed the exact redirect_uri in the signed state: apex -> www redirects
    // would otherwise change the origin before the token exchange.
    const state = createOauthState(redirectUri);
    return { url: buildGoogleAuthUrl(state, requestUrl) };

  });


export const disconnectGoogleCalendar = createServerFn({ method: "POST" })
  .inputValidator((d: { accessToken: string }) => TokenInput.parse(d))
  .handler(async ({ data }) => {
    const { requireSkildAdmin } = await import("./admin-guard.server");
    await requireSkildAdmin(data.accessToken);
    const { disconnectGoogle } = await import("./google-calendar.server");
    await disconnectGoogle();
    return { ok: true as const };
  });
