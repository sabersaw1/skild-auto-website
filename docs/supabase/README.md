# Skild Auto OS — Supabase Setup

This project uses **your own Supabase project** (`xukkcixylfasoerjnkra`) as the
backend. Lovable Cloud is **not** used.

## One-time setup

1. Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/xukkcixylfasoerjnkra/sql/new).
2. Paste the contents of [`schema.sql`](./schema.sql) and run it.
   - Idempotent. Safe to re-run after edits.
   - Creates: `customers`, `vehicles`, `quotes`, `quote_photos`,
     `appointments`, `business_hours`, `blocked_times`, `user_roles`,
     plus enums, `has_role()`, RLS policies, and default Mon–Sat hours.

## Make yourself an admin

After you've signed up through the (forthcoming) `/admin` login:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'skildauto@gmail.com';
```

## Environment / secrets

| Where         | Name                              | Notes                                 |
|---------------|-----------------------------------|---------------------------------------|
| In code       | URL + publishable (anon) key      | Hardcoded in `src/lib/skild-supabase.ts` (safe — public keys). |
| Secret store  | `SKILD_SUPABASE_SERVICE_ROLE_KEY` | Server-only. Bypasses RLS. Used by `src/lib/skild-supabase.server.ts`. |
| Secret store  | `RESEND_API_KEY`                  | Email transport for quote notifications. |
| Secret store  | `CLOUDINARY_API_SECRET`           | Signs photo uploads. |

## Pipeline

```
Quote form  →  Cloudinary (photos)
            →  /api/public/send-quote
                 ├─ Supabase insert (customers / vehicles / quotes / quote_photos)
                 └─ Resend email to skildauto@gmail.com (with attachments)
```
