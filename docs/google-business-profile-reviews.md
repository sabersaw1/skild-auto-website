# Real Google reviews for skildauto.com — official, no-billing path

## Verdict

Yes: the Google **Business Profile APIs** can return the real reviews for your own
Skild Auto location, they are **free** (no Maps/Places billing, no credit card), and
they return the **full** review list — unlike Places API, which caps out at 5 reviews.
The only cost is a one-time access-approval request from Google.

The code path is already implemented server-side in
`src/lib/gbp-reviews.server.ts`. It stays dormant until the three secrets below
exist, and it writes into the existing `google_reviews` table, so the Reviews page
design, sync architecture and SEO are unchanged. The Google **Calendar** OAuth
client, scopes and refresh token are untouched — reviews use their own client.

## What you personally need to do

1. **Request API access** (only you can do this; it is an account-level action).
   Submit the Business Profile API access form:
   https://developers.google.com/my-business/content/prereqs
   - Use the **same Google Cloud project** already used for Skild Auto (access is
     granted per Cloud project) and the Google account that manages the Skild Auto
     Business Profile.
   - Provide: project number, project ID, the Business Profile account, your website
     (https://www.skildauto.com), and the use case: "Display our own verified
     location's reviews on our business website."
   - Approval typically takes a few days to a couple of weeks.

2. **After approval, enable these APIs** in that Cloud project:
   - My Business Account Management API
   - My Business Business Information API
   - Google My Business API (v4 — the one that serves reviews)

3. **Create a separate OAuth client** (Web application) named e.g.
   "Skild Auto Reviews" — do NOT edit the existing Calendar client.
   Scope: `https://www.googleapis.com/auth/business.manage`.
   Authorize once with `access_type=offline&prompt=consent` as the account that
   manages the profile, and keep the resulting refresh token.

4. **Add these server-side secrets** (Vercel + Lovable, server env only):
   - `GBP_CLIENT_ID`
   - `GBP_CLIENT_SECRET`
   - `GBP_REFRESH_TOKEN`
   - optional: `GBP_ACCOUNT_ID`, `GBP_LOCATION_ID` (otherwise auto-resolved and cached
     in `business_settings` under key `gbp_reviews`)

Once those exist, the sync pulls reviewer name, photo URL, star rating, comment and
timestamps — the fields Google permits caching for display — and the Reviews page
renders them immediately. Nothing else changes.

## If approval is denied or you want it live sooner

Places API (New) — Place Details — is the fallback already wired in
`src/lib/google-reviews.server.ts`. Trade-offs:

- **Requires a billing account with a credit card.** There is no way around this.
- Returns **at most 5 reviews**, chosen by Google, not all of them.
- Cost with our usage: the sync runs at most once every 12 hours behind a cache, so
  ~60 requests/month on the Place Details Essentials+ SKU — well inside the free
  monthly usage allowance, i.e. effectively $0.
- Safest limits if you go this route: restrict the API key to the Places API only,
  restrict by server IP/referrer, and set a **daily quota cap** (e.g. 50 requests/day)
  plus a **$1 budget alert** in Cloud Billing. Those caps make runaway charges
  impossible.

Recommendation: submit the Business Profile API request first (free, complete review
list). Keep Places as the emergency fallback only if you decide you want reviews live
before approval lands.
