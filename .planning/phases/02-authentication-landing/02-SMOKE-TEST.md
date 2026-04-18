# Phase 2 Smoke Test

> Run this AFTER all Phase 2 plans (01, 02, 03, 04) are committed and AFTER the AUTH-08 ops checklist is complete. If Plan 04 Task 3 was executed as part of `/gsd-execute-phase`, this file is a permanent record of the same test; re-run it here for a fresh localhost verification before `/gsd-verify-work`.

## Pre-flight

- [ ] `.env.local` has all 7 env vars populated (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FIRECRAWL_API_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, `RESEND_FROM_EMAIL`).
- [ ] [AUTH-08-OPS-CHECKLIST.md](AUTH-08-OPS-CHECKLIST.md) — all 5 verification checkboxes passed.

## Build + type check (closes D-15)

```bash
cd dealdrop
npm run lint        # expected: exit 0
npx tsc --noEmit    # expected: exit 0
npm run build       # expected: exit 0; route tree includes /, /auth/callback, ƒ Proxy (Middleware)
```

- [ ] All three commands exit 0.

### D-15 env-validation chain negative case

```bash
cd dealdrop
cp .env.local .env.local.bak
grep -v '^CRON_SECRET=' .env.local.bak > .env.local
npm run build      # EXPECTED: FAILS with "Invalid environment variables: [{ path: ['CRON_SECRET'] ... }]"
mv .env.local.bak .env.local
npm run build      # expected: exit 0
```

- [ ] First build fails with Zod error naming `CRON_SECRET`.
- [ ] Second build (after restore) exits 0.
- [ ] This closes Phase 1 VERIFICATION human_verification[0] — record this in the Phase 2 VERIFICATION artifact: **"Phase 1 env-validation chain verified at Phase 2 build time via auth code path"**.

## Auth happy-path (browser required)

```bash
cd dealdrop && npm run dev
# Open http://localhost:3000 in a browser
```

- [ ] Hero visible: tagline exactly `Never miss a price drop`
- [ ] Subtitle matches: `Paste any product URL. We'll check the price daily and email you the moment it drops.`
- [ ] Three feature cards render with Lucide icons in accent (`text-primary`):
  - [ ] `Multi-site support` (Globe icon)
  - [ ] `Instant email alerts` (BellRing icon)
  - [ ] `Price history` (LineChart icon)
- [ ] Footer credit visible: `Made with love`
- [ ] Header: `DealDrop` wordmark left, `Sign in` button (default/accent variant) right
- [ ] Click `Sign in` — Shadcn Dialog opens with:
  - [ ] Title exactly `Sign in to DealDrop`
  - [ ] Description exactly `Sign in to start tracking prices`
  - [ ] Single full-width `Continue with Google` button (no Google "G" mark, no privacy links)
  - [ ] ESC closes the dialog; ring-outside click closes; returning focus to `Sign in` button
- [ ] Click `Continue with Google`:
  - [ ] Button disables + shows Loader2 spinner
  - [ ] Browser redirects to `accounts.google.com`
- [ ] Complete Google sign-in:
  - [ ] Browser redirects through `{project-ref}.supabase.co/auth/v1/callback`
  - [ ] Lands at `http://localhost:3000/` (or `http://127.0.0.1:3000/`)
  - [ ] DashboardShell visible: heading `Welcome back` + placeholder copy
  - [ ] Header now shows `Sign out` (outline variant)
  - [ ] Hero is gone
- [ ] Reload page → DashboardShell still visible (proves AUTH-07 session refresh)
- [ ] DevTools → Application → Cookies → `sb-*` cookies present

## Sign-out flow

- [ ] Click `Sign out`:
  - [ ] Button disables, label swaps to `Signing out…`
  - [ ] Page redirects to `/`, Hero visible again
  - [ ] Sonner toast appears top-center with text exactly `Signed out`
  - [ ] URL cleans back to `/` (no `?signed_out=1` remaining)
- [ ] DevTools → Application → Cookies → `sb-*` cookies cleared

## Error-path

- [ ] Directly visit `http://localhost:3000/?auth_error=1`:
  - [ ] Sonner error toast `Sign in failed. Please try again.`
  - [ ] URL cleans to `/`

## Responsive (HERO-05)

- [ ] Resize viewport to 320–639px:
  - [ ] Feature cards stack to 1 column
  - [ ] Tagline clamps from 48px to 32px (`text-3xl`)
  - [ ] Header compresses but remains usable; no horizontal scroll
- [ ] Resize to ≥640px: grid returns to 3 columns.

## Closes Phase 1 deferred visual checks

- [ ] OS dark-mode toggle → Dialog, FeatureCards, Buttons render correct zinc tokens in both light + dark.
- [ ] Tab-navigate through `Sign in` button — focus ring visible (Shadcn `focus-visible:ring-3`).
- [ ] These two check closes 01-VERIFICATION human_verification[2] (Shadcn Button visual) and partial of [0] (env-validation chain — already closed in D-15 negative-case above).

## AUTH-04 infra contract (grep-level)

```bash
grep -r "openAuthModal\|useAuthModal" dealdrop/src/components
```

- [ ] At least 2 matches (AuthModalProvider definition + SignInButton consumer). Phase 4 will add a 3rd when it wires the Add Product form.

## Sign-off

If every checkbox above is ticked, Phase 2 is done. Proceed to `/gsd-verify-work`.

If any checkbox fails, record which one + symptoms, then either:
- Run `/gsd-debug <phase>` to investigate, or
- Run `/gsd-plan-phase --gaps` after verification produces a VERIFICATION.md
