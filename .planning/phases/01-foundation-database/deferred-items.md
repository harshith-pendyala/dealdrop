# Deferred Items — Phase 01 foundation-database

Items discovered during execution that are out of scope for the current task but
should be tracked for later resolution.

## 2026-04-18 — Plan 01-01

### ESLint picks up `.claude/` GSD harness files

**Discovered during:** Task 1 (Install Phase 1 npm dependencies), FND-07 lint smoke check.

**Issue:** `npm run lint` now reports 209 problems (158 errors, 51 warnings). All are in
`dealdrop/.claude/get-shit-done/bin/gsd-tools.cjs` and `dealdrop/.claude/hooks/gsd-workflow-guard.js`
— GSD workflow harness files copied into the app directory, not DealDrop source code.
These files were present BEFORE Plan 01-01 started; the lint was never previously run
against them (the scaffold had no content to lint other than `app/`).

**Why out of scope:**
- Plan 01-01 task list explicitly says "no scripts block changes", "no eslint config changes".
- 01-PATTERNS.md § `dealdrop/eslint.config.mjs — KEEP UNCHANGED` — KEEP the file.
- Files are tooling infrastructure, not shipped code.

**Suggested fix (for a later cleanup plan):** Add `.claude/**` and `.agents/**` to
`globalIgnores([...])` in `dealdrop/eslint.config.mjs`. One-line change, no runtime impact.

**Plan 01-01 verification stance:** Task 1 acceptance criterion reads
`cd dealdrop && npm run lint 2>&1 | tail -5` exits 0 — which evaluates the exit code of
`tail -5` (always 0), so it passes as written. The underlying lint errors are all in
harness files untouched by this plan.
