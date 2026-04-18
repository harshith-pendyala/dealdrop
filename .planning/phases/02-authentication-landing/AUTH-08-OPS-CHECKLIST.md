# AUTH-08 Operator Checklist — OAuth Redirect URI Registration

**Audience:** The user / developer (not Claude). These steps require access to two external dashboards that no agent can reach.
**When to run:** Before attempting Plan 04 Task 3's manual OAuth smoke test. Can run in parallel with Plans 01-04 code work.
**Time estimate:** ~15 minutes, once.

**Supabase project ref:** `vhlbdcsxccaknccawfdj` (dealdrop-dev, Tokyo region) — verify in the Supabase Dashboard before proceeding.

---

## Key concept (read this first — prevents the most common confusion)

There are **two callback URIs** involved, and they go in **different places**:

1. **Supabase's callback URI** (hosted by Supabase): `https://vhlbdcsxccaknccawfdj.supabase.co/auth/v1/callback`
   → Register this in **Google Cloud Console**.

2. **DealDrop's callback URI** (hosted by our app): `http://localhost:3000/auth/callback` (+ Vercel variants)
   → Register this in **Supabase Auth Dashboard → URL Configuration → Redirect URLs**.

The OAuth round-trip goes: `browser → Google → Supabase's callback → DealDrop's /auth/callback → /`.

---

## Part 1 — Google Cloud Console

1. Open https://console.cloud.google.com/ → select the DealDrop project (or create one if first time).
2. Navigate: **APIs & Services → Credentials**.
3. If no OAuth 2.0 Client ID exists yet:
   - Click **Create Credentials → OAuth client ID**.
   - Application type: **Web application**.
   - Name: `DealDrop Web` (or similar).
4. On the OAuth Client ID page, under **Authorized redirect URIs**, add exactly:
   ```
   https://vhlbdcsxccaknccawfdj.supabase.co/auth/v1/callback
   ```
   (Replace `vhlbdcsxccaknccawfdj` with your actual Supabase project ref if different.)
5. Under **Authorized JavaScript origins**, add:
   ```
   https://vhlbdcsxccaknccawfdj.supabase.co
   ```
6. Save. Copy the **Client ID** and **Client Secret** — you'll paste them in Part 2.

**Important:** Google does NOT allow wildcard redirect URIs (`https://*.vercel.app/...`) in production OAuth clients. For Vercel preview deployments:
- **Option A (portfolio bar, recommended):** Add ONE production Vercel URL after first deploy (e.g. `https://vhlbdcsxccaknccawfdj.supabase.co/auth/v1/callback` — same Supabase URL; Supabase handles the final redirect to your Vercel preview via its own wildcard support). Test only on the production Vercel URL and on localhost.
- **Option B:** Create a separate "Testing" OAuth client in Google that accepts arbitrary redirect URIs. Only use this for dev / preview — NEVER for the real production client.

---

## Part 2 — Supabase Auth Dashboard

1. Open https://supabase.com/dashboard/project/vhlbdcsxccaknccawfdj → **Authentication → Providers**.
2. Find **Google**, toggle **Enabled**.
3. Paste the **Client ID** and **Client Secret** from Part 1 step 6. Save.
4. Still in **Authentication**, navigate to **URL Configuration**.
5. **Site URL:** Set to your production URL, e.g. `https://dealdrop.vercel.app` (once you know it). For localhost-only testing, leave blank or set `http://localhost:3000`.
6. **Redirect URLs:** Add these entries (one per line, no commas):
   ```
   http://localhost:3000/auth/callback
   http://127.0.0.1:3000/auth/callback
   https://dealdrop.vercel.app/auth/callback
   https://*.vercel.app/auth/callback
   ```
   (Unlike Google, Supabase DOES support the `*.vercel.app` wildcard — use it for preview deployments.)
   Replace `dealdrop.vercel.app` with your actual production domain once you have one.
7. Save.

---

## Verification (before running Plan 04 Task 3 smoke test)

- [ ] In Google Cloud Console → Credentials → your OAuth client → Authorized redirect URIs shows `https://vhlbdcsxccaknccawfdj.supabase.co/auth/v1/callback`
- [ ] In Supabase Dashboard → Authentication → Providers → Google is **Enabled** with Client ID + Secret populated
- [ ] In Supabase Dashboard → Authentication → URL Configuration → Redirect URLs includes both `http://localhost:3000/auth/callback` AND `http://127.0.0.1:3000/auth/callback`
- [ ] `dealdrop/supabase/config.toml` `additional_redirect_urls` uses `http://` (not `https://`) for `127.0.0.1:3000` — Plan 02 Task 2b should have already fixed this (Phase 1 REVIEW WR-03)
- [ ] `.env.local` has valid `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Phase 1 Plan 01-03 already seeded these)

If all five are checked, proceed to Plan 04 Task 3 smoke test.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Google returns `redirect_uri_mismatch` after clicking "Continue with Google" | Google redirect URIs don't include the Supabase project callback | Part 1 step 4 — add `https://{project-ref}.supabase.co/auth/v1/callback` to Google |
| Redirected back to `/?auth_error=1` with no session | DealDrop redirect URL not in Supabase Auth → URL Configuration | Part 2 step 6 — add `http://localhost:3000/auth/callback` to Supabase |
| OAuth works on Vercel but fails on localhost | `supabase/config.toml` has `https://127.0.0.1:3000` typo | Plan 02 Task 2b fixes this; re-verify `grep '127.0.0.1' dealdrop/supabase/config.toml` shows `http://` not `https://` |
| "Invalid OAuth client" in Supabase | Client Secret mismatch between Google and Supabase | Part 2 step 3 — re-copy the Secret from Google (note: the Secret is only fully visible immediately after creation; regenerate if lost) |
| OAuth "not verified" / "unsafe app" warning | Google OAuth app is in Testing mode | Normal for dev. Click "Advanced" → "Proceed" during testing. For production deployments, submit for Google verification (out of scope for portfolio). |
