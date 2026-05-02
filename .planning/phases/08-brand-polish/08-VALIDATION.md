---
phase: 8
slug: brand-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-02
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.2.4 + @testing-library/react 16.x |
| **Config file** | `dealdrop/vitest.config.ts` |
| **Quick run command** | `cd dealdrop && npm run test -- --run --reporter=basic` |
| **Full suite command** | `cd dealdrop && npm run test -- --run && npm run lint && npm run build` |
| **Estimated runtime** | ~30s quick / ~120s full (incl. build) |

---

## Sampling Rate

- **After every task commit:** Run quick test command (vitest --run on changed surface)
- **After every plan wave:** Run full suite (vitest + lint + build)
- **Before `/gsd-verify-work`:** Full suite must be green AND BRAND-05 visual walk recorded in 08-VERIFICATION.md
- **Max feedback latency:** 30 seconds for unit, 120 seconds for full

---

## Per-Task Verification Map

> Filled by planner during plan creation. Each plan-task gets a row mapping to a BRAND-* requirement and a verification command.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 8-01-01 | 01 | 1 | BRAND-04 | — | — | grep | `grep -E "^\s*--primary:\s*oklch" dealdrop/app/globals.css \| wc -l` returns 2 | ❌ W0 | ⬜ pending |
| 8-01-02 | 01 | 1 | BRAND-04 | — | — | unit | `cd dealdrop && npx vitest run src/components/dashboard/PriceChart.test.tsx` | ✅ | ⬜ pending |
| 8-02-01 | 02 | 2 | BRAND-02 | — | — | unit | `cd dealdrop && npx vitest run src/components/header/Header.test.tsx` | ❌ W0 | ⬜ pending |
| 8-02-02 | 02 | 2 | BRAND-02 | — | — | grep | `grep "deal-drop-logo.png" dealdrop/src/components/header/Header.tsx` | ✅ | ⬜ pending |
| 8-03-01 | 03 | 2 | BRAND-03 | — | — | grep | `test ! -f dealdrop/app/favicon.ico` | ✅ | ⬜ pending |
| 8-03-02 | 03 | 2 | BRAND-03 | — | — | build | `cd dealdrop && npm run build` produces icon route | ✅ | ⬜ pending |
| 8-04-01 | 04 | 2 | BRAND-01 | — | — | unit | `cd dealdrop && npx vitest run src/components/hero/Hero.test.tsx` | ✅ | ⬜ pending |
| 8-04-02 | 04 | 2 | BRAND-01 | — | — | grep | `! grep -r "Made with love" dealdrop/src dealdrop/app` | ✅ | ⬜ pending |
| 8-05-01 | 05 | 3 | BRAND-04 | — | — | grep | `! grep -rn "Add Product" dealdrop/src` | ✅ | ⬜ pending |
| 8-05-02 | 05 | 3 | BRAND-04 | — | — | unit | `cd dealdrop && npx vitest run src/components/dashboard` (all dashboard tests green) | ✅ | ⬜ pending |
| 8-06-01 | 06 | 3 | BRAND-05 | — | — | manual | Visual walk + WCAG spot-check; row added to 08-VERIFICATION.md | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

> **Note:** Task IDs and plan numbers are illustrative — planner refines during plan generation. The contract is: every BRAND-* requirement has at least one automated verification AND BRAND-05 has a manual visual-walk row in 08-VERIFICATION.md.

---

## Wave 0 Requirements

- [ ] `dealdrop/src/components/header/Header.test.tsx` — new file; asserts logo image renders with alt text and is wrapped in a Link to `/`
- [ ] `dealdrop/src/components/hero/Hero.test.tsx` — new or extended; asserts "Made with love" text is absent
- [ ] `globals.css` token snapshot — a grep-based assertion that `--primary: oklch(...)` exists in both `:root` and `@media (prefers-color-scheme: dark)` blocks (no separate test file; runs as an `acceptance_criteria` shell check on the plan)
- [ ] `08-VERIFICATION.md` skeleton — created at the top of the BRAND-05 plan so the visual-walk rows have a destination

*Existing infrastructure covers test runner, lint, build. No new framework install.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Orange accent legibility (default / hover / focus) on primary CTAs in light + dark mode | BRAND-05 | WCAG contrast for token-driven surfaces is a perceptual judgment that snapshot tests cannot fairly assert (per D-08 portfolio bar). | 1. `cd dealdrop && npm run dev`. 2. Walk the logged-out hero, sign-in modal, dashboard empty state, dashboard with products, PriceChart toggle at desktop and 375px in both light and dark modes. 3. For every primary CTA: tab to it (focus), hover, click. 4. Run a contrast checker against orange-500/600/700 vs `--background` and `--card` (per-mode). 5. Record findings in `08-VERIFICATION.md` as rows: `viewport / mode / surface / pass-or-fix-shipped`. |
| Logo renders crisply at desktop and mobile, including 2x DPR | BRAND-02 | Visual asset quality cannot be unit-tested. | View header at 1x and 2x DPR (devtools device emulation); confirm no blurriness, correct aspect ratio. Record in 08-VERIFICATION.md. |
| Hero orange-50 gradient does not regress text legibility | BRAND-04 / BRAND-05 | Subtle gradient interactions with `<h1>` and `<p>` text are perceptual. | Inspect at desktop and 375px in light + dark mode. If contrast regresses on warmest gradient stop, narrow stops or reduce opacity. Record in 08-VERIFICATION.md. |
| Favicon visible in browser tab after build | BRAND-03 | Browser tab rendering not covered by unit tests; ImageResponse output must be visually verified. | Build and run prod locally (`npm run build && npm start`). Check tab favicon in Chrome + Safari at default zoom. Record in 08-VERIFICATION.md. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies (manual rows scoped only to BRAND-05 visual walk + favicon tab + logo crispness)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (Header.test.tsx new file flagged; 08-VERIFICATION.md scaffold created in BRAND-05 plan)
- [ ] No watch-mode flags (vitest invocations all use `--run`)
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter (after planner backfills task IDs and plan numbers)

**Approval:** pending
