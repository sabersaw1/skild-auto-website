# Skild Auto — Supabase Setup

The site uses **your own Supabase project** (not Lovable Cloud) so it stays
portable across GitHub → Vercel → Neon → Skild OS.

Project: `xukkcixylfasoerjnkra`

## 1. Storage bucket

Bucket name: **`quote-photos`** — set to **Public**.

Policy (Supabase Dashboard → Storage → quote-photos → Policies):

```sql
-- Anyone can upload (anon key) — used by the public quote form
create policy "Public upload to quote-photos"
on storage.objects for insert
to anon
with check ( bucket_id = 'quote-photos' );

-- Anyone can read (so email recipients can open the photos)
create policy "Public read on quote-photos"
on storage.objects for select
to anon, authenticated
using ( bucket_id = 'quote-photos' );
```

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
