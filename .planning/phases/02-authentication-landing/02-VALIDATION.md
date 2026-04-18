---
phase: 2
slug: authentication-landing
status: draft
nyquist_compliant: true
wave_0_complete: true
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

| Task ID | Plan | Wave | Requirement(s) | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|----------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01 Task 1 | 02-01 | 1 | AUTH-05, POL-01, HERO-02 | T-02-01, T-02-02, T-02-03 | Shadcn CLI pulls from official registry only; no third-party registries; package-lock.json locks sonner integrity hash | build + static | `cd dealdrop && test -f components/ui/dialog.tsx && test -f components/ui/card.tsx && test -f components/ui/sonner.tsx && grep -q '"sonner"' package.json && npx tsc --noEmit` | ⬜ pending | ⬜ pending |
| 02-02 Task 1 | 02-02 | 1 | AUTH-07 | T-02-04, T-02-07 | getClaims() validates JWT locally; supabaseResponse rebuild in setAll prevents dropped Set-Cookie headers; no env module in edge runtime | static | `cd dealdrop && grep -q "getClaims" proxy.ts && grep -q "createServerClient" proxy.ts && grep -q "supabaseResponse" proxy.ts && ! grep -q "from ['\"]@/lib/env['\"]" proxy.ts && npx tsc --noEmit` | ⬜ pending | ⬜ pending |
| 02-02 Task 2 | 02-02 | 1 | AUTH-02 | T-02-05, T-02-06, T-02-08, T-02-09 | exchangeCodeForSession with PKCE; redirect hardcoded to origin/ or origin/?auth_error=1; no user-controlled next param; no service role key | build + static | `cd dealdrop && test -f app/auth/callback/route.ts && grep -q "exchangeCodeForSession" app/auth/callback/route.ts && grep -q 'auth_error=1' app/auth/callback/route.ts && ! grep -q 'https://127.0.0.1:3000' supabase/config.toml && npx tsc --noEmit && npm run build` | ⬜ pending | ⬜ pending |
| 02-03 Task 1 | 02-03 | 2 | AUTH-04, AUTH-06 | T-02-11, T-02-12, T-02-15 | 'use server' directive enables cookie writes; signOut calls supabase.auth.signOut() server-side; no admin client | static | `cd dealdrop && test -f src/actions/auth.ts && test -f src/components/auth/AuthModalProvider.tsx && head -1 src/actions/auth.ts | grep -q "'use server'" && grep -q "export async function signOut" src/actions/auth.ts && grep -q "redirect('/?signed_out=1')" src/actions/auth.ts && grep -q "export function useAuthModal" src/components/auth/AuthModalProvider.tsx && grep -q "openAuthModal" src/components/auth/AuthModalProvider.tsx` | ⬜ pending | ⬜ pending |
| 02-03 Task 2 | 02-03 | 2 | AUTH-01, AUTH-03, AUTH-05, AUTH-06 | T-02-10, T-02-13, T-02-15 | redirectTo uses window.location.origin (not hardcoded); no server client import in browser components; generic error copy only | static | `cd dealdrop && test -f src/components/auth/AuthModal.tsx && grep -q "Sign in to DealDrop" src/components/auth/AuthModal.tsx && grep -q "window.location.origin" src/components/auth/AuthModal.tsx && grep -q "from '@/lib/supabase/browser'" src/components/auth/AuthModal.tsx && ! grep -q "from '@/lib/supabase/server'" src/components/auth/AuthModal.tsx && grep -q 'variant="default"' src/components/auth/SignInButton.tsx && grep -q 'variant="outline"' src/components/auth/SignOutButton.tsx && npx tsc --noEmit` | ⬜ pending | ⬜ pending |
| 02-03 Task 3 | 02-03 | 2 | AUTH-04 (partial), POL-01 | T-02-14 | toast from raw sonner (not server); router.replace cleans URL; no privileged action triggered by crafted query params | static | `cd dealdrop && test -f src/components/auth/AuthToastListener.tsx && grep -q "from 'sonner'" src/components/auth/AuthToastListener.tsx && grep -q "signed_out" src/components/auth/AuthToastListener.tsx && grep -q "auth_error" src/components/auth/AuthToastListener.tsx && grep -q "router.replace" src/components/auth/AuthToastListener.tsx && ! grep -q "from '@/components/ui/sonner'" src/components/auth/AuthToastListener.tsx && npx tsc --noEmit` | ⬜ pending | ⬜ pending |
| 02-04 Task 1 | 02-04 | 3 | HERO-01, HERO-02, HERO-03, HERO-04, HERO-05 | T-02-19, T-02-20 | no client directive on RSC; aria-hidden on icons; no PII rendered in DashboardShell placeholder | static | `cd dealdrop && grep -q "Never miss a price drop" src/components/hero/Hero.tsx && grep -q "Made with love" src/components/hero/Hero.tsx && grep -q "DealDrop" src/components/header/Header.tsx && grep -q 'aria-hidden="true"' src/components/hero/FeatureCard.tsx && grep -q "Welcome back" src/components/dashboard/DashboardShell.tsx && npx tsc --noEmit` | ⬜ pending | ⬜ pending |
| 02-04 Task 2 | 02-04 | 3 | AUTH-01, AUTH-03, AUTH-06, POL-01 | T-02-16, T-02-17, T-02-18, T-02-20 | getUser() (Auth-server verified) not getSession(); AuthToastListener wrapped in Suspense; no admin client; no service role key in any modified file | build + static | `cd dealdrop && grep -q "getUser" app/page.tsx && ! grep -q "getSession" app/page.tsx && grep -q "AuthModalProvider" app/layout.tsx && grep -q "Suspense fallback={null}" app/layout.tsx && grep -q "AuthToastListener" app/layout.tsx && grep -q 'position="top-center"' app/layout.tsx && npx tsc --noEmit && npm run build` | ⬜ pending | ⬜ pending |
| 02-04 Task 3 | 02-04 | 3 | AUTH-01, AUTH-02, AUTH-03, AUTH-06, AUTH-07, HERO-01..05, POL-01 | All T-02-* | Full OAuth round-trip with real Google account; session persists across reload (AUTH-07 proxy); toasts fire; dark-mode zinc tokens; focus ring visible | checkpoint:human-verify | Manual — see Plan 04 Task 3 how-to-verify steps 1–14 and 02-SMOKE-TEST.md | ⬜ pending | ⬜ pending |
| 02-05 Task 1 | 02-05 | 1 | AUTH-04, POL-01 | T-02-22 | REQUIREMENTS.md reflects D-07 AUTH-04 split and D-13 POL-01 move; no wrong phase assignment | static | `grep -q "POL-01 | Phase 2" .planning/REQUIREMENTS.md && ! grep -q "POL-01 | Phase 7" .planning/REQUIREMENTS.md && grep -q "AUTH-04.*Phase 2.*hook\|AUTH-04.*Phase 2 / Phase 4\|AUTH-04.*Phase 2 (hook)" .planning/REQUIREMENTS.md` | ⬜ pending | ⬜ pending |
| 02-05 Task 2 | 02-05 | 1 | AUTH-08 | T-02-21, T-02-22, T-02-23 | Checklist does not ask user to commit secrets; URIs derived from verified RESEARCH.md; Supabase project ref from STATE.md | static | `test -f .planning/phases/02-authentication-landing/AUTH-08-OPS-CHECKLIST.md && grep -q "vhlbdcsxccaknccawfdj" .planning/phases/02-authentication-landing/AUTH-08-OPS-CHECKLIST.md && grep -q "supabase.co/auth/v1/callback" .planning/phases/02-authentication-landing/AUTH-08-OPS-CHECKLIST.md` | ⬜ pending | ⬜ pending |
| 02-05 Task 3 | 02-05 | 1 | AUTH-08, AUTH-04, POL-01 | — | Standalone smoke-test document mirrors all locked copy strings from UI-SPEC Copywriting Contract | static | `test -f .planning/phases/02-authentication-landing/02-SMOKE-TEST.md && grep -q "Never miss a price drop" .planning/phases/02-authentication-landing/02-SMOKE-TEST.md && grep -q "Sign in to DealDrop" .planning/phases/02-authentication-landing/02-SMOKE-TEST.md` | ⬜ pending | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] No automated test framework install required (`tdd_mode: false`, portfolio bar)
- [x] AUTH-08 ops checklist must be produced as part of plans so user can execute the Google Cloud Console + Supabase dashboard configuration before the smoke test — delivered by Plan 02-05 Task 2
- [x] Manual smoke test checklist (below) must be included in a phase plan's acceptance criteria so executor prints it for the user to run — delivered by Plan 02-04 Task 3 + Plan 02-05 Task 3

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

- [x] All tasks will have `<automated>` verify via lint/tsc/build OR are explicitly listed in Manual-Only Verifications above
- [x] Sampling continuity: lint + tsc run after every task commit; build runs after every wave
- [x] Wave 0 covers AUTH-08 ops checklist + smoke checklist delivery
- [x] No watch-mode flags in any automated command
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` — every task mapped to a verification lane in the Per-Task Verification Map above

**Approval:** approved 2026-04-18
