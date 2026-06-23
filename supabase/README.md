# Skild Auto — Supabase Setup

The site uses **your own Supabase project** (not Lovable Cloud) so it stays
portable across GitHub → Vercel → Neon → Skild OS.

Project: `xukkcixylfasoerjnkra`

## 1. Storage bucket — REQUIRED

Bucket name: **`quote-photos`** — set to **Public**.

> ⚠️ **If photos are not appearing in the bucket, this step has not been
> done.** A bucket alone is not enough — `storage.objects` has RLS on by
> default and silently rejects anon uploads with
> `new row violates row-level security policy`. The frontend now logs
> this error to the browser console and shows it in the quote form.

Open **Supabase Dashboard → SQL Editor → New query**, paste this, run it
once:

```sql
-- 1. Allow the public quote form (anon key) to upload into quote-photos
create policy "Public upload to quote-photos"
on storage.objects for insert
to anon, authenticated
with check ( bucket_id = 'quote-photos' );

-- 2. Allow anyone with the link (email recipients) to view the photo
create policy "Public read on quote-photos"
on storage.objects for select
to anon, authenticated
using ( bucket_id = 'quote-photos' );
```

Verify it worked — from any terminal:

```bash
curl -i -X POST \
  "https://xukkcixylfasoerjnkra.supabase.co/storage/v1/object/quote-photos/test.txt" \
  -H "apikey: <your anon key>" \
  -H "Authorization: Bearer <your anon key>" \
  -H "Content-Type: text/plain" \
  --data "hello"
```

A `200` means uploads work. A `403` with `row-level security policy` means
the SQL above has not been applied yet.

If you later prefer a **private** bucket, drop the read policy and replace
`getPublicUrl` with `createSignedUrl` in `src/lib/quote-photos.ts` (7-day
links work well for the email).

## 2. Edge Function — `send-quote-notification`

Sends the notification email to `skildauto@gmail.com` via Resend.

### Secrets (Supabase Dashboard → Edge Functions → Secrets)

| Name              | Value                                                |
| ----------------- | ---------------------------------------------------- |
| `RESEND_API_KEY`  | From https://resend.com/api-keys                     |
| `QUOTE_TO_EMAIL`  | `skildauto@gmail.com`                               |
| `QUOTE_FROM_EMAIL`| `Skild Auto <quotes@skildauto.com>` (verified sender)|

For testing without a verified domain, use `onboarding@resend.dev` as the
from address (Resend only delivers test sends to your own account email).

### Deploy

```bash
supabase login
supabase link --project-ref xukkcixylfasoerjnkra
supabase functions deploy send-quote-notification --no-verify-jwt
```

`--no-verify-jwt` lets the public site call it with the anon key.

## 3. Frontend overrides (optional)

Hardcoded defaults in `src/lib/skild-supabase.ts` already match this
project. To override on Vercel set:

- `VITE_SKILD_SUPABASE_URL`
- `VITE_SKILD_SUPABASE_PUBLISHABLE_KEY`

## Data flow

```
Customer fills /quote
   ├─ photos → POST → Supabase Storage (quote-photos/<session>/<file>)
   └─ Continue to scheduling
        ├─ POST quote JSON + photo URLs → Edge Fn → Resend → skildauto@gmail.com
        └─ Redirect to /booking → Calendly (pre-filled)
```

The same payload shape feeds future Neon customer records and Skild OS AI —
see `src/lib/quote-submit.ts` (`SubmitPayload`).
