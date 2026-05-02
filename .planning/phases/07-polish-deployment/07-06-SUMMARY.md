---
phase: 07-polish-deployment
plan: 06
status: complete
requirements: [DEP-04]
completed: 2026-05-02
---

# 07-06 — Production OAuth Registration

## Outcome

Registered the prod Vercel URL + prod Supabase project's `auth/v1/callback` in BOTH Google Cloud Console and Supabase Auth. Full OAuth flow now completes on `https://dealdrop-khaki.vercel.app/` with operator's Google account; new row appears in prod `auth.users`. AUTH-08-OPS-CHECKLIST.md extended with "Part 3 — Production Cutover" so the dev/prod disambiguation stays in one place.

## Final State — Google Cloud Console (single OAuth client serves both)

| Setting | Entries |
|---------|---------|
| Authorized redirect URIs | `https://vhlbdcsxccaknccawfdj.supabase.co/auth/v1/callback` (dev), `https://gltwnfnkodzkupkxwpro.supabase.co/auth/v1/callback` (prod) |
| Authorized JavaScript origins | `https://vhlbdcsxccaknccawfdj.supabase.co`, `https://gltwnfnkodzkupkxwpro.supabase.co` |

## Final State — Supabase prod (`gltwnfnkodzkupkxwpro`)

| Setting | Value |
|---------|-------|
| Auth → Providers → Google | Enabled with rotated Client ID + Secret |
| Auth → URL Configuration → Site URL | `https://dealdrop-khaki.vercel.app` |
| Auth → URL Configuration → Redirect URLs | `https://dealdrop-khaki.vercel.app/auth/callback`, `https://*.vercel.app/auth/callback` |

Supabase dev (`vhlbdcsxccaknccawfdj`) Auth config: Site URL + Redirect URLs unchanged. **Client Secret re-pasted** with the new rotated value (see deviation).

## Smoke Test (5/5 PASS)

| # | Action | Result |
|---|--------|--------|
| 1 | Open prod URL in incognito | Hero loads, 200 |
| 2 | Sign In → Continue with Google | Consent screen shown |
| 3 | Complete consent | Redirects to `/` with session |
| 4 | Header shows "Sign Out" | Yes |
| 5 | `SELECT … FROM auth.users` in PROD SQL | 1 row, fresh timestamp |

## Deviations

### 1. Client Secret rotation

Initial smoke test failed with:
```
error=server_error&error_code=unexpected_failure
&error_description=Unable+to+exchange+external+code:+4/0A
```

Root cause: Client Secret pasted into Supabase prod didn't match what Google had on file (likely paste-truncation hidden behind Supabase's `••••••` masking, or stale value drift).

Fix: rotated the Google OAuth Client Secret, re-pasted into BOTH Supabase projects. Documented in AUTH-08-OPS-CHECKLIST.md Part 3 as a future-troubleshooting reference plus a new row in the troubleshooting table.

### 2. Same Google account for smoke test

Operator has only one Google account (the same one used in dev). Plan acceptance asked for a fresh-on-DealDrop account; reused the existing one because PROD's `auth.users` is a brand-new database (dev users live in the dev project), so the smoke test still proves the create-user-on-first-OAuth flow on prod. Carries forward to Plan 07-08 — the price-drop alert email will land in the same inbox the operator signs up with, which is the canonical end-user flow anyway.

## Threat Mitigations

- T-07-13 (open redirect via /auth/callback): mitigated — callback Route Handler from Phase 2 unchanged; only allow-list entries added.
- T-07-14 (wrong OAuth client serves prod): accepted — single client serves both per CONTEXT.md (portfolio bar).
- T-07-15 (Client Secret leak during paste): mitigated — pasted into Supabase Auth (not env / code); Supabase masks after save.
- T-07-16 (`*.vercel.app/auth/callback` wildcard phishing): accepted — bounded risk for portfolio bar.

## Self-Check: PASSED

- [x] Google Cloud Console redirect URIs contain both dev + prod refs verbatim
- [x] Supabase prod Site URL = `https://dealdrop-khaki.vercel.app`
- [x] Supabase prod Redirect URLs contain both prod entry + `*.vercel.app` wildcard
- [x] Supabase prod Google provider enabled with valid Client ID + Secret
- [x] Smoke test: 5/5 PASS
- [x] Prod `auth.users` shows new row with operator's email + recent `last_sign_in_at`
- [x] Dev project Auth config unchanged (Site URL + Redirect URLs); only Client Secret re-pasted with rotated value
- [x] AUTH-08-OPS-CHECKLIST.md Part 3 + new troubleshooting row appended
- [x] 07-VERIFICATION.md DEP-04 sections (Google + Supabase + smoke test) appended
