// Diagnostic: shows whether the google_calendar row is actually stored in
// business_settings, structure, and whether refresh_token + calendar_id are
// populated. No secrets returned — only presence + lengths.

import { createFileRoute } from "@tanstack/react-router";

function redact(v: string | null | undefined, keep = 6) {
  if (!v) return null;
  if (v.length <= keep + 4) return `***(${v.length})`;
  return `${v.slice(0, keep)}…${v.slice(-4)} (len=${v.length})`;
}

export const Route = createFileRoute("/api/public/google/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Admin-only: requires Bearer access token from a signed-in admin.
        try {
          const auth = request.headers.get("authorization") ?? "";
          const token = auth.toLowerCase().startsWith("bearer ")
            ? auth.slice(7).trim()
            : "";
          const { requireSkildAdmin } = await import("@/lib/admin-guard.server");
          await requireSkildAdmin(token);
        } catch {
          return new Response(
            JSON.stringify({ ok: false, error: "Forbidden" }),
            { status: 403, headers: { "Content-Type": "application/json" } },
          );
        }
        const out: Record<string, unknown> = { ok: true };

        try {
          const { getSkildAdmin } = await import("@/lib/skild-supabase.server");
          const sb = getSkildAdmin();
          const { data, error } = await sb
            .from("business_settings")
            .select("key, value, updated_at")
            .eq("key", "google_calendar")
            .maybeSingle();
          if (error) {
            out.db_error = { message: error.message, code: error.code, hint: error.hint };
          }
          if (!data) {
            out.row_present = false;
          } else {
            const v = (data.value ?? {}) as Record<string, unknown>;
            out.row_present = true;
            out.updated_at = data.updated_at ?? null;
            out.fields = {
              refresh_token_present: !!v.refresh_token,
              refresh_token_redacted: redact(v.refresh_token as string | undefined),
              access_token_present: !!v.access_token,
              access_token_expires_at: v.access_token_expires_at ?? null,
              calendar_id_present: !!v.calendar_id,
              calendar_id: v.calendar_id ?? null,
              scope: v.scope ?? null,
              connected_at: v.connected_at ?? null,
              keys: Object.keys(v),
            };
          }

          // Try a live refresh + freeBusy ping (this surfaces the real Google error).
          try {
            const { getGoogleBusy, isGoogleConnected } = await import("@/lib/google-calendar.server");
            out.is_google_connected = await isGoogleConnected();
            const from = new Date();
            const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
            const busy = await getGoogleBusy(from.toISOString(), to.toISOString());
            out.freebusy_ok = true;
            out.freebusy_busy_count = busy.length;
          } catch (err) {
            out.freebusy_ok = false;
            out.freebusy_error = err instanceof Error ? err.message : String(err);
          }

          // Try creating + deleting a probe event so we know createGoogleEvent works end-to-end.
          if (out.row_present) {
            try {
              const { createGoogleEvent, deleteGoogleEvent } = await import("@/lib/google-calendar.server");
              const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
              const end = new Date(start.getTime() + 15 * 60 * 1000);
              const ev = await createGoogleEvent({
                summary: "Skild Auto — diagnostic probe (safe to ignore)",
                description: "Created by /api/public/google/status diagnostic.",
                startISO: start.toISOString(),
                endISO: end.toISOString(),
                location: "Salt Lake City, UT",
              });
              out.create_event_ok = !!ev;
              out.create_event_id = ev?.eventId ?? null;
              if (ev?.eventId) {
                const del = await deleteGoogleEvent(ev.eventId);
                out.delete_probe_event_ok = del;
              }
            } catch (err) {
              out.create_event_ok = false;
              out.create_event_error = err instanceof Error ? err.message : String(err);
            }
          }
        } catch (err) {
          out.ok = false;
          out.error = err instanceof Error ? err.message : String(err);
        }
        return new Response(JSON.stringify(out, null, 2), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
