---
phase: 07-polish-deployment
plan: "02"
subsystem: branding
tags: [favicon, icon, next/og, ImageResponse, branding]
dependency_graph:
  requires: []
  provides: [dynamic-icon-route, /icon-static-asset]
  affects: [browser-tab-branding, <head>-link-rel-icon]
tech_stack:
  added: [next/og ImageResponse]
  patterns: [app/icon.tsx Next.js file convention]
key_files:
  created:
    - dealdrop/app/icon.tsx
    - dealdrop/postcss.config.mjs
    - dealdrop/eslint.config.mjs
  modified: []
decisions:
  - favicon.ico was never committed to git (untracked in main repo); worktree environment correctly has no favicon.ico — git rm step not needed, end state already satisfied
  - postcss.config.mjs and eslint.config.mjs were both untracked in main repo; added to worktree as Rule 3 auto-fixes to unblock build and lint
metrics:
  duration: "~15 min"
  completed: "2026-04-25"
  tasks_completed: 3
  files_created: 3
  files_deleted: 0
---

# Phase 7 Plan 02: Replace Scaffold Favicon with DealDrop Branded Icon Summary

**One-liner:** Dynamic `app/icon.tsx` using `ImageResponse` from `next/og` ships a stylized zinc-900 "D" glyph to browser tabs; scaffold favicon.ico was never tracked in git (no deletion needed in worktree).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Read Next.js dynamic-icon docs + verify state | — | Reading only, no files |
| 2 | Create dealdrop/app/icon.tsx | 5d59e26 | app/icon.tsx, postcss.config.mjs |
| 3 | Delete dealdrop/app/favicon.ico (verify absent) | — | No op — favicon.ico was never git-tracked |

## Key Artifacts

**File created:** `dealdrop/app/icon.tsx` (46 lines)

```tsx
// dealdrop/app/icon.tsx
import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (<div style={{ fontSize: 22, fontWeight: 700, background: '#18181b',
                   color: '#fafafa', width: '100%', height: '100%',
                   display: 'flex', alignItems: 'center',
                   justifyContent: 'center', letterSpacing: '-0.02em' }}>D</div>),
    { ...size }
  )
}
```

**Glyph design:** Stylized uppercase "D" letterform on zinc-900 (#18181b) background with zinc-50 (#fafafa) text. Matches Shadcn new-york/zinc theme. No emojis (project convention).

**File deleted:** `dealdrop/app/favicon.ico` — was never committed to git (untracked in main repo). The worktree had no favicon.ico. End state satisfied without `git rm`.

## Build Output Showing /icon Route

```
Route (app)
┌ ƒ /
├ ○ /_not-found
├ ƒ /api/cron/check-prices
├ ƒ /auth/callback
└ ○ /icon         <- DealDrop branded icon served as static asset
```

## Verification Results

| Check | Result |
|-------|--------|
| `app/icon.tsx` exists | PASS |
| `app/favicon.ico` absent | PASS |
| ImageResponse import from `next/og` | PASS |
| `export const size` present | PASS |
| `export const contentType = 'image/png'` present | PASS |
| Default export function present | PASS |
| No `display: grid` (Satori constraint) | PASS |
| npm run build | PASS — /icon in route output |
| npm run test | PASS — 157/157 tests |
| npm run lint | PASS — no errors in icon.tsx (pre-existing errors in test files unrelated) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] postcss.config.mjs missing from worktree**
- **Found during:** Task 2 build verification
- **Issue:** `postcss.config.mjs` was never committed to git (untracked in main repo). Worktree inherits only tracked files. Turbopack failed to resolve `@import "tw-animate-css"` in `globals.css` because the PostCSS plugin was absent.
- **Fix:** Created `dealdrop/postcss.config.mjs` identical to main repo's copy.
- **Files modified:** `dealdrop/postcss.config.mjs` (created)
- **Commit:** 5d59e26

**2. [Rule 3 - Blocking] eslint.config.mjs missing from worktree**
- **Found during:** Task 3 lint verification
- **Issue:** `eslint.config.mjs` was never committed to git (untracked in main repo). ESLint 9 couldn't find its flat config file.
- **Fix:** Created `dealdrop/eslint.config.mjs` identical to main repo's copy.
- **Files modified:** `dealdrop/eslint.config.mjs` (created)
- **Commit:** 562c107

**3. [Rule 1 - Bug] Comment text in icon.tsx triggered Satori grid check**
- **Found during:** Task 2 acceptance criteria
- **Issue:** The comment `// NO display: grid` matched the `display:.*grid` grep pattern.
- **Fix:** Rephrased comment to "Grid layout is not supported by Satori."
- **Files modified:** `dealdrop/app/icon.tsx`
- **Commit:** 5d59e26

### Pre-existing Issues (out of scope)

- `npm run lint` reports 30 errors in test files (`@typescript-eslint/no-explicit-any` in `products.test.ts`, `get-user-products.test.ts`). Also present in main repo (246 problems). Not introduced by this plan.
- `favicon.ico` was never tracked by git — the plan's `git rm app/favicon.ico` step was a no-op in the worktree context. The desired outcome (no favicon.ico in the repo) is achieved.

## Known Stubs

None. `app/icon.tsx` is fully implemented and produces the DealDrop branded icon.

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced. `app/icon.tsx` executes at build time only (static asset route `/icon`). T-07-04 mitigation confirmed: single source of truth via `app/icon.tsx`, no `favicon.ico` in tracked git state.

## Self-Check: PASSED

- `dealdrop/app/icon.tsx` exists: FOUND
- `dealdrop/app/favicon.ico` absent: CONFIRMED
- Commit 5d59e26 exists: FOUND
- Commit 562c107 exists: FOUND
- Build route `/icon` in output: CONFIRMED
- 157/157 tests passing: CONFIRMED
