// Server-only Google Calendar helpers for Skild Auto OS.
// Uses OAuth 2.0 refresh token stored in Supabase `business_settings`.
// All API calls happen server-side; tokens never leave the server.

import { getSkildAdmin } from "./skild-supabase.server";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CAL_BASE = "https://www.googleapis.com/calendar/v3";

export type GoogleSettings = {
  refresh_token: string;
  calendar_id?: string | null;
  scope?: string;
  connected_at?: string;
  access_token?: string;
  access_token_expires_at?: string;
};

export async function getGoogleSettings(): Promise<GoogleSettings | null> {
  const sb = getSkildAdmin();
  const { data } = await sb
    .from("business_settings")
    .select("value")
    .eq("key", "google_calendar")
    .maybeSingle();
  if (!data?.value) return null;
  return data.value as GoogleSettings;
}

async function saveGoogleSettings(patch: Partial<GoogleSettings>) {
  const sb = getSkildAdmin();
  const current = (await getGoogleSettings()) ?? ({} as GoogleSettings);
  const merged = { ...current, ...patch };
  await sb
    .from("business_settings")
    .upsert({ key: "google_calendar", value: merged }, { onConflict: "key" });
}

export async function disconnectGoogle() {
  const sb = getSkildAdmin();
  await sb.from("business_settings").delete().eq("key", "google_calendar");
}

export function buildGoogleAuthUrl(state?: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    throw new Error("GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI not configured");
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: "https://www.googleapis.com/auth/calendar.events",
  });
  if (state) params.set("state", state);
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/** Persist a one-time OAuth state token (CSRF protection). 10-minute window. */
export async function saveOauthState(state: string) {
  const sb = getSkildAdmin();
  await sb
    .from("business_settings")
    .upsert(
      {
        key: "google_oauth_state",
        value: { state, created_at: new Date().toISOString() },
      },
      { onConflict: "key" },
    );
}

/** Consume and validate a one-time OAuth state token. Returns true if valid. */
export async function consumeOauthState(state: string | null): Promise<boolean> {
  if (!state) return false;
  const sb = getSkildAdmin();
  const { data } = await sb
    .from("business_settings")
    .select("value")
    .eq("key", "google_oauth_state")
    .maybeSingle();
  await sb.from("business_settings").delete().eq("key", "google_oauth_state");
  const v = data?.value as { state?: string; created_at?: string } | undefined;
  if (!v?.state || v.state !== state) return false;
  if (v.created_at && Date.now() - new Date(v.created_at).getTime() > 10 * 60_000) return false;
  return true;
}

async function getAccessToken(): Promise<{ token: string; calendarId: string } | null> {
  const settings = await getGoogleSettings();
  if (!settings?.refresh_token) return null;

  // Reuse cached access token if still valid (60s buffer).
  if (
    settings.access_token &&
    settings.access_token_expires_at &&
    new Date(settings.access_token_expires_at).getTime() - Date.now() > 60_000
  ) {
    return {
      token: settings.access_token,
      calendarId: settings.calendar_id || process.env.GOOGLE_CALENDAR_ID || "primary",
    };
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID/SECRET missing");
  }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: settings.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    console.error("[google-calendar] refresh failed", data);
    throw new Error(`Google token refresh failed: ${data.error || res.status}`);
  }
  const expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString();
  await saveGoogleSettings({
    access_token: data.access_token,
    access_token_expires_at: expiresAt,
  });
  return {
    token: data.access_token,
    calendarId: settings.calendar_id || process.env.GOOGLE_CALENDAR_ID || "primary",
  };
}

async function gcalFetch(path: string, init: RequestInit & { calendarId?: string } = {}) {
  const auth = await getAccessToken();
  if (!auth) throw new Error("Google Calendar not connected");
  const calendarId = init.calendarId || auth.calendarId;
  const url = `${CAL_BASE}/calendars/${encodeURIComponent(calendarId)}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  return res;
}

export async function isGoogleConnected(): Promise<boolean> {
  const s = await getGoogleSettings();
  return !!s?.refresh_token;
}

/** Returns busy intervals in [fromISO, toISO) from Google Calendar. Empty if not connected. */
export async function getGoogleBusy(
  fromISO: string,
  toISO: string,
): Promise<{ start: Date; end: Date }[]> {
  try {
    if (!(await isGoogleConnected())) return [];
    const auth = await getAccessToken();
    if (!auth) return [];
    const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin: fromISO,
        timeMax: toISO,
        items: [{ id: auth.calendarId }],
      }),
    });
    if (!res.ok) {
      console.error("[google-calendar] freeBusy failed", res.status, await res.text());
      return [];
    }
    const data = (await res.json()) as {
      calendars?: Record<string, { busy?: { start: string; end: string }[] }>;
    };
    const busy = data.calendars?.[auth.calendarId]?.busy ?? [];
    return busy.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
  } catch (err) {
    console.error("[google-calendar] getGoogleBusy error", err);
    return [];
  }
}

type EventInput = {
  summary: string;
  description?: string;
  startISO: string;
  endISO: string;
  location?: string;
  attendeeEmail?: string;
};

function buildEventBody(input: EventInput) {
  const body: Record<string, unknown> = {
    summary: input.summary,
    description: input.description,
    location: input.location,
    start: { dateTime: input.startISO, timeZone: "America/Denver" },
    end: { dateTime: input.endISO, timeZone: "America/Denver" },
    reminders: { useDefault: true },
  };
  if (input.attendeeEmail) {
    body.attendees = [{ email: input.attendeeEmail }];
  }
  return body;
}

export async function createGoogleEvent(input: EventInput): Promise<{
  eventId: string;
  htmlLink: string;
} | null> {
  try {
    if (!(await isGoogleConnected())) return null;
    const res = await gcalFetch(`/events`, {
      method: "POST",
      body: JSON.stringify(buildEventBody(input)),
    });
    if (!res.ok) {
      console.error("[google-calendar] createEvent failed", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { id: string; htmlLink: string };
    return { eventId: data.id, htmlLink: data.htmlLink };
  } catch (err) {
    console.error("[google-calendar] createEvent error", err);
    return null;
  }
}

export async function updateGoogleEvent(
  eventId: string,
  input: EventInput,
): Promise<boolean> {
  try {
    if (!(await isGoogleConnected())) return false;
    const res = await gcalFetch(`/events/${encodeURIComponent(eventId)}`, {
      method: "PATCH",
      body: JSON.stringify(buildEventBody(input)),
    });
    if (!res.ok) {
      console.error("[google-calendar] updateEvent failed", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[google-calendar] updateEvent error", err);
    return false;
  }
}

export async function deleteGoogleEvent(eventId: string): Promise<boolean> {
  try {
    if (!(await isGoogleConnected())) return false;
    const res = await gcalFetch(`/events/${encodeURIComponent(eventId)}`, {
      method: "DELETE",
    });
    // 410 Gone = already deleted; treat as success.
    if (!res.ok && res.status !== 410 && res.status !== 404) {
      console.error("[google-calendar] deleteEvent failed", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[google-calendar] deleteEvent error", err);
    return false;
  }
}
