// Issues a short-lived Cloudinary upload signature so the browser can
// upload the customer's photo files directly to Cloudinary without ever
// seeing the API secret. Runs in the TanStack Start server runtime
// (Cloudflare Workers today, Vercel-compatible tomorrow).
//
// Required env:
//   CLOUDINARY_API_SECRET  — server-only secret
// Optional env (defaulted for this project):
//   CLOUDINARY_CLOUD_NAME  — defaults to "dtzyctb1i"
//   CLOUDINARY_API_KEY     — defaults to "465628952372288"

import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function sha1Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-1", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const Route = createFileRoute("/api/public/cloudinary-sign")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "dtzyctb1i";
        const apiKey = process.env.CLOUDINARY_API_KEY || "465628952372288";
        const apiSecret = process.env.CLOUDINARY_API_SECRET;

        if (!apiSecret) {
          return Response.json(
            { error: "CLOUDINARY_API_SECRET is not configured" },
            { status: 500, headers: CORS },
          );
        }

        let body: { folder?: string; publicId?: string } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          /* empty body is fine */
        }

        const folder = body.folder?.trim() || "skild-auto/quotes";
        const timestamp = Math.floor(Date.now() / 1000);

        // Cloudinary signature: sha1(sorted_params + api_secret).
        // We only sign the params we send with the upload.
        const params: Record<string, string | number> = {
          folder,
          timestamp,
        };
        if (body.publicId) params.public_id = body.publicId;

        const toSign = Object.keys(params)
          .sort()
          .map((k) => `${k}=${params[k]}`)
          .join("&");
        const signature = await sha1Hex(toSign + apiSecret);

        return Response.json(
          {
            cloudName,
            apiKey,
            timestamp,
            folder,
            signature,
            publicId: body.publicId,
          },
          { headers: CORS },
        );
      },
    },
  },
});
