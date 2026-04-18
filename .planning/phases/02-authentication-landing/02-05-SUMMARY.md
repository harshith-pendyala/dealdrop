---
phase: 02-authentication-landing
plan: 05
subsystem: documentation
tags: [requirements, traceability, oauth-ops, smoke-test, handoff]
dependency_graph:
  requires:
    - .planning/REQUIREMENTS.md (Traceability table prior state)
    - .planning/phases/02-authentication-landing/02-CONTEXT.md (D-07, D-13, D-15)
    - .planning/phases/02-authentication-landing/02-RESEARCH.md (OAuth Redirect URI Registration, project ref)
    - .planning/phases/02-authentication-landing/02-VALIDATION.md (Manual Smoke Test Checklist)
    - .planning/phases/02-authentication-landing/02-UI-SPEC.md (Copywriting Contract locked strings)
    - .planning/phases/01-foundation-database/01-VERIFICATION.md (Phase 1 deferred items)
  provides:
    - Updated REQUIREMENTS.md traceability reflecting D-07 (AUTH-04 split) + D-13 (POL-01 move)
    - Standalone AUTH-08 operator checklist for Google + Supabase redirect URI registration
    - Printable standalone Phase 2 smoke test document
    - Phase 7 scope-exclusion signal (POL-01 already handled in Phase 2)
  affects:
    - Phase 7 planning (must exclude Sonner setup — POL-01 handled in Phase 2)
    - Plan 04 Task 3 verification (gated on AUTH-08 checklist completion)
    - /gsd-verify-work reference material (smoke test can be re-run independently)
tech_stack:
  added: []
  patterns:
    - Explicit documentation of cross-phase requirement splits in Traceability footnotes
    - Operator checklists kept separate from plan docs for direct user handoff
    - Smoke test mirroring (duplicated in Plan 04 Task 3 + this standalone file) so verification can run without re-opening plan
key_files:
  created:
    - .planning/phases/02-authentication-landing/AUTH-08-OPS-CHECKLIST.md (90 lines)
    - .planning/phases/02-authentication-landing/02-SMOKE-TEST.md (111 lines)
  modified:
    - .planning/REQUIREMENTS.md (AUTH-04 row, POL-01 row, 2 footnote paragraphs, last-updated date)
decisions:
  - "D-07 formally documented in Traceability: AUTH-04 split Phase 2 (hook) / Phase 4 (trigger)"
  - "D-13 formally documented in Traceability: POL-01 moved Phase 7 → Phase 2"
  - "Footnote-under-table approach chosen over 4-column table header (minimizes blast radius to unrelated rows)"
  - "Supabase project ref `vhlbdcsxccaknccawfdj` inlined in checklist rather than parameterized (portfolio bar, not multi-env)"
  - "Smoke test duplicates Plan 04 Task 3 content intentionally — standalone file usable during /gsd-verify-work without re-loading plan"
metrics:
  duration: ~10 minutes
  tasks: 3
  files: 3
  commits: 3
  completed: "2026-04-18"
---

# Phase 2 Plan 05: Requirements Sync + Ops Documentation Summary

**One-liner:** Documentation-only plan closing two planning-context handoff items (D-07 AUTH-04 split, D-13 POL-01 move) in REQUIREMENTS.md and shipping two user-facing artifacts (AUTH-08 ops checklist + Phase 2 smoke test) that unblock OAuth configuration and verification respectively.

## What Was Built

Three documentation artifacts, zero code changes, zero dependencies on Plans 01-04:

### 1. REQUIREMENTS.md Traceability sync (Task 1)

**Diff summary:**

| Row | Before | After |
|-----|--------|-------|
| AUTH-04 | `Phase 2` | `Phase 2 (hook) / Phase 4 (trigger)` |
| POL-01 | `Phase 7` | `Phase 2` |

**Footnote paragraphs added below Traceability table:**

- **AUTH-04:** Links to Phase 2 CONTEXT.md D-07. Clarifies Phase 2 ships `useAuthModal()` + `openAuthModal()` hook infrastructure; Phase 4 wires the Add Product form submit-while-logged-out path. Requirement SATISFIED only when both phases complete.
- **POL-01:** Links to Phase 2 CONTEXT.md D-13. Documents Sonner pulled forward because the sign-out flow requires the "Signed out" toast (D-12). Explicitly flags **"Phase 7 Polish scope should exclude Sonner setup"** so Phase 7 planner doesn't re-cover it.

Last-updated date bumped to 2026-04-18 with a note. Coverage line preserved at 76/76.

**Commit:** `8644b05`

### 2. AUTH-08-OPS-CHECKLIST.md (Task 2)

**Path:** `.planning/phases/02-authentication-landing/AUTH-08-OPS-CHECKLIST.md`
**Length:** 90 lines

**Structure:**
- **Audience/timing header** — explicitly for the user (not Claude), run before Plan 04 Task 3 smoke test, ~15 min once
- **Key concept** — disambiguates the two callback URIs (Supabase's `auth/v1/callback` vs DealDrop's `/auth/callback`) and where each goes
- **Part 1 — Google Cloud Console** — 6 steps with exact URIs and project ref `vhlbdcsxccaknccawfdj`
- **Part 2 — Supabase Auth Dashboard** — 7 steps with the full redirect URL set (`localhost:3000`, `127.0.0.1:3000`, production vercel, `*.vercel.app` wildcard)
- **Verification checklist** — 5 gates to check off before proceeding to smoke test (including the Plan 02 Task 2b `http://` vs `https://` fix for `127.0.0.1`)
- **Troubleshooting table** — 5 common failure modes (redirect_uri_mismatch, missing DealDrop redirect, config.toml typo, invalid client, unverified app warning)

**Wildcard clarification:** Google does NOT support wildcards; Supabase DOES. Documented explicitly to prevent the most common copy-paste mistake.

**Commit:** `c6896a4`

### 3. 02-SMOKE-TEST.md (Task 3)

**Path:** `.planning/phases/02-authentication-landing/02-SMOKE-TEST.md`
**Length:** 111 lines

**Sections:**
- **Pre-flight** — 7 env vars populated, AUTH-08 checklist passed
- **Build + type check** — `npm run lint`, `npx tsc --noEmit`, `npm run build` all exit 0
- **D-15 env-validation chain negative case** — remove `CRON_SECRET` → build fails with Zod error → restore → build passes. **This closes Phase 1 VERIFICATION human_verification[0]** (deferred env-validation item from Phase 1).
- **Auth happy-path** — full browser test: hero visible with all locked strings, sign-in modal opens with exact locked copy, OAuth round-trip lands at `/`, DashboardShell renders, session persists across reload
- **Sign-out flow** — loading state, redirect, Sonner toast `Signed out`, cookies cleared
- **Error-path** — `?auth_error=1` shows `Sign in failed. Please try again.` toast
- **Responsive (HERO-05)** — 320-639px stacking, ≥640px 3-column grid
- **Phase 1 deferred visual checks** — dark-mode tokens + focus-ring visibility; closes 01-VERIFICATION human_verification[2]
- **AUTH-04 infra contract** — `grep -r "openAuthModal\|useAuthModal"` returns at least 2 matches

All 11 locked copy strings from UI-SPEC Copywriting Contract appear verbatim in the checklist.

**Commit:** `9de7f1e`

## Decisions Made

- **Footnote approach vs 4-column table:** Chose footnote paragraphs below the Traceability table instead of adding a Notes column, to minimize blast radius on unrelated rows and keep the markdown table simple. Both D-07 and D-13 referenced by name in the footnotes for traceability.
- **Project ref inlining:** `vhlbdcsxccaknccawfdj` is inlined throughout the ops checklist (not parameterized) because this is a portfolio-bar project with a single dev Supabase project. If it's ever swapped, grep-and-replace is trivial.
- **Smoke test duplication is intentional:** The same content exists in Plan 04 Task 3 and here. Plan 04 Task 3 is for the in-flight executor; 02-SMOKE-TEST.md is for `/gsd-verify-work` re-runs without loading the full plan file.
- **Phase 7 scope exclusion:** The POL-01 footnote contains a **bold imperative** — "Phase 7 Polish scope should exclude Sonner setup" — so the future Phase 7 planner sees it during traceability review.

## Deviations from Plan

None — plan executed exactly as written. All three task automated verifications passed on first run. No Rule 1/2/3 auto-fixes needed.

## Threat Flags

None — this plan produces only markdown documentation. The AUTH-08 checklist instructs the user on operations that cross trust boundaries (Google Cloud Console + Supabase Auth Dashboard), but per the plan's threat_model T-02-21 disposition (accept), the OAuth Client Secret is only exchanged inside the user's browser session and never enters the repo, logs, or any Claude-managed artifact. The checklist explicitly does NOT ask the user to paste the Secret into any file in the repo.

## Phase 7 Planner — Pointer

When Phase 7 (Polish) planning begins:
- POL-01 is already done (shipped in Phase 2 via D-13 pullback)
- Check `.planning/REQUIREMENTS.md` Traceability POL-01 row — it now says Phase 2, with footnote confirming Sonner is mounted in `dealdrop/app/layout.tsx`
- Phase 7 scope should cover POL-02 through POL-06 + DEP-01 through DEP-06 only

## Commits (in order)

| Task | Commit | Message |
|------|--------|---------|
| 1 | `8644b05` | docs(02-05): update REQUIREMENTS.md traceability for D-07 + D-13 |
| 2 | `c6896a4` | docs(02-05): add AUTH-08 OAuth redirect URI ops checklist |
| 3 | `9de7f1e` | docs(02-05): add standalone Phase 2 smoke test checklist |

## Self-Check: PASSED

Files verified present:
- FOUND: .planning/REQUIREMENTS.md (modified — POL-01 row now `Phase 2`, AUTH-04 row now `Phase 2 (hook) / Phase 4 (trigger)`, 2 footnote paragraphs present)
- FOUND: .planning/phases/02-authentication-landing/AUTH-08-OPS-CHECKLIST.md (90 lines)
- FOUND: .planning/phases/02-authentication-landing/02-SMOKE-TEST.md (111 lines)

Commits verified present in git log:
- FOUND: 8644b05 (Task 1)
- FOUND: c6896a4 (Task 2)
- FOUND: 9de7f1e (Task 3)

All 11 locked copy strings present verbatim in smoke test. No changes to `dealdrop/`. All must_haves truths satisfied.
