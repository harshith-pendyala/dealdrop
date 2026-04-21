---
phase: 6
slug: automated-monitoring-email-alerts
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TBD — planner to confirm from RESEARCH.md §Validation Seam Map (likely vitest, matching project default) |
| **Config file** | TBD — Wave 0 installs / configures if not already present |
| **Quick run command** | TBD — planner fills from RESEARCH.md |
| **Full suite command** | TBD — planner fills from RESEARCH.md |
| **Estimated runtime** | TBD |

---

## Sampling Rate

- **After every task commit:** Run `{quick run command}`
- **After every plan wave:** Run `{full suite command}`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** TBD — planner fills

---

## Per-Task Verification Map

Planner fills this table using RESEARCH.md §Validation Seam Map as the source of truth. Every task in every PLAN.md must appear here with its requirement mapping, test type (unit / integration / manual), and the exact command that verifies it.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 6-XX-XX | XX | N | REQ-XXX | T-6-XX / — | expected secure behavior | unit/integration/manual | `{command}` | ✅ / ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Planner enumerates test-scaffold tasks from RESEARCH.md §Wave 0 gap list here. Expected items include (but are not limited to):

- [ ] Test harness for `POST /api/cron/check-prices` handler branches (auth, scrape-success, scrape-failure, price-unchanged)
- [ ] Pure-function unit tests for `renderPriceDropEmailHtml`, percent-drop calc, price-change gate
- [ ] Integration fixture for Supabase admin client + price_history writes
- [ ] Fixture for Resend SDK error shapes (`rate_limit_exceeded`, `monthly_quota_exceeded`, `invalid_from_address`)
- [ ] Migration smoke-test for `0005_cron_daily_price_check.sql` — verify Vault secret stored, wrapper function callable, cron.job row grep-clean of plaintext token

*If the planner determines existing infrastructure covers everything: replace with "Existing infrastructure covers all phase requirements" and justify in plan frontmatter.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| pg_cron fires daily at 09:00 UTC | CRON-10 | Requires real time passage + Supabase cloud; cannot be fully automated in CI | Wait for 09:00 UTC after deploy (Phase 7 DEP-06 path); inspect `cron.job_run_details` for success row |
| Resend actually delivers an email to an inbox | EMAIL-01, EMAIL-04 | Real SMTP path depends on domain DNS (SPF/DKIM) propagation | Send test drop from staging; verify receipt in real inbox and passing DMARC |
| CRON_SECRET grep-clean of `cron.job` command | CRON-11 | Verification is a SQL query against live DB, not a unit test | `SELECT command FROM cron.job WHERE jobname = 'dealdrop-daily-price-check';` must NOT contain the CRON_SECRET value |

Planner may extend this list based on RESEARCH.md §Validation Seam Map.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency recorded
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
