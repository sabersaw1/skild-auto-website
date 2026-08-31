// Server-only Google Calendar helpers for Skild Auto OS.
// Uses OAuth 2.0 refresh token stored in Supabase `business_settings`.
// All API calls happen server-side; tokens never leave the server.

import { createHmac, timingSafeEqual } from "crypto";
import { getSkildAdmin } from "./skild-supabase.server";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CAL_BASE = "https://www.googleapis.com/calendar/v3";
const OAUTH_STATE_TTL_MS = 10 * 60_000;

export type GoogleSettings = {
  refresh_token: string;
  calendar_id?: string | null;
  scope?: string;
  connected_at?: string;
  access_token?: string;
  access_token_expires_at?: string;
  /** Set when Google rejected the stored refresh token (revoked/expired).
   *  Presence means the shop must re-authorize; we keep the row for history. */
  invalid_grant_at?: string | null;
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

export const GOOGLE_CALLBACK_PATH = "/api/public/google/oauth-callback";

/**
 * Single source of truth for the OAuth redirect URI.
 *
 * The authorize request and the token exchange MUST send byte-identical
 * values. Deriving both from the origin the admin is actually browsing keeps
 * them in sync across the production domain (apex or www), the Vercel
 * deployment URL and the Lovable preview, instead of depending on one
 * hardcoded GOOGLE_REDIRECT_URI that only matches a single host.
 */
export function resolveGoogleRedirectUri(requestUrl?: string | null): string {
  if (requestUrl) {
    try {
      return new URL(GOOGLE_CALLBACK_PATH, new URL(requestUrl).origin).toString();
    } catch {
      /* fall through to env */
    }
  }
  const fromEnv = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (!fromEnv) throw new Error("GOOGLE_REDIRECT_URI not configured");
  return fromEnv;
}

export function buildGoogleAuthUrl(state?: string, requestUrl?: string | null): string {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID not configured");
  }
  const redirectUri = resolveGoogleRedirectUri(requestUrl);

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
  console.log("[google-oauth] authorize url built", {
    client_id_tail: clientId.slice(-32),
    redirect_uri: redirectUri,
    scope: "calendar.events",
    has_state: !!state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function getOauthStateSecret() {
  const secret = process.env.GOOGLE_CLIENT_SECRET?.trim() || process.env.SKILD_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) throw new Error("GOOGLE_CLIENT_SECRET is required to sign OAuth state");
  return secret;
}

function signOauthStatePayload(payload: string) {
  const signature = createHmac("sha256", getOauthStateSecret()).update(payload).digest("base64");
  return signature.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64url(v: string) {
  return Buffer.from(v, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function unb64url(v: string) {
  return Buffer.from(v.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

/**
 * Signed, stateless CSRF token. When a redirect URI is supplied it is embedded
 * (v2) so the token exchange reuses the EXACT redirect_uri sent to Google, even
 * if the callback lands on a different host (e.g. apex -> www redirect).
 */
export function createOauthState(redirectUri?: string): string {
  const issuedAt = Date.now().toString(36);
  const nonce = globalThis.crypto.randomUUID().replace(/-/g, "");
  const payload = redirectUri
    ? `v2.${issuedAt}.${nonce}.${b64url(redirectUri)}`
    : `v1.${issuedAt}.${nonce}`;
  return `${payload}.${signOauthStatePayload(payload)}`;
}


/** Persist a one-time OAuth state token (CSRF protection). 10-minute window. */
export async function saveOauthState(state: string) {
  const sb = getSkildAdmin();
  const { error } = await sb
    .from("business_settings")
    .upsert(
      {
        key: "google_oauth_state",
        value: { state, created_at: new Date().toISOString() },
      },
      { onConflict: "key" },
    );
  if (error) {
    console.error("[google-oauth] state save failed", error);
    throw new Error(`Google OAuth state save failed: ${error.message}`);
  }
}

export type OAuthStateConsumeResult =
  | { valid: true; ageMs: number | null }
  | { valid: false; reason: "missing_callback_state" | "missing_saved_state" | "state_mismatch" | "state_expired" | "state_lookup_failed" | "state_delete_failed"; ageMs?: number | null; details?: string };

/** Consume and validate a one-time OAuth state token. Returns true if valid. */
export async function consumeOauthStateDetailed(state: string | null): Promise<OAuthStateConsumeResult> {
  if (!state) return { valid: false, reason: "missing_callback_state" };

  const parts = state.split(".");
  if (parts.length === 4 && parts[0] === "v1") {
    const issuedAt = Number.parseInt(parts[1], 36);
    const ageMs = Number.isFinite(issuedAt) ? Date.now() - issuedAt : null;
    if (ageMs === null || ageMs < 0) return { valid: false, reason: "state_mismatch", ageMs };
    if (ageMs > OAUTH_STATE_TTL_MS) return { valid: false, reason: "state_expired", ageMs };

    const payload = parts.slice(0, 3).join(".");
    const expected = Buffer.from(signOauthStatePayload(payload));
    const received = Buffer.from(parts[3]);
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      return { valid: false, reason: "state_mismatch", ageMs };
    }
    return { valid: true, ageMs };
  }

  const sb = getSkildAdmin();
  const { data, error } = await sb
    .from("business_settings")
    .select("value")
    .eq("key", "google_oauth_state")
    .maybeSingle();
  if (error) {
    console.error("[google-oauth] state lookup failed", error);
    return { valid: false, reason: "state_lookup_failed", details: error.message };
  }

  const v = data?.value as { state?: string; created_at?: string } | undefined;
  const ageMs = v?.created_at ? Date.now() - new Date(v.created_at).getTime() : null;

  if (!v?.state) return { valid: false, reason: "missing_saved_state", ageMs };
  if (v.state !== state) return { valid: false, reason: "state_mismatch", ageMs };
  if (ageMs !== null && ageMs > OAUTH_STATE_TTL_MS) {
    const { error: deleteError } = await sb.from("business_settings").delete().eq("key", "google_oauth_state");
    if (deleteError) console.error("[google-oauth] expired state delete failed", deleteError);
    return { valid: false, reason: "state_expired", ageMs };
  }

  const { error: deleteError } = await sb.from("business_settings").delete().eq("key", "google_oauth_state");
  if (deleteError) {
    console.error("[google-oauth] state delete failed", deleteError);
    return { valid: false, reason: "state_delete_failed", ageMs, details: deleteError.message };
  }
  return { valid: true, ageMs };
}

/** Consume and validate a one-time OAuth state token. Returns true if valid. */
export async function consumeOauthState(state: string | null): Promise<boolean> {
  return (await consumeOauthStateDetailed(state)).valid;
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
    if (data.error === "invalid_grant") {
      // Refresh token was revoked or expired — flag it so the admin UI shows
      // "Not connected" instead of falsely reporting a working connection.
      await saveGoogleSettings({ invalid_grant_at: new Date().toISOString() });
    }
    throw new Error(`Google token refresh failed: ${data.error || res.status}`);
  }
  const expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString();
  await saveGoogleSettings({
    access_token: data.access_token,
    access_token_expires_at: expiresAt,
    invalid_grant_at: null,
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
  return !!s?.refresh_token && !s.invalid_grant_at;
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
