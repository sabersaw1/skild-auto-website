// Server-only Google Business Profile (GBP) review retrieval.
//
// Official, free path: the business owner authorizes ONE Google account that
// manages the Skild Auto Business Profile, and we read that location's own
// reviews with the Business Profile APIs. No Maps/Places billing involved.
//
// Requires (all server-side secrets, entirely separate from the Calendar
// OAuth client so that integration is never touched):
//   GBP_CLIENT_ID
//   GBP_CLIENT_SECRET
//   GBP_REFRESH_TOKEN     — offline token with scope
//                           https://www.googleapis.com/auth/business.manage
// Optional:
//   GBP_ACCOUNT_ID        — "accounts/123..."   (auto-resolved + cached)
//   GBP_LOCATION_ID       — "locations/456..."  (auto-resolved + cached)
//
// Access to the Business Profile APIs must be approved by Google for the
// Cloud project first (see docs/google-business-profile-reviews.md).

import { getSkildAdmin } from "./skild-supabase.server";

const ACCOUNT_MGMT = "https://mybusinessaccountmanagement.googleapis.com/v1";
const BUSINESS_INFO = "https://mybusinessbusinessinformation.googleapis.com/v1";
const LEGACY_V4 = "https://mybusiness.googleapis.com/v4";
const SETTINGS_KEY = "gbp_reviews";

export type GbpSettings = {
  account_name?: string | null;
  location_name?: string | null;
  last_synced_at?: string | null;
  last_error?: string | null;
};

export function hasGbpCredentials() {
  return !!(
    process.env.GBP_CLIENT_ID?.trim() &&
    process.env.GBP_CLIENT_SECRET?.trim() &&
    process.env.GBP_REFRESH_TOKEN?.trim()
  );
}

export async function getGbpSettings(): Promise<GbpSettings> {
  const sb = getSkildAdmin();
  const { data } = await sb
    .from("business_settings")
    .select("value")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();
  return (data?.value as GbpSettings) ?? {};
}

async function saveGbpSettings(patch: Partial<GbpSettings>) {
  const sb = getSkildAdmin();
  const current = await getGbpSettings();
  await sb
    .from("business_settings")
    .upsert({ key: SETTINGS_KEY, value: { ...current, ...patch } }, { onConflict: "key" });
}

async function accessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GBP_CLIENT_ID!.trim(),
      client_secret: process.env.GBP_CLIENT_SECRET!.trim(),
      refresh_token: process.env.GBP_REFRESH_TOKEN!.trim(),
      grant_type: "refresh_token",
    }),
  });
  const json = (await res.json()) as { access_token?: string; error?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(`GBP token refresh failed: ${json.error ?? res.status}`);
  }
  return json.access_token;
}

async function resolveTarget(token: string) {
  const envAccount = process.env.GBP_ACCOUNT_ID?.trim();
  const envLocation = process.env.GBP_LOCATION_ID?.trim();
  const stored = await getGbpSettings();

  let account = envAccount || stored.account_name || null;
  let location = envLocation || stored.location_name || null;
  if (account && location) return { account, location };

  const auth = { Authorization: `Bearer ${token}` };

  if (!account) {
    const r = await fetch(`${ACCOUNT_MGMT}/accounts`, { headers: auth });
    if (!r.ok) throw new Error(`accounts.list ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const j = (await r.json()) as { accounts?: { name?: string }[] };
    account = j.accounts?.[0]?.name ?? null;
  }
  if (!account) throw new Error("No Business Profile account is reachable with this token.");

  if (!location) {
    const url = `${BUSINESS_INFO}/${account}/locations?readMask=name,title&pageSize=100`;
    const r = await fetch(url, { headers: auth });
    if (!r.ok) throw new Error(`locations.list ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const j = (await r.json()) as { locations?: { name?: string }[] };
    location = j.locations?.[0]?.name ?? null;
  }
  if (!location) throw new Error("No location found on this Business Profile account.");

  await saveGbpSettings({ account_name: account, location_name: location });
  return { account, location };
}

type GbpReview = {
  reviewId?: string;
  reviewer?: { displayName?: string; profilePhotoUrl?: string };
  starRating?: string;
  comment?: string;
  createTime?: string;
  updateTime?: string;
};

const STAR: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

/**
 * Pulls all reviews for the authorized Skild Auto location and upserts them
 * into the existing `google_reviews` cache (same shape the Reviews page reads).
 */
export async function syncGbpReviews() {
  if (!hasGbpCredentials()) {
    return {
      ok: false as const,
      reason: "missing_credentials" as const,
      message:
        "Business Profile credentials are not configured (GBP_CLIENT_ID / GBP_CLIENT_SECRET / GBP_REFRESH_TOKEN).",
    };
  }

  try {
    const token = await accessToken();
    const { account, location } = await resolveTarget(token);
    const locId = location.split("/").pop();

    const all: GbpReview[] = [];
    let pageToken: string | undefined;
    do {
      const url = new URL(`${LEGACY_V4}/${account}/locations/${locId}/reviews`);
      url.searchParams.set("pageSize", "50");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`reviews.list ${r.status}: ${(await r.text()).slice(0, 300)}`);
      const j = (await r.json()) as { reviews?: GbpReview[]; nextPageToken?: string };
      all.push(...(j.reviews ?? []));
      pageToken = j.nextPageToken;
    } while (pageToken);

    const rows = all
      .filter((r) => r.reviewId)
      .map((r) => ({
        source: "google",
        google_review_id: r.reviewId!,
        location_id: location,
        reviewer_name: r.reviewer?.displayName ?? null,
        reviewer_photo_url: r.reviewer?.profilePhotoUrl ?? null,
        rating: r.starRating ? (STAR[r.starRating] ?? null) : null,
        comment: r.comment ?? null,
        review_created_at: r.createTime ?? null,
        review_updated_at: r.updateTime ?? r.createTime ?? null,
        synced_at: new Date().toISOString(),
      }));

    let upserted = 0;
    if (rows.length) {
      const sb = getSkildAdmin();
      const { error, count } = await sb
        .from("google_reviews")
        .upsert(rows, { onConflict: "source,google_review_id", count: "exact" });
      if (error) throw new Error(error.message);
      upserted = count ?? rows.length;
    }

    await saveGbpSettings({ last_synced_at: new Date().toISOString(), last_error: null });
    return { ok: true as const, source: "business_profile" as const, fetched: all.length, upserted, location };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await saveGbpSettings({ last_error: message }).catch(() => {});
    return { ok: false as const, reason: "api_error" as const, message };
  }
}
