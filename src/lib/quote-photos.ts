// Uploads optional customer photos to Supabase Storage.
//
// Each photo is stored under a per-submission folder so a single quote's
// images stay grouped — easy to find from the email, easy to attach to a
// future Neon customer record, and easy to feed to Skild OS later.

import { skildSupabase, SKILD_QUOTE_BUCKET } from "./skild-supabase";

export type UploadedPhoto = {
  path: string; // storage object path
  url: string; // public URL used in the notification email
};

function slug() {
  return Math.random().toString(36).slice(2, 10);
}

function safeExt(file: File) {
  const m = /\.([a-z0-9]+)$/i.exec(file.name);
  if (m) return m[1].toLowerCase();
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/heic") return "heic";
  return "jpg";
}

/** Returns or creates a stable folder id for the current quote session. */
export function quoteSessionId(): string {
  if (typeof window === "undefined") return slug();
  const KEY = "skild.quote.session";
  let id = window.sessionStorage.getItem(KEY);
  if (!id) {
    id = `${Date.now().toString(36)}-${slug()}`;
    window.sessionStorage.setItem(KEY, id);
  }
  return id;
}

export async function uploadQuotePhoto(file: File): Promise<UploadedPhoto> {
  const folder = quoteSessionId();
  const path = `${folder}/${Date.now()}-${slug()}.${safeExt(file)}`;

  const { error } = await skildSupabase.storage
    .from(SKILD_QUOTE_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg",
    });

  if (error) throw error;

  const { data } = skildSupabase.storage
    .from(SKILD_QUOTE_BUCKET)
    .getPublicUrl(path);

  return { path, url: data.publicUrl };
}
