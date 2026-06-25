// One-shot endpoint to provision the admin user from secrets. Idempotent.
// Reads SKILD_ADMIN_PASSWORD; creates (or fetches) auth user
// skildauto@gmail.com; grants the 'admin' role in user_roles.
//
// Safe to call repeatedly — does nothing extra if everything is in place.
// Exposed as a server fn (POST). Anyone can call it, but it can only ever
// (re-)provision the single hardcoded admin email; no privilege escalation.

import { createServerFn } from "@tanstack/react-start";

const ADMIN_EMAIL = "skildauto@gmail.com";

export const bootstrapSkildAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const password = process.env.SKILD_ADMIN_PASSWORD;
  if (!password) return { ok: false, error: "SKILD_ADMIN_PASSWORD not set" } as const;

  const { getSkildAdmin } = await import("./skild-supabase.server");
  const sb = getSkildAdmin();

  // Find or create the admin auth user.
  let userId: string | null = null;
  const list = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list.data?.users?.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL);
  if (existing) {
    userId = existing.id;
    // Always re-sync the password to the secret so rotating SKILD_ADMIN_PASSWORD works.
    await sb.auth.admin.updateUserById(existing.id, { password });
  } else {
    const created = await sb.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password,
      email_confirm: true,
      user_metadata: { display_name: "skild" },
    });
    if (created.error || !created.data.user) {
      return { ok: false, error: created.error?.message || "createUser failed" } as const;
    }
    userId = created.data.user.id;
  }

  // Ensure customers row exists (optional, for cross-linking).
  await sb.from("customers").upsert({ email: ADMIN_EMAIL, full_name: "Skild Admin" }, { onConflict: "email" });

  // Grant admin role.
  const { error: roleErr } = await sb
    .from("user_roles")
    .upsert({ user_id: userId!, role: "admin" }, { onConflict: "user_id,role" });
  if (roleErr) return { ok: false, error: roleErr.message } as const;

  return { ok: true, email: ADMIN_EMAIL, userId } as const;
});
