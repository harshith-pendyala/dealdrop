# DealDrop Project Retrospective

A living record of milestone retrospectives — what worked, what was inefficient, patterns established, and key lessons. Updated at each `/gsd-complete-milestone`.

---

## Milestone: v1.0 — DealDrop MVP

**Shipped:** 2026-05-02
**Started:** 2026-04-18
**Timeline:** 14 days
**Phases:** 7 | **Plans:** 38 | **Commits:** 232 | **LOC:** ~5,657 (TS/TSX/SQL)

### What Was Built

A universal e-commerce price tracker, live in production at `https://dealdrop-khaki.vercel.app`. A user signs in with Google, pastes any product URL, and DealDrop scrapes it via Firecrawl, stores it in Supabase, and runs a daily 09:00 UTC pg_cron job that re-scrapes prices and sends a Resend email the moment any price drops. Each product has a Recharts line chart of its price history.

The full sign-in → add product → forced price drop → cron POST → email + chart loop was verified end-to-end on production (Phase 7 Plan 07-08, DEP-06). Email and chart screenshots are committed.

### What Worked

- **Wave-based parallel execution.** Each phase planned plans into waves; Wave 1 plans with no shared `files_modified` ran in parallel via worktree subagents. Phase 7's Wave 1 (07-01 + 07-02 + 07-03) ran three agents concurrently.
- **Migration-per-concern discipline.** Six migrations (0001..0006), none reopened. Phase 7's prod URL cutover added 0006 instead of editing 0005's wrapper — kept history auditable.
- **Vault for secrets, never in migrations.** `dealdrop_cron_secret` lives only in Supabase Vault and Vercel `--sensitive` env. Migration 0005's commented-out `vault.create_secret` block + 0006's identical pattern means a `grep -rE '[a-f0-9]{32,}'` of all migrations returns empty.
- **`useOptimistic` + Server Action pairing.** `ProductGrid.tsx` uses `useOptimistic` to render a `SkeletonCard` placeholder while `addProduct` is in flight — POL-02 manual UAT confirmed it on prod.
- **Read-before-edit hooks caught stale-context regressions.** Forced fresh reads of files before each Edit, preventing me from clobbering parallel changes.
- **Operator-driven checkpoint plans for ops work.** Plans 07-05 (prod env), 07-06 (OAuth), 07-08 (DEP-06 walk) explicitly handed off to the user for dashboard config + manual smoke tests with structured "type approved/deviation" replies.

### What Was Inefficient

- **Worktree subagent commits leaked to main branch.** Plan 07-01's executor committed Task 1 directly to `master` instead of its worktree branch (`worktree-agent-ac6f454c`). Worked itself out via merge but suggests worktree branch checkout had a hiccup. Subsequent plans switched to inline sequential execution after Wave 1.
- **Subagent permission failures mid-plan.** 07-01's executor finished writing files + tests but couldn't run `git commit` due to missing Bash permission, requiring manual orchestrator cleanup to commit Tasks 2-3 + write SUMMARY.md.
- **REQUIREMENTS.md tracking-table drift.** All 80 requirements were verified per per-phase VERIFICATION.md files, but the central traceability table only showed 24/80 marked "Complete" at milestone audit time — `gsd phase complete` didn't auto-update the central table. Recommend adding incremental REQUIREMENTS.md status flips to the phase-complete tooling.
- **Nyquist gaps accumulated.** 5/7 phases marked `nyquist_compliant: false` and 2/7 missing wave-0 closure. Acceptable at portfolio bar but indicates the Nyquist validation step was being skipped or partially applied during execution.
- **Repo-wide lint baseline drifted to 246 errors.** New code is lint-clean but the existing codebase has accumulated `@typescript-eslint/no-explicit-any` and similar warnings. Out-of-scope for v1 portfolio bar but should be tackled in v1.1.
- **Same-account testing for OAuth + email.** Operator has only one Google account; reused it for both prod-OAuth smoke test (07-06) and DEP-06 email test (07-08). Functionally valid (prod auth.users is fresh DB) but PITFALLS:342 explicitly preferred non-owner inbox for Resend DNS-silent-success defense.

### Patterns Established

- **Operator checkpoint protocol.** Non-autonomous plans return structured "Awaiting" blocks with explicit resume signals (`approved: <summary>` or `deviation: <symptom>`). Orchestrator pauses, presents to user, then continues inline (no fresh subagent spawn for short tasks).
- **`overrides_applied` frontmatter field.** Tracks intentional CONTEXT.md deviations approved by user (e.g., Plan 07-01's `reset` → `unstable_retry` per installed Next.js 16.2 docs). Carries through to milestone audit as `overrides[]` block with reason + accepted_by + accepted_at.
- **Stable Vercel alias > deployment URL for cron hardcoding.** Migration 0006 uses `dealdrop-khaki.vercel.app` (alias) not `dealdrop-pyyc6dlpa-...vercel.app` (per-deploy hash). Future deploys don't break the cron.
- **Vercel Deployment Protection scoped to Preview only.** Cron + public traffic require production to be unprotected; preview branches retain SSO. One-line setting flip; load-bearing for the daily-cron loop.
- **Single Google OAuth client serves dev + prod Supabase.** Both Supabase projects share the same Client ID/Secret. Acceptable at portfolio bar; production-hardening would split with separate quotas. Documented in `AUTH-08-OPS-CHECKLIST.md` Part 3.

### Key Lessons

- **Read all the way to the dashboard.** Vercel Deployment Protection 401'd the smoke test before any code ran. A dashboard-side default setting blocked the cron loop. Always test public reachability with `curl` (no auth context) before assuming code is at fault.
- **Client Secret rotation has dual-paste consequences.** Rotating the Google OAuth Client Secret to fix the prod `Unable to exchange external code` error required re-pasting into BOTH Supabase projects. Single source of truth = the Google OAuth client; both Supabase projects are downstream copies.
- **`regprocedure` cast needs `()` for zero-arg functions.** Supabase SQL Editor rejected `'public.fn_name'::regprocedure`; required `'public.fn_name()'::regprocedure`. The `oid`-from-`pg_proc` lookup is more readable and avoids the cast entirely.
- **Cell-truncation in Supabase SQL Editor obscures multi-line text.** `pg_get_functiondef` output was truncated to the trailing `end if;`. Use a `LIKE '%substring%'` boolean predicate for assertion-style checks — fits in one cell.
- **Same-account email testing is acceptable when the account email differs from the Resend domain owner.** PITFALLS:342's "non-owner inbox" rule defends against Resend DNS-silent-success when sending TO the account-owner email. If recipient ≠ Resend account owner email, the silent-success risk doesn't apply — visual inbox check + Resend dashboard "delivered" status is sufficient.
- **DevTools "iPhone SE" preset spoofs UA → Google OAuth blocks.** Use DevTools "Responsive" mode instead — viewport-only sizing, no UA spoofing. Real iPhone Safari sends a UA Google accepts.

### Cost Observations

- **Model mix:** ~80% Sonnet (executor + planner + verifier subagents); ~20% Opus (orchestrator with 1M context).
- **Sessions:** Approximately 7 distinct multi-day execution sessions corresponding to the 7 phases.
- **Notable efficiency win:** Inline sequential execution after Wave 1 of Phase 7 dramatically reduced subagent overhead (no fresh-context tax) for the heavily checkpoint-driven prod ops work. Subagent worktrees worked great for autonomous code plans (Phase 1-6 wave parallelization) but became a tax for ops plans where 80% of the work is operator action anyway.

---

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Phases shipped | 7 |
| Plans shipped | 38 |
| Days elapsed | 14 |
| Avg plans/day | 2.7 |
| LOC added | ~5,657 |
| Migrations shipped | 6 |
| `overrides_applied` count | 1 |
| Nyquist compliance | 1/7 fully + 2/7 partial |
| Verification status | 4 passed / 3 human_needed |
| Critical blockers at milestone audit | 0 |

(Future milestones will append rows here for trend visibility.)
