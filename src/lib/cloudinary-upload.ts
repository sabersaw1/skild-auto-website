// Direct browser → Cloudinary upload, authenticated by a short-lived
// signature minted by /api/public/cloudinary-sign. The API secret never
// touches the browser.
//
// Returned shape is what the quote-submission payload carries through to
// the email server route AND what a future Neon row will store:
//   { url, secureUrl, publicId, format, bytes, originalFilename }

export type CloudinaryPhoto = {
  url: string;
  secureUrl: string;
  publicId: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  originalFilename: string;
  resourceType: string;
  uploadedAt: string;
};

const QUOTE_FOLDER_PREFIX = "skild-auto/quotes";

function slug() {
  return Math.random().toString(36).slice(2, 10);
}

/** Stable per-tab folder so a single quote's photos stay grouped. */
export function quoteSessionFolder(): string {
  if (typeof window === "undefined") return `${QUOTE_FOLDER_PREFIX}/anon-${slug()}`;
  const KEY = "skild.quote.session";
  let id = window.sessionStorage.getItem(KEY);
  if (!id) {
    id = `${Date.now().toString(36)}-${slug()}`;
    window.sessionStorage.setItem(KEY, id);
  }
  return `${QUOTE_FOLDER_PREFIX}/${id}`;
}

type SignatureResponse = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  publicId?: string;
};

async function getSignature(folder: string): Promise<SignatureResponse> {
  const res = await fetch("/api/public/cloudinary-sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Could not get Cloudinary signature (${res.status}): ${text}`);
  }
  return (await res.json()) as SignatureResponse;
}

export async function uploadQuotePhoto(file: File): Promise<CloudinaryPhoto> {
  const folder = quoteSessionFolder();
  const sig = await getSignature(folder);

  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", sig.apiKey);
  fd.append("timestamp", String(sig.timestamp));
  fd.append("folder", sig.folder);
  fd.append("signature", sig.signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`;

  console.info("[cloudinary] uploading", {
    endpoint,
    folder: sig.folder,
    filename: file.name,
    size: file.size,
    type: file.type,
  });

  const res = await fetch(endpoint, { method: "POST", body: fd });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[cloudinary] upload failed", { status: res.status, text });
    throw new Error(`Cloudinary upload failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    secure_url: string;
    url: string;
    public_id: string;
    format: string;
    bytes: number;
    width?: number;
    height?: number;
    original_filename?: string;
    resource_type: string;
    created_at?: string;
  };

  const originalFilename =
    file.name || `${data.original_filename || data.public_id}.${data.format}`;

  console.info("[cloudinary] uploaded", {
    publicId: data.public_id,
    url: data.secure_url,
    bytes: data.bytes,
  });

  return {
    url: data.url,
    secureUrl: data.secure_url,
    publicId: data.public_id,
    format: data.format,
    bytes: data.bytes,
    width: data.width,
    height: data.height,
    originalFilename,
    resourceType: data.resource_type,
    uploadedAt: data.created_at ?? new Date().toISOString(),
  };
}
