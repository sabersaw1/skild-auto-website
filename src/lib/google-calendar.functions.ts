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
    const { buildGoogleAuthUrl, createOauthState } = await import("./google-calendar.server");
    const state = createOauthState();
    return { url: buildGoogleAuthUrl(state) };
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
