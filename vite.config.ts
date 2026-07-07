// ============= Full file contents =============
// @lovable.dev/vite-tanstack-config already includes tanstackStart, viteReact,
// tailwindcss, tsConfigPaths, nitro, componentTagger, VITE_* env injection,
// @ path alias, React/TanStack dedupe, error logger plugins, sandbox detection.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const SKILD_SUPABASE_URL = (
  process.env.SKILD_SUPABASE_URL ?? "https://srtpaqwlrtxtflcjbqie.supabase.co"
)
  .trim()
  .replace(/\/$/, "");
const SKILD_SUPABASE_PUBLISHABLE_KEY = (process.env.SKILD_SUPABASE_PUBLISHABLE_KEY ?? "").trim();

if (!SKILD_SUPABASE_PUBLISHABLE_KEY) {
  // Surface the missing build-time secret loudly rather than silently
  // shipping a broken browser bundle.
  console.warn(
    "[vite.config] SKILD_SUPABASE_PUBLISHABLE_KEY is not set at build time. " +
      "Browser Supabase client will be unauthenticated until the next build with secrets present.",
  );
}

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    define: {
      __SKILD_SUPABASE_URL__: JSON.stringify(SKILD_SUPABASE_URL),
      __SKILD_SUPABASE_PUBLISHABLE_KEY__: JSON.stringify(SKILD_SUPABASE_PUBLISHABLE_KEY),
    },
  },
});
