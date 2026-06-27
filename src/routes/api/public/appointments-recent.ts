// Lists the last 5 appointments with google_event_id presence, for diagnostics.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/appointments-recent")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { getSkildAdmin } = await import("@/lib/skild-supabase.server");
          const sb = getSkildAdmin();
          const { data, error } = await sb
            .from("appointments")
            .select("id, start_at, end_at, status, google_event_id, created_at")
            .order("created_at", { ascending: false })
            .limit(10);
          if (error) {
            return new Response(JSON.stringify({ ok: false, error: error.message, code: error.code }, null, 2), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
          return new Response(
            JSON.stringify({ ok: true, count: data?.length ?? 0, appointments: data ?? [] }, null, 2),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch (err) {
          return new Response(
            JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }, null, 2),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
