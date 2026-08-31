// Server-only Google review retrieval + cache.
//
// Source: Google Places API (New) — places.googleapis.com/v1/places/{PLACE_ID}
// which returns the location's real published reviews. Credentials never
// reach the browser.
//
// Required env:
//   GOOGLE_PLACES_API_KEY  — API key with "Places API (New)" enabled
// Optional env:
//   GOOGLE_PLACE_ID        — the Skild Auto place id; when absent we resolve it
//                            once via Text Search and cache it in
//                            business_settings ("google_reviews").
//
// This is intentionally separate from the Google Calendar OAuth client:
// the Calendar refresh token/scopes are untouched.

import { getSkildAdmin } from "./skild-supabase.server";
import { BUSINESS } from "./business";

const PLACES_BASE = "https://places.googleapis.com/v1";
const SETTINGS_KEY = "google_reviews";

export type ReviewSettings = {
  place_id?: string | null;
  last_synced_at?: string | null;
  last_error?: string | null;
  rating?: number | null;
  user_rating_count?: number | null;
};

export type SyncResult = {
  ok: boolean;
  reason?: "missing_api_key" | "place_not_found" | "api_error";
  message?: string;
  placeId?: string | null;
  fetched?: number;
  upserted?: number;
  rating?: number | null;
  userRatingCount?: number | null;
};

export function hasPlacesKey() {
  return !!process.env.GOOGLE_PLACES_API_KEY?.trim();
}

export async function getReviewSettings(): Promise<ReviewSettings> {
  const sb = getSkildAdmin();
  const { data } = await sb
    .from("business_settings")
    .select("value")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();
  return (data?.value as ReviewSettings) ?? {};
}

async function saveReviewSettings(patch: Partial<ReviewSettings>) {
  const sb = getSkildAdmin();
  const current = await getReviewSettings();
  await sb
    .from("business_settings")
    .upsert(
      { key: SETTINGS_KEY, value: { ...current, ...patch } },
      { onConflict: "key" },
    );
}

async function resolvePlaceId(apiKey: string): Promise<string | null> {
  const fromEnv = process.env.GOOGLE_PLACE_ID?.trim();
  if (fromEnv) return fromEnv;
  const stored = (await getReviewSettings()).place_id;
  if (stored) return stored;

  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
    },
    body: JSON.stringify({
      textQuery: `${BUSINESS.name} ${BUSINESS.city}`,
      maxResultCount: 1,
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { places?: { id?: string }[] };
  const id = json.places?.[0]?.id ?? null;
  if (id) await saveReviewSettings({ place_id: id });
  return id;
}

type PlaceReview = {
  name?: string;
  rating?: number;
  text?: { text?: string };
  originalText?: { text?: string };
  authorAttribution?: { displayName?: string; photoUri?: string };
  publishTime?: string;
  relativePublishTimeDescription?: string;
};

/**
 * Pulls the location's real reviews from Google and upserts them into the
 * `google_reviews` cache. Unique on (source, google_review_id), so repeated
 * syncs never duplicate a review.
 */
export async function syncGoogleReviews(): Promise<SyncResult> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      reason: "missing_api_key",
      message:
        "GOOGLE_PLACES_API_KEY is not configured. Enable the Places API (New) in Google Cloud and add the key as a server secret.",
    };
  }

  const placeId = await resolvePlaceId(apiKey);
  if (!placeId) {
    return {
      ok: false,
      reason: "place_not_found",
      message:
        "Could not resolve the Skild Auto Google place id. Set GOOGLE_PLACE_ID to the Business Profile place id.",
    };
  }

  const res = await fetch(`${PLACES_BASE}/places/${encodeURIComponent(placeId)}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "id,rating,userRatingCount,reviews",
    },
  });
  if (!res.ok) {
    const message = await res.text().catch(() => "");
    await saveReviewSettings({ last_error: `${res.status}: ${message.slice(0, 400)}` });
    return { ok: false, reason: "api_error", message: `Google Places error ${res.status}: ${message.slice(0, 400)}`, placeId };
  }

  const json = (await res.json()) as {
    rating?: number;
    userRatingCount?: number;
    reviews?: PlaceReview[];
  };
  const reviews = json.reviews ?? [];

  const rows = reviews
    .map((r) => {
      const googleId = r.name?.split("/reviews/").pop() || r.name || null;
      if (!googleId) return null;
      return {
        source: "google",
        google_review_id: googleId,
        location_id: placeId,
        reviewer_name: r.authorAttribution?.displayName ?? null,
        reviewer_photo_url: r.authorAttribution?.photoUri ?? null,
        rating: typeof r.rating === "number" ? Math.round(r.rating) : null,
        comment: r.originalText?.text ?? r.text?.text ?? null,
        review_created_at: r.publishTime ?? null,
        review_updated_at: r.publishTime ?? null,
        synced_at: new Date().toISOString(),
      };
    })
    .filter(Boolean) as Record<string, unknown>[];

  let upserted = 0;
  if (rows.length) {
    const sb = getSkildAdmin();
    const { error, count } = await sb
      .from("google_reviews")
      .upsert(rows, { onConflict: "source,google_review_id", count: "exact" });
    if (error) {
      await saveReviewSettings({ last_error: error.message });
      return { ok: false, reason: "api_error", message: error.message, placeId };
    }
    upserted = count ?? rows.length;
  }

  await saveReviewSettings({
    place_id: placeId,
    last_synced_at: new Date().toISOString(),
    last_error: null,
    rating: json.rating ?? null,
    user_rating_count: json.userRatingCount ?? null,
  });

  return {
    ok: true,
    placeId,
    fetched: reviews.length,
    upserted,
    rating: json.rating ?? null,
    userRatingCount: json.userRatingCount ?? null,
  };
}
