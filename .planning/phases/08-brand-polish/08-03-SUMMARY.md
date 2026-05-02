---
phase: 08-brand-polish
plan: 03
subsystem: ui
tags: [brand, favicon, next-icon, image-response, satori]

# Dependency graph
requires:
  - phase: 07-polish-deployment
    provides: app/icon.tsx ImageResponse route handler scaffold (Phase 7 D-07); favicon.ico working-tree leftover that Phase 7 D-07 directed deleted but never landed in commits
  - phase: 08-brand-polish
    provides: Plan 01 established orange-500 hex equivalent #f97316 as the canonical brand color across the cascade; Plan 03 applies the same hex inline in the Satori-rendered icon
provides:
  - Browser-tab favicon now renders 32x32 PNG with orange-500 background and zinc-50 'D' glyph (BRAND-03)
  - Generic v1.0 zinc-900 favicon retired
  - working-tree dealdrop/app/favicon.ico finally removed (Phase 7 D-07 directive lands)
  - dealdrop/app/icon.tsx remains the canonical Next.js icon route — Path B chosen over Path A
affects: [08-06-brand-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hex color literals in ImageResponse — Satori cannot resolve oklch() or CSS custom properties; #f97316 is the canonical Tailwind v4 orange-500 hex"
    - "Path B favicon strategy — preserve ImageResponse route + single-letter glyph instead of static asset, because the wordmark logo (620x210, ~2.95:1) does not reduce legibly to 32x32"
    - "Working-tree-only file deletion — files Next.js scaffolded into app/ that are not git-tracked must be removed via rm -f (no git rm)"

key-files:
  created: []
  modified:
    - dealdrop/app/icon.tsx
  deleted:
    - dealdrop/app/favicon.ico  # working-tree only — file was never git-tracked, so the deletion does not appear in git history; documented here for traceability

key-decisions:
  - "Chose D-12 Path B (modify existing ImageResponse) over Path A (delete app/icon.tsx + add static app/icon.png) — wordmark PNG (620x210, ~2.95:1 aspect) does not reduce legibly to 32x32 per 08-PATTERNS.md and RESEARCH.md Pitfall 6"
  - "Used hex #f97316 (Tailwind v4 orange-500 canonical hex) inline because Satori (the engine behind ImageResponse) does NOT support oklch() or CSS custom properties — verified RESEARCH.md §Common Pitfalls Pitfall 6"
  - "Light-mode color literal #fafafa (zinc-50) preserved — passes WCAG AA on orange-500 per Plan 01 audit; only the comment text was updated for clarity"
  - "favicon.ico deleted via rm -f (no git rm) because the file was never git-tracked — verified via 'git ls-files dealdrop/app/favicon.ico' returning empty"

patterns-established:
  - "When editing Satori-rendered ImageResponse code, use plain hex color strings — oklch and CSS custom properties are unsupported"
  - "When two icon sources can coexist (app/icon.tsx + app/favicon.ico), delete the .ico to make app/icon.tsx the single source of truth"

requirements-completed: [BRAND-03]

# Metrics
duration: 1min
completed: 2026-05-02
---

# Phase 08 Plan 03: Favicon Refresh Summary

**Swapped the inline ImageResponse background in dealdrop/app/icon.tsx from #18181b (zinc-900) to #f97316 (Tailwind v4 orange-500) and deleted the working-tree dealdrop/app/favicon.ico leftover — Path B chosen because the wordmark logo doesn't reduce legibly to 32x32.**

## Performance

- **Duration:** 1 min (~65s wall clock)
- **Started:** 2026-05-02T14:22:22Z
- **Completed:** 2026-05-02T14:23:27Z
- **Tasks:** 2
- **Files modified:** 1 (icon.tsx); plus 1 working-tree-only deletion (favicon.ico)

## Accomplishments

- `dealdrop/app/icon.tsx` ImageResponse now renders a 32x32 PNG with `#f97316` (orange-500) background and `#fafafa` (zinc-50) "D" glyph — browser tab matches the new DealDrop orange brand
- Generic v1.0 zinc-900 favicon retired — single hex value swap in source
- `dealdrop/app/favicon.ico` (25,931-byte Next.js scaffold leftover from 2026-04-17) finally removed from the working tree; Phase 7 D-07 directive lands in this plan
- `dealdrop/app/icon.tsx` remains the canonical Next.js icon route (Path B confirmed; no `app/icon.png` introduced)
- `npm run build` still succeeds with the `/icon` route emitted; `npm run lint` exits clean

## Task Commits

Each task was committed atomically (where there was a tracked change to commit):

1. **Task 1: Swap app/icon.tsx ImageResponse background from zinc-900 to orange-500** — `e1568d7` (feat)
2. **Task 2: Delete dealdrop/app/favicon.ico working-tree leftover** — _no git commit_ (file was never git-tracked; `rm -f` on filesystem only — see "Files Created/Modified" below)

## Files Created/Modified

- `dealdrop/app/icon.tsx` — Inline `style={{}}` background changed from `'#18181b'` (zinc-900) to `'#f97316'` (orange-500). Color comment updated from `// zinc-50` to `// zinc-50 (passes AA on orange-500)`. The hex value `#fafafa` and every other property in the inline style (fontSize, fontWeight, width, height, display, alignItems, justifyContent, letterSpacing) are unchanged. The exported `size = { width: 32, height: 32 }` and `contentType = 'image/png'` constants are unchanged. The literal "D" glyph is unchanged.
- `dealdrop/app/favicon.ico` — DELETED via `rm -f`. File was a 25,931-byte Next.js scaffold leftover dated 2026-04-17, never git-tracked (verified via `git ls-files dealdrop/app/favicon.ico` returning empty). Because git never saw this file, the deletion does not appear in any git commit; this SUMMARY is the traceability record. Phase 7 D-07 originally directed this deletion but it never landed in commits because git was unaware of the file.

## Diff Summary

**`dealdrop/app/icon.tsx`** — two-line change:

| Line | Before | After |
|------|--------|-------|
| 29 | `background: '#18181b', // zinc-900` | `background: '#f97316', // orange-500` |
| 30 | `color: '#fafafa',      // zinc-50` | `color: '#fafafa',      // zinc-50 (passes AA on orange-500)` |

The hex value on line 30 (`#fafafa`) is unchanged; only the trailing comment was extended. Every other line in the file is byte-for-byte identical.

## Why hex `#f97316`, not the verified oklch from Plan 01

Plan 01 (`08-01-SUMMARY.md`) committed `oklch(70.5% 0.213 47.604)` for `--primary` in `globals.css`. Plan 03 cannot use that oklch literal here because **Satori (the engine behind Next.js's `ImageResponse`) does not support `oklch()` or CSS custom properties**. RESEARCH.md §"Common Pitfalls Pitfall 6" calls this out explicitly. Tailwind v4 ships orange-500 with the canonical hex `#f97316` (verified in `dealdrop/node_modules/tailwindcss/theme.css` and 08-PATTERNS.md). The visual is the same orange as the rest of the brand cascade — no discrepancy.

## Why Path B (modify ImageResponse), not Path A (static `app/icon.png`)

D-12 in 08-CONTEXT.md grants planner discretion. Path B was chosen because:

- The user-provided wordmark PNG `dealdrop/public/deal-drop-logo.png` is 620x210 (~2.95:1 aspect). Center-cropped or fit-contained at 32x32 it loses legibility — either the wordmark is squashed or the glyphs become 1-2 pixels tall.
- A single-letter glyph ("D") on a colored background is the clearest tab icon. Browsers render at 16x16 and 32x32 reliably; a wordmark at those sizes is unreadable.
- 08-PATTERNS.md §"app/icon.tsx — Path B" explicitly notes Path B is the safer default for this asset.

## Decisions Made

- **Path B (modify ImageResponse)** chosen over Path A (delete + add `app/icon.png`) for the reasons listed above.
- **Hex `#f97316` literal** used inline because Satori cannot resolve `oklch()` or `var(--primary)`.
- **Light-mode `color: '#fafafa'` preserved verbatim** — zinc-50 already passes AA on orange-500 (Plan 01 audit). Only the trailing comment was clarified.
- **`rm -f` for favicon.ico** because the file was never git-tracked. No `git rm` is appropriate — git never knew about the file.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. One thing worth noting: because `dealdrop/app/favicon.ico` was never git-tracked, deleting it produces no entry in git history. This is the expected behavior per the plan (`<read_first>` block noted "the deletion never landed in commits" as the original Phase 7 D-07 issue). Task 2 therefore has no commit hash; the deletion is recorded only in this SUMMARY and was verified via `test ! -f dealdrop/app/favicon.ico` (passing).

## Threat Model Compliance

- **T-08-03-ICON-INJECTION-LOW** (Tampering): Disposition `accept`. Verified — `app/icon.tsx` JSX uses ONLY hard-coded literal strings (`'#f97316'`, `'#fafafa'`, `'D'`). No `params`, `searchParams`, env vars, or DB reads. Zero injection surface.
- **T-08-03-FAVICON-STALE-LOW** (Information Disclosure / brand misrepresentation via stale icon): Disposition `mitigate`. Mitigation shipped — the working-tree `favicon.ico` is deleted; `app/icon.tsx` (now orange) is the sole icon source. Confirmed via `test ! -f dealdrop/app/favicon.ico`.

## Test Runs (all green)

| Check | Result |
|-------|--------|
| `grep -F "background: '#f97316'" dealdrop/app/icon.tsx` | 1 match (PASS) |
| `! grep -F "background: '#18181b'" dealdrop/app/icon.tsx` | zinc-900 absent (PASS) |
| `grep -F "color: '#fafafa'" dealdrop/app/icon.tsx` | match present (PASS) |
| `grep -F "ImageResponse" dealdrop/app/icon.tsx` | route handler shape preserved (PASS) |
| `grep "width: 32," dealdrop/app/icon.tsx` | size export preserved (PASS) |
| `grep "height: 32," dealdrop/app/icon.tsx` | size export preserved (PASS) |
| `grep "contentType = 'image/png'" dealdrop/app/icon.tsx` | contentType export preserved (PASS) |
| `! grep "oklch" dealdrop/app/icon.tsx` | Satori-incompatible function not introduced (PASS) |
| `test ! -f dealdrop/app/favicon.ico` | favicon deleted (PASS) |
| `test -f dealdrop/app/icon.tsx` | icon route preserved (PASS) |
| `! test -f dealdrop/app/icon.png` | Path A artifact NOT introduced (PASS) |
| `cd dealdrop && npm run build` | exit 0; `/icon` route emitted (PASS) |
| `cd dealdrop && npm run lint -- app/icon.tsx` | exit 0 (PASS) |

## User Setup Required

None — no external service configuration required.

## Note for BRAND-05 Visual Walk (Plan 06)

Add to `08-VERIFICATION.md`: confirm tab favicon displays orange in **Chrome and Safari at default zoom** after `npm run build && npm start` against `http://localhost:3000`. Expected: orange-500 background with white "D" glyph at 16x16 (browser tab default) and 32x32 (high-DPR / large tab modes). Both light- and dark-themed browser chrome should retain legibility — `#fafafa` on `#f97316` passes AA in both.

## Next Phase Readiness

- BRAND-03 closed. Plans 04, 05, 06 unaffected — no file overlap.
- Plan 04 (Hero cleanup + orange-50 gradient) can proceed.
- Plan 05 (CTA rename) can proceed.
- Plan 06 (BRAND-05 visual walk) will pick up the favicon row described above.

## Threat Flags

None — plan modified ONE inline hex value in a static route handler and deleted ONE working-tree binary that was never git-tracked. No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries.

## Self-Check: PASSED

**File existence:**
- FOUND: `dealdrop/app/icon.tsx` (modified — verified line 29 contains `'#f97316'`)
- ABSENT: `dealdrop/app/favicon.ico` (verified via `test ! -f`)
- ABSENT: `dealdrop/app/icon.png` (Path A NOT taken — verified)
- FOUND: `.planning/phases/08-brand-polish/08-03-SUMMARY.md` (this file)

**Commits:**
- FOUND: `e1568d7` (Task 1: feat(08-03): swap app/icon.tsx ImageResponse background to orange-500)
- N/A: Task 2 has no commit (favicon.ico was never git-tracked; `rm -f` is filesystem-only — documented above)

---
*Phase: 08-brand-polish*
*Completed: 2026-05-02*
