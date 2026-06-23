// Uploads optional customer photos to Supabase Storage.
//
// Each photo is stored under a per-submission folder so a single quote's
// images stay grouped — easy to find from the email, easy to attach to a
// future Neon customer record, and easy to feed to Skild OS later.

import { skildSupabase, SKILD_QUOTE_BUCKET } from "./skild-supabase";

export type UploadedPhoto = {
  path: string; // storage object path
  url: string; // public URL used in the notification email
  filename: string; // original filename for the email attachment
  contentType: string;
  base64: string; // raw bytes, base64-encoded — used as the email attachment
};

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

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

/**
 * Sanitize the customer's original filename for use as a Supabase Storage
 * object key. Strips path separators, collapses unsafe characters, and
 * keeps the original stem so the file in the bucket matches what the
 * customer actually uploaded (e.g. `IMG_4821.jpg` → `IMG_4821.jpg`).
 */
function safeName(file: File): string {
  const raw = (file.name || "").split(/[\\/]/).pop() ?? "";
  const dot = raw.lastIndexOf(".");
  const stem = (dot > 0 ? raw.slice(0, dot) : raw)
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "photo";
  return `${stem}.${safeExt(file)}`;
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

  console.info("[quote-photos] uploading", {
    bucket: SKILD_QUOTE_BUCKET,
    path,
    size: file.size,
    type: file.type,
  });

  const { data: upData, error } = await skildSupabase.storage
    .from(SKILD_QUOTE_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg",
    });

  if (error) {
    // Surface the full Supabase error — the most common failure is a
    // missing storage RLS policy ("new row violates row-level security
    // policy"). Without this log, the upload appears to silently fail.
    const errAny = error as { name?: string; status?: number; statusCode?: number; message: string };
    console.error("[quote-photos] upload failed", {
      bucket: SKILD_QUOTE_BUCKET,
      path,
      name: errAny.name,
      message: errAny.message,
      status: errAny.status ?? errAny.statusCode,
      error,
    });
    const status = errAny.status ?? errAny.statusCode;
    const hint =
      typeof error.message === "string" &&
      error.message.toLowerCase().includes("row-level security")
        ? " — Supabase Storage is rejecting the upload. Add the anon INSERT policy on the 'quote-photos' bucket (see supabase/README.md)."
        : "";
    throw new Error(
      `Photo upload failed${status ? ` (${status})` : ""}: ${error.message}${hint}`,
    );
  }

  // Verify the object exists before we hand back a URL — guarantees we
  // never email a link to a file that wasn't actually stored.
  if (!upData?.path) {
    console.error("[quote-photos] upload returned no path", { upData });
    throw new Error("Photo upload failed: storage did not return a path.");
  }

  const { data } = skildSupabase.storage
    .from(SKILD_QUOTE_BUCKET)
    .getPublicUrl(upData.path);

  const base64 = await fileToBase64(file);
  const filename = file.name || `${upData.path.split("/").pop() ?? "photo.jpg"}`;
  const contentType = file.type || "image/jpeg";

  console.info("[quote-photos] uploaded", { path: upData.path, url: data.publicUrl });
  return { path: upData.path, url: data.publicUrl, filename, contentType, base64 };
}
