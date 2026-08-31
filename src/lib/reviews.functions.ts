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
export const listPublicReviews = createServerFn({ method: "GET" }).handler(async () => {
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
    const settings = await getReviewSettings();
    return { hasApiKey: hasPlacesKey(), ...settings };
  });
