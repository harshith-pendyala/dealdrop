---
phase: 02-authentication-landing
plan: 04
subsystem: auth
tags: [nextjs-app-router, rsc, supabase-auth, oauth, shadcn-dialog, sonner, hero, layout]

requires:
  - phase: 02-authentication-landing (waves 1+2)
    provides: "Shadcn primitives, /auth/callback route, proxy.ts session refresh, auth client islands, signOut Server Action"
provides:
  - "End-to-end Phase 2 user flow on localhost — Hero, Header, AuthModal, OAuth, DashboardShell, sign-out toast"
  - "app/page.tsx RSC auth gate using supabase.auth.getUser() (not getSession)"
  - "app/layout.tsx wiring: AuthModalProvider + Sonner Toaster + Suspense-wrapped AuthToastListener"
  - "Phase 1 Shadcn Button visual verification closed (Dialog, Cards, Buttons now render on /)"
  - "POL-01 pulled forward from Phase 7 — Sonner toast infrastructure now in place"
affects: [phase 3 scraping UI, phase 4 add product form]

tech-stack:
  added: []
  patterns:
    - "RSC auth gate: await createClient() + getUser() → branch Hero vs DashboardShell"
    - "Suspense-wrapped client island for useSearchParams consumers (Next.js 16 requirement)"
    - "Toaster + AuthToastListener as layout-level siblings of AuthModalProvider"

key-files:
  created:
    - dealdrop/src/components/hero/Hero.tsx
    - dealdrop/src/components/hero/FeatureCard.tsx
    - dealdrop/src/components/header/Header.tsx
    - dealdrop/src/components/dashboard/DashboardShell.tsx
    - dealdrop/app/page.tsx
  modified:
    - dealdrop/app/layout.tsx

key-decisions:
  - "Executed inline by orchestrator (subagent spawning was proven unreliable in Waves 1–2 due to sandbox write-gates); Wave 3's single autonomous-false plan benefits from inline execution anyway for the checkpoint."
  - "Used getUser() not getSession() per Pitfall 2 — session fixation resistance."
  - "AuthToastListener and Toaster are siblings of AuthModalProvider (not nested) — toasts render at layout root, decoupled from modal context."

patterns-established:
  - "Auth-gated homepage: RSC server-verifies user, renders Header + Hero|DashboardShell in one pass"
  - "Layout-level toast root: <Toaster position='top-center' richColors /> + <Suspense fallback={null}><AuthToastListener /></Suspense>"
  - "Header anatomy: static h-14, wordmark span (not link), contextual auth button right-aligned"

requirements-completed:
  - AUTH-01
  - AUTH-03
  - AUTH-06
  - HERO-01
  - HERO-02
  - HERO-03
  - HERO-04
  - HERO-05
  - POL-01

duration: ~12min (Tasks 1–2 inline execution + Task 3 user smoke test)
completed: 2026-04-19
---

# Phase 02-04: Hero + App Shell Wiring Summary

**Phase 2 ships end-to-end. Hero with locked copy, contextual header, Shadcn Dialog OAuth modal, getUser-gated home route, Suspense-wrapped toast listener. User-approved after full 14-step OAuth smoke test.**

## Performance

- **Duration:** ~12 min (Tasks 1–2 execution + user smoke test)
- **Started:** 2026-04-18
- **Completed:** 2026-04-19
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files created:** 5
- **Files modified:** 1

## Accomplishments
- **Phase 2 flows end-to-end** — Hero → Sign In modal → Google OAuth → `/auth/callback` session exchange → DashboardShell. Sign-out round-trip clears cookies, redirects, fires toast, cleans URL.
- **Phase 1 Create-Next-App scaffold fully removed** from `app/page.tsx` (closes 01-VERIFICATION Anti-Pattern).
- **Phase 1 Shadcn Button visual verification closed naturally** — Dialog, Card, Button (`default` + `outline` variants) now render on `/` across light + dark mode with visible focus ring.
- **POL-01 pulled forward from Phase 7** — Sonner Toaster infrastructure shipped with Phase 2 via D-13.
- **AUTH-04 infra contract verified** — `grep -r "openAuthModal\|useAuthModal" dealdrop/src/components` returns ≥ 5 matches (provider def + SignInButton consumer + AuthModal consumer + contract exports). Phase 4 Add Product form can plug in with zero churn.

## Task Commits

1. **Task 1: Hero + FeatureCard + Header + DashboardShell** — `c8aa032` (feat)
2. **Task 2: app/page.tsx auth branch + app/layout.tsx wiring** — `716bdd5` (feat)
3. **Task 3: Human-verify OAuth smoke test** — approved by user (no commit)

## Files Created/Modified
- `dealdrop/src/components/hero/Hero.tsx` — RSC with locked tagline, subtitle, 3-card grid, credit line
- `dealdrop/src/components/hero/FeatureCard.tsx` — RSC, Shadcn Card + Lucide icon + title + blurb
- `dealdrop/src/components/header/Header.tsx` — RSC h-14 header, wordmark span, contextual auth button
- `dealdrop/src/components/dashboard/DashboardShell.tsx` — RSC placeholder with "Welcome back" copy
- `dealdrop/app/page.tsx` — RSC `getUser()` auth gate, branches Hero/DashboardShell
- `dealdrop/app/layout.tsx` — (+) Suspense, Toaster, AuthModalProvider, AuthToastListener imports + body wiring; all Phase 1 Geist fonts + DealDrop metadata preserved verbatim

## Build + Route Tree

```
✓ npm run lint       → exit 0
✓ npx tsc --noEmit   → exit 0
✓ npm run build      → exit 0

Route (app)
┌ ƒ /              (dynamic — getUser)
├ ○ /_not-found
└ ƒ /auth/callback
ƒ Proxy (Middleware)
```

## Human Smoke Test Result

**Approved** by user after running all 14 steps + D-15 env-validation recovery.

## D-15 Env-Validation Closure

> Phase 1 env-validation chain verified at Phase 2 build time via auth code path. `npm run build` exits 0 with all env vars populated; removing `CRON_SECRET` from `.env.local` re-runs build with expected Zod failure `Invalid environment variables: [{ path: ['CRON_SECRET'] ... }]`; restoring the var restores the green build. Reached via `app/page.tsx` → `@/lib/supabase/server` → `@/lib/env` AND `app/auth/callback/route.ts` → `@/lib/supabase/server` → `@/lib/env`.

This sentence should appear in `02-VERIFICATION.md` at phase close.

## Phase 1 Deferred Items — Visual Check Status

- **Shadcn Button variants verified on-screen:** `default` (Sign In CTA, Continue with Google modal CTA), `outline` (Sign Out). Remaining Shadcn Button variants (`ghost`, `destructive`, `secondary`, `link`) are not used anywhere in Phase 2 — deferred naturally to later phases. Not a blocker.
- **Dark mode toggle:** Dialog, Cards, Buttons render with correct zinc tokens in both light + dark modes.
- **Focus ring visibility:** Tab navigation through header surfaces visible focus ring on Sign In button and inside the modal.

## Phase 1 WR-03 Regression Check

No regression. `http://127.0.0.1:3000` loopback works in full OAuth flow on localhost (config.toml fix from Plan 02-02 holds).

## AUTH-04 Infrastructure Export Confirmation

`grep -r "openAuthModal\|useAuthModal" dealdrop/src/components` returns ≥ 5 matches across:
- `AuthModalProvider.tsx` — context definition + `useAuthModal` hook export
- `AuthModal.tsx` — consumes `useAuthModal` for open state
- `SignInButton.tsx` — consumes `useAuthModal` for `openAuthModal` callback

Phase 4 Add Product form is pre-cleared to `import { useAuthModal } from '@/components/auth/AuthModalProvider'` and gate on `openAuthModal()`.

## Decisions Made
- Executed inline by orchestrator rather than via spawned subagent — Wave 2 had proven the subagent-spawn path unreliable in this session. Wave 3 is a checkpoint plan anyway, so inline is the natural path.
- `user` prop in `DashboardShell` renamed to `_user` to satisfy `@typescript-eslint/no-unused-vars` under strict mode (planned — spec'd in the plan action).
- All copy strings pulled verbatim from UI-SPEC Copywriting Contract — zero rephrasing.

## Deviations from Plan

None on code. One execution-path note:

**1. [Execution path] Inline orchestrator execution instead of spawned gsd-executor**
- **Found during:** Start of Wave 3
- **Issue:** Waves 1–2 had two separate sandbox incidents affecting subagents in worktrees: Plan 02-02 hit a write-gate mid-run after `.env.local` mutation; Plan 02-03's subagent hit a blanket write-deny at launch with zero mutations. Orchestrator inline execution had a 100% hit rate.
- **Fix:** Executed Tasks 1 and 2 inline; verified every done-criterion per plan; presented Task 3 checkpoint to user via text channel.
- **Impact:** Zero on correctness or deliverables. Plan shipped byte-for-byte.

---

**Total deviations:** 1 (execution-path only, no code divergence)
**Impact on plan:** None on outcomes. All must_haves satisfied.

## Issues Encountered
- Subagent sandbox gates (shared root cause with 02-02 and 02-03). Candidate for `/gsd-debug` investigation in a future session if it recurs.

## User Setup Required
None for code. Ops setup documented in `AUTH-08-OPS-CHECKLIST.md`; completion is a prerequisite for OAuth smoke test, which the user completed before approving the checkpoint.

## Next Phase Readiness
- Phase 2 is feature-complete and user-verified.
- Phase 3 (scraping) and Phase 4 (add product) can now build on a working auth foundation.
- Phase 4 can import `useAuthModal` directly — no refactor needed.

---
*Phase: 02-authentication-landing*
*Completed: 2026-04-19*
