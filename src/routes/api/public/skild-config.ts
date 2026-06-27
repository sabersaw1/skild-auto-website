// Returns the Supabase publishable key + URL for the current project so the
// browser client can be configured at runtime (since build-time secrets are
// not injected into the Vite build). Publishable/anon keys are safe to expose.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/skild-config")({
  server: {
    handlers: {
      GET: async () => {
        const url = process.env.SKILD_SUPABASE_URL?.trim().replace(/\/$/, "") ?? "";
        const key = process.env.SKILD_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
        return new Response(
          JSON.stringify({ url, publishableKey: key, projectRef: url.replace("https://", "").split(".")[0] }),
          { status: 200, headers: { "content-type": "application/json", "cache-control": "public, max-age=60" } },
        );
      },
    },
  },
});
