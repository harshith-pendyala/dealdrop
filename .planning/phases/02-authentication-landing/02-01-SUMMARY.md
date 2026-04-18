---
phase: 02-authentication-landing
plan: 01
subsystem: ui-tooling
tags: [shadcn, dialog, card, sonner, next-themes, radix-ui, wave-1, tooling-isolation]
requires:
  - phase: 01-foundation-database/05
    provides: "Shadcn config (components.json locked new-york/zinc/cssVariables), cn helper at src/lib/utils.ts, Button primitive (radix-ui umbrella pattern), @theme inline OKLCH token layer in app/globals.css"
provides:
  - primitive:dealdrop/components/ui/dialog.tsx (Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogPortal, DialogTrigger, DialogOverlay, DialogFooter — wraps Dialog from radix-ui umbrella)
  - primitive:dealdrop/components/ui/card.tsx (Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter — plain div composition with cn())
  - primitive:dealdrop/components/ui/sonner.tsx (Toaster wrapper — imports Toaster as Sonner from "sonner", useTheme from "next-themes"; styles bound to popover/--border/--radius CSS vars)
  - npm-dep:sonner 2.0.7 (toast() API + Toaster source)
  - npm-dep:next-themes 0.4.6 (required by sonner.tsx useTheme call — Rule 3 auto-install)
affects:
  - 02-03-auth-modal (consumes Dialog primitive)
  - 02-04-landing (consumes Card primitive for FeatureCard + mounts Toaster from sonner wrapper)
  - All downstream phases using toast() — price-drop alerts (Phase 6 UI), product-add success, errors
tech-stack:
  added:
    - "sonner 2.0.7 (Shadcn-compatible toast library; >500k weekly downloads)"
    - "next-themes 0.4.6 (theme-context provider required by the generated Sonner wrapper's useTheme() hook; Rule 3 blocking-issue fix)"
  patterns:
    - "Phase 1 Plan 01-05 pattern (Shadcn 4.3 radix preset uses `radix-ui` umbrella package): continued here — Dialog imports `Dialog as DialogPrimitive from \"radix-ui\"`, not `@radix-ui/react-dialog`. The plan's literal import-string assumption (`@radix-ui/react-dialog`) is a Shadcn 4.0–4.2-era artifact; 4.3 radix preset re-exports through `radix-ui`. Dialog is still Radix-backed; just the import path differs."
    - "Primitive install isolation: Wave 1 runs `npx shadcn@latest add` commands in a dedicated plan so any CLI deviations (auto-renames, globals rewrites, locked-file drift) are caught here, not during AuthModal/FeatureCard feature work."
    - "No hand-edits of Shadcn-generated files (per UI-SPEC Registry Safety). When a generated primitive needs a missing dep, install the dep (Rule 3) — do not patch the primitive."
key-files:
  created:
    - dealdrop/components/ui/dialog.tsx
    - dealdrop/components/ui/card.tsx
    - dealdrop/components/ui/sonner.tsx
  modified:
    - dealdrop/package.json (+2 deps: sonner, next-themes)
    - dealdrop/package-lock.json (transitive tree expanded)
  unchanged-but-checked:
    - dealdrop/components.json (md5 192106ce41be6f9d0ca3dc4e33af343b — unchanged pre/post)
    - dealdrop/app/globals.css (md5 92a2bc7183e28bb865dc3e7e49ec8065 — unchanged pre/post)
    - dealdrop/app/layout.tsx (md5 df7409073a23a9f2060c224d6909d9ae — unchanged pre/post; Toaster mount deferred to Plan 04)
    - dealdrop/components/ui/button.tsx (md5 daafd007acc8e344a1c557ae9287fe14 — unchanged)
key-decisions:
  - "Installed next-themes (not in plan) to resolve the generated sonner.tsx's useTheme() import. Plan forbids hand-editing generated primitives — installing the missing dep is the non-destructive fix. Downstream note: Plan 04 will mount <Toaster /> in layout.tsx; it does NOT need to wrap the tree in <ThemeProvider> because dark mode already runs on @media (prefers-color-scheme: dark) (Phase 1 Plan 01-05 decision — no next-themes provider needed). useTheme() without a provider returns 'system' by default, which is the correct behavior for our media-query dark mode."
  - "Accepted Shadcn 4.3's radix-ui umbrella import (not @radix-ui/react-dialog per plan's literal assumption). Matches Phase 1 Plan 01-05 button.tsx precedent. Functionality is identical — Radix Dialog is the underlying implementation either way."
  - "Did NOT modify components.json, globals.css, layout.tsx, or button.tsx. Plan 04 handles Toaster mounting inside the existing layout (co-located with AuthModalProvider wrap) — that is NOT this plan's responsibility."
patterns-established:
  - "Pattern: when a shadcn-generated primitive pulls in a hidden runtime dep (next-themes, etc.), install the dep; never patch the primitive. Shadcn CLI owns components/ui/* content."
  - "Pattern: Wave 1 isolation of `shadcn add` commands catches CLI surprises (dep auto-installs, import-path drift, lockfile bloat) before they leak into feature work in Waves 2+."
requirements-completed: [AUTH-05, POL-01, HERO-02]
metrics:
  duration_min: 2
  tasks: 1
  files_created: 3
  files_modified: 2
  commits: 1
  completed: 2026-04-18
---

# Phase 2 Plan 02-01: Shadcn Primitive Installs (Dialog/Card/Sonner + sonner/next-themes) Summary

**Installed three Shadcn primitives (Dialog, Card, Sonner wrapper) plus the `sonner` and `next-themes` npm packages; locked files (components.json, globals.css, layout.tsx, button.tsx) verified untouched via md5; `npx tsc --noEmit` exits 0 — downstream Plans 03/04 have all required UI toolkit artifacts ready on disk.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-18T13:23:35Z
- **Completed:** 2026-04-18T13:25:55Z
- **Tasks:** 1 (autonomous, no checkpoints)
- **Files created:** 3 (dialog.tsx, card.tsx, sonner.tsx)
- **Files modified:** 2 (package.json, package-lock.json)
- **Commits:** 1 task commit (`d28a14d`)

## Accomplishments

- `npm install sonner` succeeded; `sonner 2.0.7` added to dependencies (one occurrence, NOT in devDependencies).
- `npx shadcn@latest add dialog --yes` created `components/ui/dialog.tsx` (10 named exports: Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger). Uses `Dialog as DialogPrimitive from "radix-ui"` umbrella (Phase 1 pattern). `cn` imported from `@/lib/utils`. Reuses Button primitive for DialogFooter close button. No auto-renames, no globals rewrites, no components.json mutations.
- `npx shadcn@latest add card --yes` created `components/ui/card.tsx` (7 named exports: Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle). Plain div composition, `cn` from `@/lib/utils`. No dependency installs beyond what was already present.
- `npx shadcn@latest add sonner --yes` created `components/ui/sonner.tsx` (1 named export: Toaster — a wrapper over `Toaster as Sonner from "sonner"`). Uses `useTheme()` from `next-themes` and lucide icons (CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon). Styles wire Shadcn CSS vars (`--popover`, `--border`, `--radius`).
- `next-themes 0.4.6` auto-installed (Rule 3 deviation — sonner.tsx imports `useTheme` from `next-themes`; without this install, tsc + build would fail).
- `npx tsc --noEmit` from `dealdrop/` exits **0** (with `.next/` cache cleared pre-run).
- `components.json`, `app/globals.css`, `app/layout.tsx`, and `components/ui/button.tsx` all md5-verified unchanged pre/post CLI runs.

## Task Commits

| # | Task | Commit  | Type | Status   |
|---|------|---------|------|----------|
| 1 | Install `sonner` + add Dialog/Card/Sonner primitives (+ next-themes Rule 3 fix) | `d28a14d` | feat | Complete |

Final metadata commit (SUMMARY.md only, in parallel-executor mode — STATE.md/ROADMAP.md are owned by the orchestrator): pending (this commit).

## Files Created/Modified

**Created:**
- `dealdrop/components/ui/dialog.tsx` — Shadcn Dialog primitive (10 named exports wrapping `radix-ui` umbrella Dialog.* primitives; Uses XIcon from lucide-react, Button from `@/components/ui/button`, cn from `@/lib/utils`; marked `"use client"`)
- `dealdrop/components/ui/card.tsx` — Shadcn Card primitive (7 named exports, plain div composition, cn from `@/lib/utils`; server-safe, no `"use client"`)
- `dealdrop/components/ui/sonner.tsx` — Shadcn Sonner wrapper (1 named export `Toaster` wrapping `Toaster as Sonner` from `sonner` package; useTheme from `next-themes`; marked `"use client"`)

**Modified:**
- `dealdrop/package.json` — +2 deps: `sonner ^2.0.7`, `next-themes ^0.4.6` (both in `dependencies`, not `devDependencies`)
- `dealdrop/package-lock.json` — transitive tree expanded (one `npm install sonner` + one `npm install next-themes`)

**Locked files md5-verified UNCHANGED:**
- `dealdrop/components.json` → `192106ce41be6f9d0ca3dc4e33af343b` (matches Phase 1 Plan 01-05 final shape)
- `dealdrop/app/globals.css` → `92a2bc7183e28bb865dc3e7e49ec8065` (matches Phase 1 Plan 01-05 rewrite)
- `dealdrop/app/layout.tsx` → `df7409073a23a9f2060c224d6909d9ae` (Toaster mount deferred to Plan 04 per plan's action notes)
- `dealdrop/components/ui/button.tsx` → `daafd007acc8e344a1c557ae9287fe14` (untouched)

## Must-Haves Verified

- [x] `dealdrop/components/ui/dialog.tsx` exists
- [x] `dealdrop/components/ui/card.tsx` exists
- [x] `dealdrop/components/ui/sonner.tsx` exists
- [x] `sonner` listed in `package.json` dependencies (`"sonner": "^2.0.7"`) — exactly one occurrence, in `dependencies` block
- [x] Dialog imports Radix Dialog primitives (via `radix-ui` umbrella; functionally equivalent — see Deviations)
- [x] `components/ui/sonner.tsx` contains `from "sonner"` (line 11: `import { Toaster as Sonner, type ToasterProps } from "sonner"`)
- [x] `components/ui/card.tsx` imports `cn` from `@/lib/utils` (line 3: `import { cn } from "@/lib/utils"`)
- [x] `npx tsc --noEmit` exits 0 from `dealdrop/`
- [x] `components.json`, `app/globals.css`, `app/layout.tsx`, `components/ui/button.tsx` all unchanged (md5 verified)
- [x] Post-commit deletion check: no deletions in `d28a14d`

## Requirements Satisfied

- **AUTH-05** — AuthModal Dialog primitive available (consumed by Plan 03 AuthModal).
- **POL-01** — Sonner Toaster wrapper + `sonner` package installed (Toaster mount lands in Plan 04; `toast()` calls compile from any future consumer).
- **HERO-02** — Card primitive available for FeatureCard (consumed by Plan 04 Landing).

All three requirements closed at the artifact level (primitives exist on disk; `toast()` import will resolve; Dialog/Card can be imported from `@/components/ui/*`). Runtime verification of AuthModal open/close, FeatureCard render, and toast firing happens naturally in Plans 03/04.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Installed `next-themes` to satisfy generated `sonner.tsx`**

- **Found during:** Task 1, post-`shadcn add sonner` type-check
- **Issue:** Shadcn's generated `components/ui/sonner.tsx` contains `import { useTheme } from "next-themes"`. `next-themes` is NOT in the existing `package.json` (not installed by `shadcn add sonner`, nor by `npm install sonner`). Without it, `npx tsc --noEmit` would fail with `Cannot find module 'next-themes'` and `npm run build` would fail similarly. The plan forbids hand-editing Shadcn-generated primitives (UI-SPEC Registry Safety + plan's "DO NOT edit the generated files — the Shadcn CLI owns them" note).
- **Fix:** `npm install next-themes` — adds `next-themes ^0.4.6` to `dependencies`. The `useTheme()` call works without a `<ThemeProvider>` wrapping the tree — it returns the default `'system'`, which is exactly the behavior our media-query dark mode needs (Phase 1 Plan 01-05 decision: no next-themes provider, dark mode via `@media (prefers-color-scheme: dark)`).
- **Files modified:** `dealdrop/package.json`, `dealdrop/package-lock.json`
- **Verification:** `grep -q '"next-themes"' package.json` passes; `npx tsc --noEmit` exits 0 (whereas it would fail without next-themes).
- **Committed in:** `d28a14d` (Task 1 combined commit)

**2. [Rule 1 - Plan assumption bug] Dialog uses `radix-ui` umbrella, NOT `@radix-ui/react-dialog`**

- **Found during:** Task 1 automated verify step
- **Issue:** Plan's `<verify>` step contains `grep -q '@radix-ui/react-dialog' components/ui/dialog.tsx`. The plan's `must_haves.key_links` also specifies `pattern: "@radix-ui/react-dialog"`. Both assumptions are Shadcn 4.0–4.2-era expectations. Shadcn 4.3 radix preset (which Phase 1 Plan 01-05 already baked in via `--defaults --force -b radix`) generates primitives that import from the `radix-ui` umbrella package, not per-primitive `@radix-ui/react-*` packages. Phase 1's `components/ui/button.tsx` already follows this pattern (line 3: `import { Slot } from "radix-ui"`).
- **Fix:** None required — the generated dialog.tsx is functionally correct. It imports `Dialog as DialogPrimitive from "radix-ui"` (line 5) and all Radix Dialog primitives (Root, Trigger, Portal, Close, Overlay, Content, Title, Description) are re-exported through the `radix-ui` umbrella. `@radix-ui/react-dialog` IS installed in node_modules as a transitive dependency of `radix-ui` (verified: `ls node_modules/@radix-ui/react-dialog` exists). TypeScript resolves everything cleanly (tsc --noEmit: 0).
- **Files modified:** None (documentation-only deviation)
- **Verification:** `tsc --noEmit` exit 0; `grep -q 'from "radix-ui"' components/ui/dialog.tsx` passes; `grep -q 'DialogPrimitive.Root' components/ui/dialog.tsx` passes (all Radix Dialog primitives present).
- **Committed in:** `d28a14d` (no file change; documented in commit message)

### Plan's verify step: one false-negative

The plan's automated verify line `grep -q '@radix-ui/react-dialog' components/ui/dialog.tsx` will return non-zero exit with the Shadcn 4.3 radix preset's umbrella import. This is a stale expectation from the plan author (Phase 1 already established the umbrella pattern; Phase 2 plan assumption didn't update). The functional equivalent verify is `grep -q 'from "radix-ui"' components/ui/dialog.tsx && grep -q 'DialogPrimitive\.' components/ui/dialog.tsx` — both pass.

All other verify clauses pass unchanged:
- `test -f components/ui/dialog.tsx` PASS
- `test -f components/ui/card.tsx` PASS
- `test -f components/ui/sonner.tsx` PASS
- `grep -q '"sonner"' package.json` PASS
- `grep -q 'from "sonner"' components/ui/sonner.tsx` PASS
- `grep -q 'from "@/lib/utils"' components/ui/card.tsx` PASS
- `npx tsc --noEmit` exit 0 PASS

**Total deviations:** 2 auto-fixed (1× Rule 3 install, 1× Rule 1 plan-assumption docs-only). No Rule 4 checkpoints. No scope creep.

## Assumptions Log Update

- **A1 — "sonner latest version is 2.x"** — CONFIRMED. Installed `sonner 2.0.7` on 2026-04-18. `package.json` entry: `"sonner": "^2.0.7"`.

## Shadcn CLI Behavior

- **CLI version:** 4.3.0 (same as Phase 1 Plan 01-05)
- **Flag used:** `--yes` (supported in 4.3 `shadcn add` — confirmed via `npx shadcn@latest add --help`)
- **Auto-fixes reported by CLI:** None for these three `add` commands. Unlike Phase 1 Plan 01-05 (which had 4 deviations from `shadcn init`), `shadcn add` on an already-initialized project ran cleanly — no `_shadcn-test` folder rename, no globals.css rewrite, no cn-helper path shuffle. The pre-existing locked `components.json` was honored throughout.
- **Pre-install transitive deps:** `radix-ui 1.4.3` (already in package.json from Phase 1), `lucide-react 1.8.0` (already present). Confirmed expected behavior: `shadcn add dialog` reported "Installing dependencies" step but installed nothing new (everything was already resolved).
- **sonner.tsx hidden dep:** `next-themes` (NOT reported by CLI; discovered via post-install type-check). This is a Shadcn upstream quirk — the sonner template hard-codes a `useTheme()` call that assumes `next-themes` is present, without declaring it as a CLI-managed dep.

## Threat Model Coverage

All three STRIDE threats from the plan register addressed:

- **T-02-01** (Tampering: sonner npm package) — ACCEPTED per plan disposition. `sonner 2.0.7` integrity hash locked in `package-lock.json`. No supply-chain scanning beyond Vercel's standard audit.
- **T-02-02** (Tampering: Shadcn-generated primitives) — MITIGATED. All three generated files committed verbatim, no hand-edits (md5 would differ if we touched them post-generation). The plan's Rule 3 fix (installing `next-themes`) was applied to `package.json` only, not to `components/ui/sonner.tsx`. If we later need to change wrapper behavior, we'll re-run `npx shadcn@latest add sonner --yes` rather than patching the file directly.
- **T-02-03** (Spoofing: Shadcn registry source) — ACCEPTED. CLI used default registry (ui.shadcn.com); no custom registries configured in `components.json` (`registries: {}` confirms).

**New threat surface introduced:** None. This plan is pure tooling; no new network endpoints, no new auth paths, no schema changes, no file-access patterns. `components/ui/dialog.tsx`, `card.tsx`, and `sonner.tsx` are all client/server-safe component files; they're unrendered until consumed by Plans 03/04.

## Threat Flags

None. No security-relevant surface introduced.

## Known Stubs

None introduced by this plan. Prior stubs carry forward (unchanged from Phase 1 summaries):
- `dealdrop/.env.local` placeholders for `FIRECRAWL_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET` (resolved by Phases 3/6)
- `dealdrop/proxy.ts` pass-through stub (resolved by Phase 2 Plan 02 auth middleware)

## Auth Gates

None. Purely local CLI + npm work.

## Issues Encountered

None. The `shadcn add` runs were clean (no CLI deviations), and the `next-themes` missing-dep issue was caught cleanly by tsc — not by a runtime error.

## Deferred Issues

None. All success criteria met.

## Next-Phase Readiness

**Phase 2 Wave 1 tooling complete.** Downstream plans can consume:

- **Plan 02-03 (AuthModal):** `import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"` — ready. `toast()` from `sonner` — ready.
- **Plan 02-04 (Landing):** `import { Card } from "@/components/ui/card"` for FeatureCard — ready. `import { Toaster } from "@/components/ui/sonner"` for mounting in layout.tsx — ready. `toast()` from `sonner` — ready.
- All downstream toast consumers can `import { toast } from "sonner"` directly (the Shadcn wrapper only exports `Toaster`; `toast()` is the raw library API).

## Self-Check: PASSED

**Created files verified (via `test -f`):**
- FOUND: `dealdrop/components/ui/dialog.tsx`
- FOUND: `dealdrop/components/ui/card.tsx`
- FOUND: `dealdrop/components/ui/sonner.tsx`

**Commits verified (via `git log`):**
- FOUND: `d28a14d` — `feat(02-01): install Shadcn Dialog, Card, Sonner + sonner + next-themes`

**Locked files unchanged (md5 verified twice — pre and post CLI runs):**
- components.json, app/globals.css, app/layout.tsx, components/ui/button.tsx — all md5 stable

**Type-check gate:**
- `cd dealdrop && rm -rf .next && npx tsc --noEmit` → exit 0

**Dependencies:**
- `grep -c '"sonner"' package.json` → 1 (exactly once, in `dependencies`)
- `grep -c '"next-themes"' package.json` → 1 (exactly once, in `dependencies`)

---
*Phase: 02-authentication-landing*
*Completed: 2026-04-18*
