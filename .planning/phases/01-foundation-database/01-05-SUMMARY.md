---
phase: 01-foundation-database
plan: 05
subsystem: ui
tags: [shadcn, tailwind-v4, zinc, new-york, button, cn, oklch, dark-mode, radix-ui, lucide]
requires:
  - phase: 01-foundation-database/01
    provides: "Next.js 16 scaffold with Tailwind v4 + @/* path alias (resolving ./src/*); globals.css base tokens; Geist font variables wired via layout.tsx"
provides:
  - shadcn-config:dealdrop/components.json (locked shape — style=new-york, baseColor=zinc, cssVariables=true, config=\"\", utils=@/lib/utils, iconLibrary=lucide)
  - cn-helper:dealdrop/src/lib/utils.ts (clsx + tailwind-merge, imported by every Shadcn primitive)
  - primitive:dealdrop/components/ui/button.tsx (5 variants: default/secondary/destructive/outline/ghost; 4 sizes; radix-ui Slot.Root)
  - theme-tokens:dealdrop/app/globals.css (@theme inline zinc OKLCH palette, :root light tokens, @media (prefers-color-scheme: dark) → :root dark tokens, @layer base body defaults)
  - auto-installed-deps:clsx, tailwind-merge, class-variance-authority, lucide-react, radix-ui, tw-animate-css, shadcn
  - phase-gate:FND-06 closed
affects:
  - 02-auth (Dialog primitive for login modal will reuse cn + @theme tokens established here)
  - 04-product-tracking (Card + AlertDialog + Input primitives will consume same token layer + cn helper)
  - 07-polish (Skeleton + Sonner toasts — both depend on working CSS-variable pipeline verified here)
tech-stack:
  added:
    - "Shadcn UI 4.3 CLI (radix preset path; `--defaults --force -b radix`)"
    - "radix-ui 1.4.3 (unified package, NOT `@radix-ui/react-*` per-primitive packages — Shadcn 4.3 shift)"
    - "class-variance-authority 0.7.1 (button variants)"
    - "clsx 2.1.1 + tailwind-merge 3.5.0 (cn helper dependencies)"
    - "lucide-react 1.8.0 (icon library — no icons used yet; imported on-demand per primitive)"
    - "tw-animate-css 1.4.0 (Shadcn transition/animation utilities)"
  patterns:
    - "Shared Pattern 5: Shadcn 4.3 init uses `--defaults --force` (not interactive prompts); answers baked via `-b radix` preset, then components.json hand-corrected to locked values"
    - "Shared Pattern: @theme inline zinc OKLCH palette at :root, dark overrides wrapped in @media (prefers-color-scheme: dark) — no JS theme toggle, no FOUC, matches CONTEXT.md discretion"
    - "Shared Pattern: cn() helper lives at src/lib/utils.ts (not root /lib/) — tsconfig @/* paths from Plan 01 Task 2 make Shadcn's default @/lib/utils alias resolve correctly"
    - "Shared Pattern: Underscore-prefixed App Router folders (_shadcn-test) are PRIVATE and excluded from routing — must use regular folder names for throwaway verification pages that need to be reachable"
    - "Shared Pattern: Shadcn-owned primitives in components/ui/ are treated as project-owned but NOT hand-edited — downstream phases add variants via consumer components, not by modifying the primitive"
key-files:
  created:
    - dealdrop/components.json
    - dealdrop/src/lib/utils.ts
    - dealdrop/components/ui/button.tsx
  modified:
    - dealdrop/app/globals.css (full rewrite by shadcn init + manual dark-media-query merge)
    - dealdrop/package.json (7 Shadcn-required deps added)
    - dealdrop/package-lock.json (transitive dep tree expanded)
key-decisions:
  - "Shadcn 4.3 CLI dropped interactive prompts — used --defaults --force -b radix flag path; components.json manually rewritten to match plan's locked shape (style=new-york, baseColor=zinc, cssVariables=true, iconLibrary=lucide, config='')"
  - "Throwaway verification page placed at app/shadcn-test/ (not plan's app/_shadcn-test/) — underscore-prefix is a Next.js App Router private-folder signal that excludes the route from the route tree. Checkpoint-visible URL required a public folder name. Restored before cleanup (both page + folder deleted in this task)"
  - "globals.css was fully rewritten (not merged) after shadcn init produced broken CSS (bogus @import 'shadcn/tailwind.css', duplicate .dark blocks, Arial font override clobbering Geist, wrong --radius 0.625rem instead of plan's 0.5rem) — chose rewrite over surgical merge to produce a clean, auditable token layer"
  - "Kept @custom-variant dark (&:is(.dark *)) directive in globals.css even though system-pref dark mode doesn't use it — harmless, and preserves the option of adding a manual toggle in Phase 7 without rewriting globals.css"
patterns-established:
  - "Pattern: Shadcn 4.3 radix preset — subsequent primitives add via `npx shadcn@latest add <primitive>`; the init is one-time and done"
  - "Pattern: App Router public throwaway verification pages use non-underscore folder names (app/<verify>/page.tsx); remove both the file AND the directory via rm -rf in cleanup tasks"
  - "Pattern: dark mode via prefers-color-scheme → :root { ... } override inside @media — no next-themes, no JS toggle, no FOUC (Flash of Unstyled Content)"
requirements-completed: [FND-06]
metrics:
  duration_min: 15
  tasks: 5
  completed: 2026-04-18
---

# Phase 1 Plan 01-05: Shadcn UI Initialization Summary

**Shadcn UI 4.3 initialized with locked `components.json` (new-york/zinc/cssVariables), `cn()` helper at `src/lib/utils.ts`, Button primitive with radix-ui Slot.Root, and `@theme inline` OKLCH token layer with `@media (prefers-color-scheme: dark)` dark mode — developer visually verified all 5 Button variants in light + dark mode.**

## Performance

- **Duration:** ~15 min (across human-verify checkpoint pause)
- **Started (Task 1):** 2026-04-18T15:11Z
- **Checkpoint pause:** after Task 4 committed (`4cd1b61`) — developer visual inspection
- **Resumed (Task 5):** 2026-04-18T10:04Z (developer reply: "button verified")
- **Completed (Task 5 commit):** 2026-04-18
- **Tasks:** 5 (4 autonomous + 1 human-verify checkpoint)
- **Files created:** 3 permanent (components.json, src/lib/utils.ts, components/ui/button.tsx)
- **Files modified:** 3 (globals.css, package.json, package-lock.json)
- **Files deleted (intentional, Task 5):** 1 tracked (app/shadcn-test/page.tsx) + 1 local-only (app/globals.css.before-shadcn)

## Accomplishments

- `npx shadcn@latest init` completed via 4.3 non-interactive `--defaults --force -b radix` path; `components.json` written to match the plan's locked shape.
- `cn()` helper resolved to the correct path (`dealdrop/src/lib/utils.ts`, not root `/lib/utils.ts`) thanks to Plan 01 Task 2's tsconfig path fix.
- Button primitive added at `components/ui/button.tsx` with 5 variants + 4 sizes, importing `cn` via `@/lib/utils` alias.
- `globals.css` rewritten to a clean Shadcn v4 token layer — `@theme inline` with zinc OKLCH palette, `:root` light tokens, `@media (prefers-color-scheme: dark) { :root { ... } }` dark overrides, `@layer base` body defaults. Geist font vars (`--font-sans: var(--font-geist-sans)`) preserved.
- Developer visually verified all 5 Button variants render correctly in both light and dark mode via `http://localhost:3000/shadcn-test` (checkpoint passed).
- Throwaway test page + local backup removed; only permanent artifacts (components.json, cn helper, Button, token layer) persist. Build passes (`/` + `/_not-found` are the only routes).

## Task Commits

| # | Task | Commit | Type | Status |
|---|------|--------|------|--------|
| 1 | `shadcn init` + write `components.json` | `1826744` | chore | Complete |
| 2 | Add Button primitive via `shadcn add button` | `db31648` | feat | Complete |
| 3 | Rewrite `globals.css` with media-query dark mode | `097607a` | feat | Complete |
| 4 | Create `app/shadcn-test/page.tsx` verification page | `4cd1b61` | feat | Complete |
| 4b | Developer visual verification | n/a (checkpoint) | — | Approved: "button verified" |
| 5 | Delete verification page + backup | `beb270e` | chore | Complete |

Final metadata commit: `pending` (docs — this SUMMARY + STATE.md + ROADMAP.md).

## Files Created/Modified

**Created:**
- `dealdrop/components.json` — Shadcn config with locked shape (style=new-york, baseColor=zinc, cssVariables=true, config="", iconLibrary=lucide, `utils: @/lib/utils`)
- `dealdrop/src/lib/utils.ts` — `cn()` helper: `export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }`
- `dealdrop/components/ui/button.tsx` — Shadcn Button (5 variants, 4 sizes, radix-ui Slot.Root, imports `cn` from `@/lib/utils`)

**Modified:**
- `dealdrop/app/globals.css` — full rewrite: `@theme inline`, :root light tokens (zinc OKLCH), `@media (prefers-color-scheme: dark) { :root { ... } }` dark tokens, `@layer base { body { @apply bg-background text-foreground } }`, `--radius: 0.5rem`, Geist font var preservation
- `dealdrop/package.json` — +7 Shadcn-required deps: `class-variance-authority`, `clsx`, `lucide-react`, `radix-ui`, `shadcn`, `tailwind-merge`, `tw-animate-css`
- `dealdrop/package-lock.json` — transitive tree expanded by ~5400 lines

**Deleted in Task 5:**
- `dealdrop/app/shadcn-test/page.tsx` (tracked; deleted via commit `beb270e`)
- `dealdrop/app/globals.css.before-shadcn` (never tracked; was only a local Task 1 backup — git history preserves pre-Shadcn globals.css state anyway)

## Components.json (final, committed shape)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "rtl": false,
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "menuColor": "default",
  "menuAccent": "subtle",
  "registries": {}
}
```

All plan-required fields present. The additional fields (`rtl: false`, `menuColor`, `menuAccent`, `registries`) are Shadcn 4.3 defaults — harmless.

## Must-Haves Verified

- [x] `components.json` exists with `"style": "new-york"`, `"baseColor": "zinc"`, `"cssVariables": true`, `"config": ""`, `"utils": "@/lib/utils"`, `"iconLibrary": "lucide"` (all grep-verified)
- [x] `src/lib/utils.ts` exists with `export function cn` and imports `clsx` + `tailwind-merge`
- [x] `components/ui/button.tsx` exists and imports `cn` from `@/lib/utils`
- [x] `app/globals.css` contains `@theme inline` + `@media (prefers-color-scheme: dark)` wrapper + `oklch(...)` tokens + `--radius: 0.5rem` + `bg-background`/`text-foreground` body defaults
- [x] No bare `.dark { ... }` class-selector block in globals.css (only inside the `@custom-variant` directive comment — not a token-override block)
- [x] Geist font variables preserved (layout.tsx references resolve; build succeeded)
- [x] No `tailwind.config.js` or `tailwind.config.ts` in `dealdrop/` (v4 has no JS config — confirmed absent)
- [x] No root-level `dealdrop/lib/utils.ts` (alias resolved to `./src/lib/utils` per Plan 01 Task 2)
- [x] Developer visually confirmed Button renders zinc palette, 0.5rem radius, correct variants, dark mode toggles via OS preference (Task 4b: "button verified")
- [x] After Task 5: `app/shadcn-test/` directory gone; `app/globals.css.before-shadcn` gone; `components/ui/button.tsx`, `src/lib/utils.ts`, `components.json` preserved
- [x] `cd dealdrop && npx tsc --noEmit` exits 0 (after clearing stale `.next/` cache from pre-cleanup dev server)
- [x] `cd dealdrop && npm run build` exits 0 (only `/` and `/_not-found` routes in final build)
- [x] Dev server on port 3000 killed; port clear

## Requirements Satisfied

- **FND-06** — Shadcn UI initialized with working theme; cn() helper at locked path; Button primitive added; CSS-variable pipeline verified end-to-end (theme tokens → `@theme inline` → `bg-primary` → rendered zinc background) by developer visual inspection of all 5 Button variants in both light and dark mode.

## Deviations from Plan

Four significant deviations occurred during this plan. None changed scope; all tracked as auto-fixes against the plan's locked contract.

### Auto-fixed Issues

**1. [Rule 1 - Bug in plan assumptions] Shadcn 4.3 CLI dropped interactive prompts**
- **Found during:** Task 1 (plan's human-action checkpoint for interactive `npx shadcn@latest init`)
- **Issue:** Plan assumed Shadcn init would prompt interactively for style / baseColor / cssVariables / path aliases. Shadcn 4.3 CLI changed to preset-based non-interactive init — `--defaults --force -b radix` is the supported path now. Interactive TUI no longer exists for init.
- **Fix:** Ran `npx shadcn@latest init --defaults --force -y -b radix` in non-TTY shell. The radix preset produced a `components.json` with the correct alias shape but with `style=default` / `baseColor=neutral` / `--radius=0.625rem` — all wrong vs. plan locks. Manually rewrote `components.json` to match plan's locked shape (new-york / zinc / 0.5rem).
- **Files modified:** `dealdrop/components.json` (hand-rewritten post-init)
- **Verification:** `grep -q '"style": "new-york"' components.json` + `grep -q '"baseColor": "zinc"' components.json` + `grep -q '"cssVariables": true' components.json` all pass
- **Committed in:** `1826744` (Task 1 commit)

**2. [Rule 1 - Bug in plan assumptions] `cn` helper written to wrong path; manually moved**
- **Found during:** Task 1 (post-init path inspection)
- **Issue:** Shadcn init wrote `cn()` to root-level `dealdrop/lib/utils.ts` (not `dealdrop/src/lib/utils.ts` as CONTEXT.md D-03 locked). Root cause: Shadcn 4.3 CLI doesn't fully honor tsconfig `@/*` paths — it interprets `@/lib/utils` as `./lib/utils` rather than following the tsconfig override that resolves `@/*` to `./src/*`.
- **Fix:** Moved `lib/utils.ts` → `src/lib/utils.ts` manually; deleted root `lib/` directory.
- **Files modified:** `dealdrop/src/lib/utils.ts` (created at correct path)
- **Verification:** `test -f dealdrop/src/lib/utils.ts && ! test -f dealdrop/lib/utils.ts && grep -q "export function cn" dealdrop/src/lib/utils.ts` passes
- **Committed in:** `1826744` (Task 1 commit, combined with components.json rewrite)

**3. [Rule 1 - Bug] `shadcn init` produced broken `globals.css`; rewrote instead of merged**
- **Found during:** Task 3 (merge `.dark { ... }` into `@media (prefers-color-scheme: dark)`)
- **Issue:** Post-init `globals.css` was not a clean Shadcn v4 output. It contained: (a) a bogus `@import "shadcn/tailwind.css"` line pointing at a non-existent path; (b) duplicate `.dark { ... }` blocks (two separate token-override sections); (c) an `Arial` font-family override that clobbered the Geist font wiring from layout.tsx; (d) `--radius: 0.625rem` instead of the plan's locked `0.5rem`; (e) `--font-sans: var(--font-sans)` self-reference (broken — should reference `var(--font-geist-sans)` to match layout.tsx's Geist font injection).
- **Fix:** Rather than attempting a surgical merge on broken input, fully rewrote `globals.css` to a clean Shadcn v4 structure: `@import "tailwindcss"` + `@import "tw-animate-css"` + `@custom-variant dark` directive + `@theme inline { zinc OKLCH token layer }` + `:root { light tokens, --radius: 0.5rem }` + `@media (prefers-color-scheme: dark) { :root { dark tokens } }` + `@layer base { body bg-background text-foreground }`. Geist font variables restored.
- **Files modified:** `dealdrop/app/globals.css` (124-line clean rewrite)
- **Verification:** `grep -q "@theme inline" globals.css && grep -q "@media (prefers-color-scheme: dark)" globals.css && grep -q "oklch(" globals.css && grep -q "0.5rem" globals.css && ! grep -qE "^\.dark\s*\{" globals.css` passes; `npm run build` exits 0; developer visual inspection in Task 4b confirms Geist font renders correctly.
- **Committed in:** `097607a` (Task 3 commit)

**4. [Rule 1 - Bug in plan file naming] `_shadcn-test/` → `shadcn-test/` folder rename**
- **Found during:** Task 4 (create throwaway verification page)
- **Issue:** Plan specified `dealdrop/app/_shadcn-test/page.tsx` as the path. Next.js App Router treats any folder starting with `_` as a PRIVATE folder and excludes it from the route tree entirely. A page written under `app/_shadcn-test/page.tsx` would NOT be reachable at `http://localhost:3000/_shadcn-test` — the dev server returns 404 — making the human-verify checkpoint (Task 4b) unverifiable.
- **Fix:** Created the page at `app/shadcn-test/page.tsx` (no underscore) instead. Route reachable at `http://localhost:3000/shadcn-test` (HTTP 200 confirmed via `curl`). Developer verified the Button renders at the non-underscored URL.
- **Files modified:** `dealdrop/app/shadcn-test/page.tsx` (created), then `dealdrop/app/shadcn-test/` (deleted in Task 5)
- **Verification:** Pre-cleanup: `npm run dev` → `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/shadcn-test` → 200. Post-cleanup: directory gone, build shows only `/` and `/_not-found` routes.
- **Committed in:** `4cd1b61` (Task 4 commit), reversed in `beb270e` (Task 5 cleanup)

### Prior-attempt cleanup (context only)

The prompt also referenced "prior-attempt cleanup" — this refers to pre-Plan 01-05 noise (no artifacts of a previous shadcn attempt were found at start of this plan; the repo was in post-01-03 state with a clean `dealdrop/` tree). No additional cleanup beyond the four deviations above was required.

---

**Total deviations:** 4 auto-fixed (all Rule 1 — bug-in-plan-assumptions)
**Impact on plan:** All four deviations were necessary to land the plan's locked contract given Shadcn 4.3's actual behavior (vs. the plan's assumptions from Shadcn 4.0–4.2-era docs). No scope creep: every fix restored a plan-specified requirement (interactive prompts → locked values, wrong cn path → correct path, broken globals → clean token layer, unreachable route → reachable route). No new features introduced. No security surface changed.

## Issues Encountered

**Stale `.next/` cache produced phantom tsc errors after Task 5 cleanup**
- After deleting `app/shadcn-test/` in Task 5, `npx tsc --noEmit` reported `Cannot find module '../../../app/shadcn-test/page.js'` errors from `.next/dev/types/validator.ts` and `.next/types/validator.ts`. These files are auto-generated by Next.js during dev-server runs and referenced the deleted route.
- Fix: `rm -rf .next` (clears both dev and production type caches), then re-run tsc — exits 0.
- Not a real deviation; Next.js regenerates `.next/` on every `dev`/`build`. But worth flagging because blind retry of `tsc` without clearing `.next/` produces a misleading "tsc exit: 0" line with error output above it (tsc itself exited cleanly; the errors were from project-type-check plugin output, not tsc core).

## Auth Gates

None. Plan 01-05 required no external service authentication — purely local Shadcn CLI + file-system work.

## Threat Model Coverage

All five STRIDE threats from the plan register addressed:

- **T-05-01** (Tampering: compromised `npx shadcn@latest` package) — ACCEPTED (portfolio bar). Plan pinned Shadcn to `^4.3.0` (verified 2026-04-18 in RESEARCH.md); package-lock.json now tracks the exact installed version. No runtime secret exposure — Shadcn code is purely build-time.
- **T-05-02** (Information Disclosure: `_shadcn-test` / `shadcn-test` ships to production) — MITIGATED. Task 5 explicitly deletes the route. Post-cleanup `npm run build` shows only `/` and `/_not-found` in the route tree; `dealdrop/app/shadcn-test/` directory absent. Phase 7 deploy-audit should additionally grep for any `app/*test*` patterns.
- **T-05-03** (DoS: Shadcn init writes to wrong path — root `/lib/`) — MITIGATED. This exact failure mode occurred (Deviation #2) and was fixed by manually moving `lib/utils.ts` → `src/lib/utils.ts`. Task 2's acceptance criterion (`! test -f dealdrop/lib/utils.ts && test -f dealdrop/src/lib/utils.ts`) now passes.
- **T-05-04** (Tampering: compromised `lucide-react` or `class-variance-authority` transitively) — ACCEPTED (portfolio bar). `package-lock.json` integrity sufficient.
- **T-05-05** (DoS: globals.css merge loses `@theme inline`) — MITIGATED. Actual globals.css rewrite went FURTHER than a merge — verified `@theme inline` present via grep; developer visual verification in Task 4b confirmed the entire CSS pipeline works end-to-end (zinc bg-primary renders, 0.5rem radius, dark mode auto-switches).

No new threat surface introduced.

## Threat Flags

None. No new network endpoints, auth paths, file-access patterns, or schema changes introduced by this plan. `shadcn-test/page.tsx` was a public throwaway route but has been deleted.

## Known Stubs

None introduced by this plan.

Prior stubs carry forward (tracked in earlier SUMMARYs):
- `dealdrop/.env.local` still has 4 placeholder values for Phase 3 + Phase 6 (`FIRECRAWL_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CRON_SECRET`). Resolved by those phases. Intentional; documented in Plan 01-01 SUMMARY.
- `dealdrop/proxy.ts` still pass-through. Resolved by Phase 2 auth plan. Intentional; documented in Plan 01-02 SUMMARY.

## Deferred Issues

None. Plan 01-05 closed cleanly.

## Next Phase Readiness

**Phase 1 UI toolkit is complete.** Downstream phases can now:

- Phase 2 (auth): add Dialog + Input primitives via `npx shadcn@latest add dialog input`; both will inherit the zinc/OKLCH theme and the working `cn()` + `@theme inline` pipeline verified here.
- Phase 4 (product-tracking): add Card + AlertDialog primitives the same way.
- Phase 7 (polish): add Skeleton + Sonner (toasts); both rely on `tw-animate-css` (already installed here) + the CSS-variable pipeline.

**Phase 1 overall is now 5/5 plans complete** — all requirements FND-01 through FND-08 + DB-01 through DB-07 closed across plans 01-01 through 01-05 (pending Plan 04's `supabase db push` verification, which was the other open item and belongs to Plan 01-04's scope, not 01-05).

## Self-Check: PASSED

**Created files verified (via `test -f` / `test -d`):**
- FOUND: dealdrop/components.json (retained from Task 1)
- FOUND: dealdrop/src/lib/utils.ts (retained from Task 1)
- FOUND: dealdrop/components/ui/button.tsx (retained from Task 2)
- FOUND: dealdrop/app/globals.css (retained from Task 3; full rewrite)

**Deleted files verified (via `! test -f`/`! test -d`):**
- CONFIRMED-GONE: dealdrop/app/shadcn-test/page.tsx (Task 5, commit `beb270e`)
- CONFIRMED-GONE: dealdrop/app/shadcn-test/ (directory, Task 5)
- CONFIRMED-GONE: dealdrop/app/globals.css.before-shadcn (Task 5; was never tracked, local-only cleanup)

**Commits verified (via `git log --oneline`):**
- FOUND: 1826744 (Task 1 — shadcn init + components.json)
- FOUND: db31648 (Task 2 — Button primitive)
- FOUND: 097607a (Task 3 — globals.css rewrite with media-query dark)
- FOUND: 4cd1b61 (Task 4 — shadcn-test verification page)
- FOUND: beb270e (Task 5 — cleanup)

**Build gate verified:**
- `cd dealdrop && rm -rf .next && npx tsc --noEmit` → exit 0
- `cd dealdrop && npm run build` → exit 0; route tree shows only `/` and `/_not-found` (shadcn-test gone)
- Dev server on port 3000: killed (PID 53616 terminated); port clear

---
*Phase: 01-foundation-database*
*Completed: 2026-04-18*
