---
phase: 2
slug: authentication-landing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-18
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None currently installed (Phase 1 did not ship a test framework). `tdd_mode: false` — manual smoke checklist is primary validation. |
| **Config file** | None — Wave 0 gap if any automated tests are added. |
| **Quick run command** | `cd dealdrop && npm run lint && npx tsc --noEmit` (static checks only until framework installed) |
| **Full suite command** | `cd dealdrop && npm run lint && npm run build` (build proves env validation chain + type correctness) |
| **Estimated runtime** | ~60–90 seconds (lint + tsc + next build) |

---

## Sampling Rate

- **After every task commit:** Run `npm run lint && npx tsc --noEmit` in `dealdrop/`
- **After every plan wave:** Run `npm run build` in `dealdrop/` (validates env chain + server/client boundary)
- **Before `/gsd-verify-work`:** Full manual smoke checklist must pass + build green
- **Max feedback latency:** ~90 seconds

---

## Per-Task Verification Map

Task IDs will be filled in after PLAN.md files are written. For now, requirement-level map:

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| AUTH-01 | Sign in with Google OAuth | Manual smoke | N/A — real Google redirect | ❌ manual | ⬜ pending |
| AUTH-02 | `/auth/callback` exchanges code → redirect `/` | Build + manual smoke | `npm run build` proves route compiles; manual click-through verifies | ✅ dealdrop/app/auth/callback/route.ts (Wave 1) | ⬜ pending |
| AUTH-03 | Sign In button opens modal | Manual smoke | Visual in browser | ❌ manual | ⬜ pending |
| AUTH-04 | `openAuthModal()` exported from provider | Static check + manual | `grep -r "openAuthModal" dealdrop/src` → at least 2 matches (provider + consumer callsite) | ✅ dealdrop/src/components/auth/AuthModalProvider.tsx | ⬜ pending |
| AUTH-05 | Modal has single "Continue with Google" button | Manual smoke | Visual in browser | ❌ manual | ⬜ pending |
| AUTH-06 | Sign Out ends session → hero returns | Manual smoke | Click-through | ❌ manual | ⬜ pending |
| AUTH-07 | proxy.ts refreshes session cookies | Manual smoke + static check | `grep getClaims dealdrop/proxy.ts` → present; verify cookies persist across nav in browser devtools | ✅ dealdrop/proxy.ts | ⬜ pending |
| AUTH-08 | OAuth redirect URIs registered | Manual ops checklist | External config — must be verified against Supabase + Google consoles | ❌ manual | ⬜ pending |
| HERO-01 | Tagline "Never miss a price drop" | Static check | `grep -r "Never miss a price drop" dealdrop/src/components/hero` → exact match | ✅ dealdrop/src/components/hero/Hero.tsx | ⬜ pending |
| HERO-02 | Feature cards present (3x) | Static check + manual | `grep -c "FeatureCard" dealdrop/src/components/hero/Hero.tsx` → 3 | ✅ dealdrop/src/components/hero/{Hero,FeatureCard}.tsx | ⬜ pending |
| HERO-03 | Header with wordmark + Sign In | Static check + manual | `grep -r "DealDrop" dealdrop/src/components/header/Header.tsx` | ✅ dealdrop/src/components/header/Header.tsx | ⬜ pending |
| HERO-04 | "Made with love" credit | Static check | `grep -r "Made with love\|Made with" dealdrop/src/components/hero` → 1 match | ✅ dealdrop/src/components/hero/Hero.tsx | ⬜ pending |
| HERO-05 | Mobile-responsive layout | Manual smoke | Resize browser to <640px; cards stack to 1 column | ❌ manual | ⬜ pending |
| POL-01 | Sonner toast infrastructure | Static check + manual | `grep "<Toaster" dealdrop/app/layout.tsx` → present; toast fires on sign-out | ✅ dealdrop/app/layout.tsx, dealdrop/components/ui/sonner.tsx | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] No automated test framework install required (`tdd_mode: false`, portfolio bar)
- [ ] AUTH-08 ops checklist must be produced as part of plans so user can execute the Google Cloud Console + Supabase dashboard configuration before the smoke test
- [ ] Manual smoke test checklist (below) must be included in a phase plan's acceptance criteria so executor prints it for the user to run

*If scope expands to include Vitest: Wave 0 would add `npm install -D vitest @testing-library/react @testing-library/dom jsdom` + `vitest.config.ts` + `tests/setup.ts`. Not required for this phase.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full Google OAuth round-trip | AUTH-01, AUTH-02, AUTH-03 | Requires real Google account + browser redirect; cannot be unit tested without Playwright + Google test account (out of scope for portfolio bar) | Start dev server → click Sign In → Continue with Google → complete Google login → verify redirect to `/` shows dashboard shell |
| Sign-out cookie clear | AUTH-06 | Verifies browser cookie state after Server Action redirect | Click Sign Out → DevTools → Application → Cookies → confirm `sb-*` auth cookies removed; hero visible; "Signed out" toast |
| OAuth URI registration | AUTH-08 | External config (Supabase dashboard + Google Cloud Console) outside repo | Follow the AUTH-08 ops checklist produced by the planner; verify both consoles show the registered URIs before running the smoke test |
| Mobile responsive collapse | HERO-05 | Visual correctness — no programmatic assertion | Resize browser window to <640px; confirm 3-card grid collapses to 1 column; tagline remains centered |
| Dark-mode Shadcn tokens | D-15 closes Phase 1 deferred | Closes Phase 1 deferred visual check at first real Shadcn consumer | Toggle OS dark mode; verify Dialog, Cards, Buttons use correct zinc tokens; focus ring visible on keyboard Tab |
| Env validation chain | D-15 closure | Build-time verification that `dealdrop/src/lib/env.ts` fires when imported by auth code path | `npm run build` succeeds; temporarily remove an env var and rebuild → expect Zod error in build log; restore env var |

---

## Manual Smoke Test Checklist (Primary Validation)

```
PHASE 2 SMOKE TEST — Run on localhost before marking phase complete

Pre-flight:
[ ] .env.local populated with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
[ ] AUTH-08 ops checklist completed: Google Cloud Console has Supabase callback URI; Supabase Auth has localhost + Vercel redirect URLs

Build + type check:
[ ] cd dealdrop && npm run build → succeeds (proves env validation chain + type correctness — closes D-15)
[ ] Remove one env var, re-run build → fails with Zod error; restore env var

Auth flow (happy path):
[ ] cd dealdrop && npm run dev
[ ] Visit http://localhost:3000 → Hero visible, tagline "Never miss a price drop" exact match
[ ] Three feature cards render (Multi-site support, Instant email alerts, Price history)
[ ] "Made with love" credit visible below hero
[ ] Header shows "DealDrop" wordmark left, "Sign in" button right
[ ] Click Sign in → Shadcn Dialog opens with title "Sign in to DealDrop", subtitle "Sign in to start tracking prices", single button "Continue with Google"
[ ] Click Continue with Google → redirected to accounts.google.com
[ ] Complete Google login → redirected to http://localhost:3000/
[ ] Dashboard shell visible (placeholder copy), hero is gone, header shows "Sign out"
[ ] Reload the page → still shows dashboard shell (session persisted via proxy.ts refresh)

Sign-out flow:
[ ] Click Sign out → redirected to /, hero visible, "Signed out" toast appears via Sonner
[ ] DevTools > Application > Cookies → sb-* cookies cleared

Error path:
[ ] Visit http://localhost:3000/?auth_error=1 directly → error toast appears, URL cleans

Responsive + theming:
[ ] Resize viewport < 640px → feature cards stack to 1 column, header compresses
[ ] Toggle OS dark mode → zinc tokens render correctly for Dialog, Cards, Buttons; focus ring visible on Tab
[ ] Buttons (all 5 variants) visually correct in both themes — closes Phase 1 deferred Shadcn visual check
```

---

## Validation Sign-Off

- [ ] All tasks will have `<automated>` verify via lint/tsc/build OR are explicitly listed in Manual-Only Verifications above
- [ ] Sampling continuity: lint + tsc run after every task commit; build runs after every wave
- [ ] Wave 0 covers AUTH-08 ops checklist + smoke checklist delivery
- [ ] No watch-mode flags in any automated command
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` will be set when planner has mapped every task to a verification lane above

**Approval:** pending
