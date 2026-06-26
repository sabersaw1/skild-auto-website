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
    if (!s?.refresh_token) return { connected: false as const };
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
    const { buildGoogleAuthUrl, saveOauthState } = await import("./google-calendar.server");
    const state = crypto.randomUUID().replace(/-/g, "");
    await saveOauthState(state);
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
