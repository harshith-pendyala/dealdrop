---
phase: 07-polish-deployment
plan: 01
status: complete
requirements: [POL-03]
completed: 2026-04-25
---

# 07-01 — Two-tier Error Boundary

## Outcome

Shipped page-level and root-level error boundaries per POL-03 / D-01. A portfolio reviewer who hits an unexpected render error now sees a friendly Card fallback instead of a Next.js dev overlay or white screen.

## Key Files Created

- `dealdrop/app/error.tsx` — page-level boundary (client component, Shadcn Card + Button + next/link, `unstable_retry`, digest-only logging).
- `dealdrop/app/global-error.tsx` — root boundary (zero Shadcn imports, owns its own `<html><body>`, inline-styled to approximate zinc-900 dark theme).
- `dealdrop/app/error.test.tsx` — 4 vitest tests GREEN (headline, retry call, go-home link, no error.message leak).
- `dealdrop/app/global-error.test.tsx` — 3 vitest tests GREEN (headline, retry call, no error.message leak).

## Commits

- `043751d` — feat(07-01): add page-level error boundary with POL-03 vitest coverage
- (this) — feat(07-01): add root-level global-error boundary with vitest coverage

## Critical Decision

CONTEXT.md D-02/D-03 referenced the `reset()` prop, but installed Next.js 16.2.4 docs (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md:25-50`) rename it to `unstable_retry`. Both boundaries use `unstable_retry` per user approval.

## Self-Check: PASSED

- [x] All 4 files created and tracked
- [x] 7/7 tests GREEN
- [x] Build green; lint clean on new files
- [x] error.tsx imports Shadcn (Card, Button) + next/link
- [x] global-error.tsx has zero `@/components/ui` imports
- [x] Neither fallback renders `error.message` (digest-only logging)
