# DealDrop — Milestone v1.1 Requirements

**Milestone:** v1.1 Brand Polish & Email Config
**Goal:** Tighten v1.0's portfolio polish (logo, accent color, footer copy) and refactor Resend wiring to be env-configurable so production emails can flow to any recipient once a domain is verified later.
**Defined:** 2026-05-02

---

## v1.1 Requirements

### Branding

- [x] **BRAND-01**: User no longer sees the "Made with Love" line in the rendered app footer.
- [x] **BRAND-02**: User sees a DealDrop logo image in the application header (asset provided by user, dropped in as PNG/SVG).
- [x] **BRAND-03**: Browser tab shows the DealDrop logo as the favicon — replacing the generic v1.0 icon at `app/icon.tsx`.
- [x] **BRAND-04**: A single accent color is applied consistently across primary buttons, links, and key UI highlights, defined as a Tailwind theme token / CSS custom property (so future palette changes are one-line).
- [x] **BRAND-05**: Accent color renders correctly in both light and dark mode with no contrast regression vs v1.0 (legibility preserved on hover/focus states). [24/24 visual walk passed 2026-05-03; T16 hero dark-mode gradient leak fixed by quick/260503-ime]

### Email Config

- [x] **EMAIL-01**: Resend `from` address is sourced from an env var (e.g. `RESEND_FROM_EMAIL`) rather than a hardcoded literal — local dev has a sensible default. [validated Phase 9 — `from: env.RESEND_FROM_EMAIL` at `resend.ts:159`]
- [x] **EMAIL-02**: A test-recipient override env var (e.g. `RESEND_TEST_RECIPIENT`) routes all price-drop alerts to that single address when set, regardless of which user added the product. [validated Phase 9 — `to: env.RESEND_TEST_RECIPIENT ?? input.to` at `resend.ts:160`]
- [x] **EMAIL-03**: When the test-recipient override is unset, the production code path delivers alerts to the user-of-record's email — preserving v1.0 behavior for when a custom domain is verified in a future milestone. [validated Phase 9 — nullish-coalesce fallback]
- [x] **EMAIL-04**: New env vars are validated through the existing typed env schema (`env.server.ts`) — required vs optional documented; missing required values fail fast at boot. [validated Phase 9 — `RESEND_TEST_RECIPIENT: z.string().email().optional()` at `env.server.ts:20`]
- [x] **EMAIL-05**: README (or equivalent docs) explains how to flip from test-recipient mode to production mode — a one-env-var change after a domain is verified. [validated Phase 9 — `dealdrop/README.md` Email recipient modes section]

---

## Future Requirements

Deferred to a later milestone (most likely v1.2 Custom Domain + Real Email):

- User-purchased custom domain configured in Vercel as primary deployment URL
- Resend domain verified with SPF / DKIM / DMARC records
- Production code path active (test-recipient override unset) so alerts reach real user inboxes
- Optional: branded sender display name (e.g. "DealDrop Alerts <alerts@dealdrop.app>")

Other deferred polish (likely v1.3+):

- Full visual refresh beyond a single accent color (palette, typography, spacing pass)
- Animated / interactive logo variants
- Per-component theming overhaul

---

## Out of Scope (this milestone)

Explicit exclusions with reasoning:

- **Domain purchase** — User does not own a domain yet and chose to defer the spend; refactoring to env-configurable now unblocks the work later without lock-in.
- **DNS records / Resend domain verification** — Cannot proceed without a domain.
- **Vercel custom domain configuration** — Same dependency on a purchased domain.
- **Switching email providers** (e.g. Brevo, MailerSend) — Larger refactor; Resend stays in place since the wiring is already validated end-to-end.
- **Full brand palette / typography refresh** — Scope is intentionally tight (one accent color); a broader visual overhaul is a separate milestone.
- **Multi-color theme variants** (e.g. user-selectable accents) — Out of scope for portfolio bar.
- **Logo design work** — User has an asset to provide; no design effort needed in this milestone.
- **Production-hardened brand assets** (multiple logo sizes, OG images, social cards) — Single logo + favicon is sufficient for portfolio bar.

---

## Traceability

| REQ-ID | Phase | Plan | Verification |
|--------|-------|------|--------------|
| BRAND-01 | Phase 8 — Brand Polish | 08-04 | 08-VERIFICATION (passed) |
| BRAND-02 | Phase 8 — Brand Polish | 08-02 | 08-VERIFICATION (passed) |
| BRAND-03 | Phase 8 — Brand Polish | 08-03 | 08-VERIFICATION (passed) |
| BRAND-04 | Phase 8 — Brand Polish | 08-01 | 08-VERIFICATION (passed) |
| BRAND-05 | Phase 8 — Brand Polish | 08-06 + quick/260503-ime | 08-HUMAN-UAT (24/24 passed) |
| EMAIL-01 | Phase 9 — Resend Env Config | 09-02 | 09-VERIFICATION (passed) |
| EMAIL-02 | Phase 9 — Resend Env Config | 09-02 + 09-03 | 09-VERIFICATION (passed) |
| EMAIL-03 | Phase 9 — Resend Env Config | 09-02 + 09-03 | 09-VERIFICATION (passed) |
| EMAIL-04 | Phase 9 — Resend Env Config | 09-01 + 09-03 | 09-VERIFICATION (passed) |
| EMAIL-05 | Phase 9 — Resend Env Config | 09-04 | 09-VERIFICATION (passed) |

**Coverage:** 10/10 v1.1 requirements complete ✓ (all validated)
