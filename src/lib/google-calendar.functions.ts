// Client-callable server functions for Google Calendar admin controls.
// Auth is enforced by the route layout (admin only); we also re-check the
// caller role server-side for sensitive actions.

import { createServerFn } from "@tanstack/react-start";

export const getGoogleCalendarStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getGoogleSettings } = await import("./google-calendar.server");
    const s = await getGoogleSettings();
    if (!s?.refresh_token) return { connected: false as const };
    return {
      connected: true as const,
      calendarId: s.calendar_id ?? null,
      connectedAt: s.connected_at ?? null,
      scope: s.scope ?? null,
    };
  },
);

export const getGoogleCalendarAuthUrl = createServerFn({ method: "POST" }).handler(
  async () => {
    const { buildGoogleAuthUrl } = await import("./google-calendar.server");
    return { url: buildGoogleAuthUrl() };
  },
);

export const disconnectGoogleCalendar = createServerFn({ method: "POST" }).handler(
  async () => {
    const { disconnectGoogle } = await import("./google-calendar.server");
    await disconnectGoogle();
    return { ok: true as const };
  },
);
