// Reviews: public cached read + admin-triggered Google sync.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type PublicReview = {
  id: string;
  reviewer_name: string | null;
  rating: number | null;
  comment: string | null;
  review_created_at: string | null;
};

/** Public, cached read of the synchronized Google reviews. Never fabricates data. */
const STALE_MS = 12 * 60 * 60 * 1000;

/** At most one background refresh per 12h, so page loads stay fast. */
async function refreshIfStale() {
  try {
    // Preferred: official Business Profile API (free, our own location, all reviews).
    const { hasGbpCredentials, getGbpSettings, syncGbpReviews } = await import("./gbp-reviews.server");
    if (hasGbpCredentials()) {
      const g = await getGbpSettings();
      const lastG = g.last_synced_at ? new Date(g.last_synced_at).getTime() : 0;
      if (Date.now() - lastG >= STALE_MS) await syncGbpReviews();
      return;
    }
    // Fallback: Places API (New), only if a key is configured.
    const { getReviewSettings, hasPlacesKey, syncGoogleReviews } = await import("./google-reviews.server");
    if (!hasPlacesKey()) return;
    const s = await getReviewSettings();
    const last = s.last_synced_at ? new Date(s.last_synced_at).getTime() : 0;
    if (Date.now() - last < STALE_MS) return;
    await syncGoogleReviews();
  } catch {
    /* never block the public page on Google */
  }
}


export const listPublicReviews = createServerFn({ method: "GET" }).handler(async () => {
  await refreshIfStale();
  try {
    const { getSkildPublicDb } = await import("./skild-public.server");
    const sb = getSkildPublicDb();
    const { data, error } = await sb
      .from("google_reviews")
      .select("id, reviewer_name, rating, comment, review_created_at")
      .eq("is_visible", true)
      .order("review_created_at", { ascending: false })
      .limit(24);
    if (error) return { reviews: [] as PublicReview[], available: false };
    return { reviews: (data ?? []) as PublicReview[], available: true };
  } catch {
    return { reviews: [] as PublicReview[], available: false };
  }
});

/** Admin-only: pull the latest reviews from Google into the Supabase cache. */
export const runGoogleReviewSync = createServerFn({ method: "POST" })
  .inputValidator((d: { accessToken: string }) =>
    z.object({ accessToken: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { requireSkildAdmin } = await import("./admin-guard.server");
    await requireSkildAdmin(data.accessToken);
    const { hasGbpCredentials, syncGbpReviews } = await import("./gbp-reviews.server");
    if (hasGbpCredentials()) return await syncGbpReviews();
    const { syncGoogleReviews } = await import("./google-reviews.server");
    return await syncGoogleReviews();
  });

/** Admin-only: current sync status (place id, last sync, last error). */
export const getReviewSyncStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { accessToken: string }) =>
    z.object({ accessToken: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { requireSkildAdmin } = await import("./admin-guard.server");
    await requireSkildAdmin(data.accessToken);
    const { getReviewSettings, hasPlacesKey } = await import("./google-reviews.server");
    const { hasGbpCredentials, getGbpSettings } = await import("./gbp-reviews.server");
    const settings = await getReviewSettings();
    const gbp = await getGbpSettings().catch(() => ({}));
    return {
      hasApiKey: hasPlacesKey(),
      hasBusinessProfile: hasGbpCredentials(),
      source: hasGbpCredentials() ? "business_profile" : hasPlacesKey() ? "places" : "none",
      businessProfile: gbp,
      ...settings,
    };
  });

