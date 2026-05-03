# Roadmap: DealDrop

## Milestones

- ✅ **v1.0 DealDrop MVP** — Phases 1–7 (shipped 2026-05-02)
- 🚧 **v1.1 Brand Polish & Email Config** — Phases 8–9 (in progress)

## Phases

<details>
<summary>✅ v1.0 DealDrop MVP (Phases 1–7) — SHIPPED 2026-05-02</summary>

- [x] Phase 1: Foundation & Database (5/5 plans) — completed 2026-04-18
- [x] Phase 2: Authentication & Landing (5/5 plans) — completed 2026-04-19
- [x] Phase 3: Firecrawl Integration (4/4 plans) — completed 2026-04-20
- [x] Phase 4: Product Tracking & Dashboard (7/7 plans) — completed 2026-04-20
- [x] Phase 5: Price History Chart (4/4 plans) — completed 2026-04-20
- [x] Phase 6: Automated Monitoring & Email Alerts (5/5 plans) — completed 2026-04-25
- [x] Phase 7: Polish & Deployment (8/8 plans) — completed 2026-05-02

**Full archive:** [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
**Requirements:** [milestones/v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md) (all 80 v1 requirements satisfied)
**Audit:** [milestones/v1.0-MILESTONE-AUDIT.md](milestones/v1.0-MILESTONE-AUDIT.md) (status: tech_debt — no critical blockers; debt accepted at portfolio bar)

</details>

### v1.1 Brand Polish & Email Config

- [ ] **Phase 8: Brand Polish** — DealDrop logo + favicon + accent color + cleaned footer
- [ ] **Phase 9: Resend Env Config** — env-configurable from-address + test-recipient override + docs

## Phase Details

### Phase 8: Brand Polish
**Goal**: Logged-in and logged-out users see a coherent DealDrop brand — logo in the header, branded favicon, a single accent color across primary buttons/links/highlights, and no leftover "Made with Love" footer copy.
**Depends on**: Phase 7 (v1.0 production deploy must be green; this phase polishes shipped UI)
**Requirements**: BRAND-01, BRAND-02, BRAND-03, BRAND-04, BRAND-05
**Success Criteria** (what must be TRUE):
  1. User no longer sees the "Made with Love" line anywhere in the rendered footer (logged-in and logged-out routes both clean).
  2. User sees the DealDrop logo image rendered in the application header on every page that has a header.
  3. Browser tab shows the DealDrop logo as the favicon — generic v1.0 icon at `app/icon.tsx` is replaced/retired.
  4. Primary buttons, links, and key UI highlights all use one consistent accent color, defined as a Tailwind theme token / CSS custom property (single source of truth).
  5. Accent color renders legibly in both light and dark mode — no contrast regression vs v1.0 on default, hover, and focus states.
**Plans**: 6 plans
  - [x] 08-01-PLAN.md — Token cascade: redefine --primary in globals.css to verified Tailwind v4 orange-500/-400 oklch + apply text-primary to ProductCard price (BRAND-04 foundation)
  - [x] 08-02-PLAN.md — Header logo: replace text wordmark with next/image of /deal-drop-logo.png at 32px, wrapped in next/link to / with aria-label='DealDrop home'; new Header.test.tsx Wave 0 (BRAND-02)
  - [x] 08-03-PLAN.md — Favicon refresh (D-12 Path B): swap app/icon.tsx ImageResponse background from zinc-900 to orange-500 hex; delete dealdrop/app/favicon.ico working-tree leftover (BRAND-03)
  - [x] 08-04-PLAN.md — Hero polish: delete 'Made with love' <p>; add bg-gradient-to-b from-orange-50 with dark:from-transparent suppressor; new Hero.test.tsx Wave 0 (BRAND-01 + BRAND-04)
  - [x] 08-05-PLAN.md — 'Add Product' → 'Track Price' rename across AddProductDialog, AddProductForm, AddProductForm.test.tsx, ProductGrid.test.tsx (per D-11; component file names + backend identifiers preserved)
  - [x] 08-06-PLAN.md — Verification + visual walk: scaffold 08-VERIFICATION.md, run automated regression sweep + manual walk per D-08, fill audit rows (BRAND-05)
**UI hint**: yes

### Phase 9: Resend Env Config
**Goal**: The Resend email-send pipeline is fully env-configurable — the `from` address and an optional test-recipient override are read from validated env vars, so production code is unblocked for real-recipient sends the moment a custom domain is verified in a future milestone.
**Depends on**: Phase 6 (Automated Monitoring & Email Alerts — `sendPriceDropAlert` server action is the refactor target) and Phase 8 (sequenced after for clean atomic-commit hygiene; no functional dependency)
**Requirements**: EMAIL-01, EMAIL-02, EMAIL-03, EMAIL-04, EMAIL-05
**Success Criteria** (what must be TRUE):
  1. Setting `RESEND_FROM_EMAIL` in env changes the `from` address used by `sendPriceDropAlert` — no hardcoded literal remains in source.
  2. Setting `RESEND_TEST_RECIPIENT` routes every price-drop alert to that single address regardless of which user added the product (verifiable by triggering a forced drop on the local cron and observing the inbox).
  3. With `RESEND_TEST_RECIPIENT` unset, alerts deliver to the user-of-record's email (production code path preserved — same behavior as v1.0).
  4. App fails fast at boot if a required new env var is missing — typed env schema (`env.server.ts`) gates startup.
  5. README (or equivalent docs) clearly explains the one-env-var flip from test-recipient mode to production mode for the future domain-verification milestone.
**Plans**: 4 plans
  - [x] 09-01-PLAN.md — env.server.ts schema extension: add RESEND_TEST_RECIPIENT: z.string().email().optional() to server + runtimeEnv blocks (EMAIL-02, EMAIL-04)
  - [ ] 09-02-PLAN.md — resend.ts override: replace to: input.to with to: env.RESEND_TEST_RECIPIENT ?? input.to + module-load console.warn for observability (EMAIL-01, EMAIL-02, EMAIL-03, D-01, D-02)
  - [ ] 09-03-PLAN.md — resend.test.ts: nested override describe (override-set + override-unset SDK assertions) + top-level env-validation rejection tests for malformed + mailbox-format values (EMAIL-02, EMAIL-03, EMAIL-04, D-04, D-06)
  - [x] 09-04-PLAN.md — Docs: append RESEND_TEST_RECIPIENT= to .env.example with usage comment + replace README scaffold with real DealDrop README including Email recipient modes section (EMAIL-01, EMAIL-05, D-07)

## Progress

| Phase                                       | Milestone | Plans Complete | Status      | Completed  |
| ------------------------------------------- | --------- | -------------- | ----------- | ---------- |
| 1. Foundation & Database                    | v1.0      | 5/5            | Complete    | 2026-04-18 |
| 2. Authentication & Landing                 | v1.0      | 5/5            | Complete    | 2026-04-19 |
| 3. Firecrawl Integration                    | v1.0      | 4/4            | Complete    | 2026-04-20 |
| 4. Product Tracking & Dashboard             | v1.0      | 7/7            | Complete    | 2026-04-20 |
| 5. Price History Chart                      | v1.0      | 4/4            | Complete    | 2026-04-20 |
| 6. Automated Monitoring & Email Alerts      | v1.0      | 5/5            | Complete    | 2026-04-25 |
| 7. Polish & Deployment                      | v1.0      | 8/8            | Complete    | 2026-05-02 |
| 8. Brand Polish                             | v1.1      | 6/6            | Plans Complete (BRAND-05 → HUMAN-UAT) | 2026-05-02 |
| 9. Resend Env Config                        | v1.1      | 0/4            | Plans Complete | -          |
