# Roadmap: DealDrop

## Milestones

- ✅ **v1.0 DealDrop MVP** — Phases 1–7 (shipped 2026-05-02)
- ✅ **v1.1 Brand Polish & Email Config** — Phases 8–9 (shipped 2026-05-03)
- 📋 **v1.2 Custom Domain & Real Email** — TBD (planned, see PROJECT.md Next Milestone Goals)

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

<details>
<summary>✅ v1.1 Brand Polish & Email Config (Phases 8–9) — SHIPPED 2026-05-03</summary>

- [x] Phase 8: Brand Polish (6/6 plans) — completed 2026-05-03 (BRAND-05 visual walk 24/24 passed; T16 hero dark-mode gradient leak fixed via quick/260503-ime)
- [x] Phase 9: Resend Env Config (4/4 plans) — completed 2026-05-03

**Full archive:** [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)
**Requirements:** [milestones/v1.1-REQUIREMENTS.md](milestones/v1.1-REQUIREMENTS.md) (all 10 v1.1 requirements validated)
**Quick tasks:** quick/260503-ime — broaden `@custom-variant dark` in globals.css to honor `prefers-color-scheme`

</details>

### 📋 v1.2 Custom Domain & Real Email (Planned)

Pending milestone scoping via `/gsd-new-milestone`. Likely candidates:
- Custom domain purchase + DNS configuration
- Resend domain verification (SPF / DKIM / DMARC)
- Vercel custom domain attachment
- Production email cutover (unset `RESEND_TEST_RECIPIENT`, redeploy)
- Optional: branded sender display name

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
| 8. Brand Polish                             | v1.1      | 6/6            | Complete    | 2026-05-03 |
| 9. Resend Env Config                        | v1.1      | 4/4            | Complete    | 2026-05-03 |
