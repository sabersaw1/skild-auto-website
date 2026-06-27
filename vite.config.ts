// ============= Full file contents =============
// @lovable.dev/vite-tanstack-config already includes tanstackStart, viteReact,
// tailwindcss, tsConfigPaths, nitro, componentTagger, VITE_* env injection,
// @ path alias, React/TanStack dedupe, error logger plugins, sandbox detection.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const SKILD_SUPABASE_URL =
  process.env.SKILD_SUPABASE_URL ?? "https://xukkcixylfasoerjnkra.supabase.co";
const SKILD_SUPABASE_PUBLISHABLE_KEY =
  process.env.SKILD_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_1j_fdwCdPM-y1d2T7WJDjA_ciiqaEne";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    define: {
      __SKILD_SUPABASE_URL__: JSON.stringify(SKILD_SUPABASE_URL),
      __SKILD_SUPABASE_PUBLISHABLE_KEY__: JSON.stringify(
        SKILD_SUPABASE_PUBLISHABLE_KEY,
      ),
    },
  },
});
