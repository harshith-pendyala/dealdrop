# Phase 8: Brand Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 08-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-02
**Phase:** 08-brand-polish
**Areas discussed:** Logo asset & header treatment, Accent color & token strategy

---

## Gray Areas Presented (multiSelect)

| Option | Description | Selected |
|--------|-------------|----------|
| Logo asset & header treatment | BRAND-02: format / placement / sizing / link wrapper | ✓ |
| Accent color & token strategy (Recommended) | BRAND-04 + BRAND-05: color value, redefine `--primary` vs new `--brand`, light/dark contrast | ✓ |
| Application surface | BRAND-04: which exact elements pick up the accent | |
| Favicon refresh approach | BRAND-03: static vs ImageResponse vs binary in public/ | |

---

## Logo asset & header treatment

### Q1 — Logo format & location

| Option | Description | Selected |
|--------|-------------|----------|
| SVG in public/ (Recommended) | Crisp at any size, works via next/image, best for wordmark/symbolic | |
| PNG in public/ | Required for rasterized assets; needs explicit width/height for retina | ✓ |
| Inline SVG component | Most theming flexibility via currentColor; requires SVG authored that way | |

**User's choice:** PNG in public/

### Q2 — Header treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Logo only, replace text (Recommended) | Drop "DealDrop" text node entirely; logo carries identity | ✓ |
| Logo + text side-by-side | Symbol mark + wordmark text together | |
| Logo on desktop, symbol on mobile | Responsive variant for narrow viewports | |

**User's choice:** Logo only, replace text

### Q3 — Logo size in 56px header

| Option | Description | Selected |
|--------|-------------|----------|
| 32px tall (Recommended) | Standard icon size with 12px vertical padding | ✓ |
| 24px tall | Compact, better for thin-stroke wordmarks | |
| 40px tall | Bolder presence; 8px vertical padding | |

**User's choice:** 32px tall

### Q4 — Click-to-home affordance

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, link to / (Recommended) | Wrap logo in `<Link href="/">` for standard nav convention | ✓ |
| No, decorative only | Non-interactive logo | |

**User's choice:** Yes, link to /

### Continue check

| Option | Description | Selected |
|--------|-------------|----------|
| Next area (Recommended) | Move to Accent color & token strategy | ✓ |
| More questions on logo | Cover light/dark variants, alt text, fallback | |

**User's choice:** Next area

---

## Accent color & token strategy

### Q1 — Accent color family

| Option | Description | Selected |
|--------|-------------|----------|
| Emerald / green (Recommended) | "Savings, deals, money saved" semantic; positive in both modes | |
| Indigo / blue | Trust, calm, classic SaaS palette | |
| Amber / orange | Energetic, deal-alert vibe | |
| Violet / purple | Modern SaaS feel; less semantic for price tracker | |

**User's choice:** Other (free-text spec)

**User's notes:**
> Main Accents (Buttons and Prices): orange-500 — Sign In, Track Price, product prices on dashboard.
> Hover States: deepens to orange-600 on interactive elements.
> Text Highlights: small text accents use orange-700 (e.g., "Made with love" tag in hero).
> Subtle Backgrounds: landing page has a subtle gradient that begins and ends with orange-50.

### Q2 — Token strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Redefine `--primary` (Recommended) | One-token edit cascades to Shadcn buttons, chart line, FeatureCard icons | ✓ |
| Add new `--brand` token | Selective per-component opt-in; --primary stays zinc | |

**User's choice:** Redefine `--primary` (Recommended)

### Q3 — Light/dark behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Tuned per-mode for contrast (Recommended) | Different oklch L per mode; mirrors Shadcn's existing pattern | ✓ |
| Single oklch for both modes | Simpler config; risk of failing AA on one background | |

**User's choice:** Tuned per-mode for contrast

### Q4 — BRAND-05 verification approach

| Option | Description | Selected |
|--------|-------------|----------|
| Manual visual walk + spot-check WCAG (Recommended) | Walk app at 320/375/desktop in both modes; matches Phase 7 portfolio bar | ✓ |
| Add Storybook / visual snapshot tests | Higher confidence + regression-proof; tooling overkill per Phase 7 | |
| Lock to known-good Tailwind tokens | Inherit Tailwind's published WCAG pairings; trades brand customization | |

**User's choice:** Manual visual walk + spot-check WCAG

### Follow-up Q1 — "Made with love" conflict with BRAND-01

| Option | Description | Selected |
|--------|-------------|----------|
| Remove the line (BRAND-01 wins) (Recommended) | Delete "Made with love" per requirement; orange-700 migrates to other small-text surfaces | ✓ |
| Keep the line, restyle to orange-700 | Contradicts BRAND-01; would need REQUIREMENTS.md edit | |
| Replace with new small footer copy in orange-700 | Drop the phrase but add minimal new footer copy in orange-700 | |

**User's choice:** Remove the line (BRAND-01 wins)

### Follow-up Q2 — "Track Price" button

| Option | Description | Selected |
|--------|-------------|----------|
| Rename "Add Product" → "Track Price" | One copy change across AddProductForm + AddProductDialog + tests | ✓ |
| Keep "Add Product" (Recommended) | Casual phrasing; existing label stays | |
| Other | Different button than I'm thinking of | |

**User's choice:** Rename "Add Product" → "Track Price"

### Follow-up Q3 — Orange-50 gradient surface

| Option | Description | Selected |
|--------|-------------|----------|
| Full landing page (Hero section) only (Recommended) | Logged-out hero gets the gradient; dashboard stays clean | ✓ |
| Whole site (every route, behind everything) | Body background gradient; affects dashboard product cards | |
| Hero card backgrounds only | FeatureCard backgrounds get the orange-50 wash | |

**User's choice:** Full landing page (Hero section) only

### Follow-up Q4 — Orange source

| Option | Description | Selected |
|--------|-------------|----------|
| Stock Tailwind orange-50/500/600/700 (Recommended) | Inherit Tailwind's WCAG pairings; planner translates to oklch | ✓ |
| Custom oklch tuned for DealDrop | Distinctive but planner manually verifies contrast | |

**User's choice:** Stock Tailwind orange-50/500/600/700

---

## Final disposition

| Option | Description | Selected |
|--------|-------------|----------|
| Ready for context (Recommended) | Capture all decisions; remaining loose ends become Claude's Discretion | ✓ |
| Explore favicon refresh approach | Lock static asset vs ImageResponse path | |
| Explore application surface | Pin exact non-button elements that pick up orange | |
| Explore footer / small-text accents | Pin exact orange-700 small-text surfaces | |

**User's choice:** Ready for context

---

## Claude's Discretion (loose ends accepted)

- **Favicon refresh path (BRAND-03)** — static `app/icon.png` vs keep `app/icon.tsx` ImageResponse with new orange glyph.
- **Exact orange oklch values** — planner translates Tailwind orange-50/500/600/700 to oklch in `globals.css`.
- **`--primary-foreground` value** — planner picks high-contrast text-on-orange (likely zinc-50).
- **orange-700 small-text surfaces** — planner picks among FeatureCard blurbs, Hero subheadline, feature card titles.
- **Hero gradient direction** — top→bottom linear vs corner-anchored radial.
- **Dark-mode hue lift for orange** — planner picks dark-mode oklch L for `--primary`.
- **Logo render technique** — `next/image` default; plain `<img>` acceptable.
- **Logo `alt` text** — "DealDrop" or "DealDrop logo".
- **Test assertion updates** — planner re-runs Vitest after rename and updates assertions.

## Deferred Ideas (out of phase scope)

- Phase 9 (Resend env config) — sequenced after Phase 8.
- Email template orange brand styling — revisit in v1.2 when domain ships.
- Custom domain / DNS / Resend domain verification — locked v1.2.
- Multi-color theme variants / user-selectable accents — REQUIREMENTS.md Out of Scope.
- Animated / interactive logo variants — v1.3+.
- Full palette / typography refresh — v1.3+.
- OG images / social cards / multi-size brand kit — v1.3+.
- Storybook / snapshot harness — explicitly rejected (D-08).
- Side-by-side logo + wordmark composition — explicitly rejected (D-02).
- Component file renames (AddProductForm → TrackPriceForm) — out of scope.
- SQL column / API route / server-action renames — out of scope.
- Dark mode toggle UI — separate decimal phase if requested.
- Sticky header / profile menu / account settings — Phase 2 deferred ideas, still deferred.
