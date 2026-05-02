# Phase 8: Brand Polish - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Apply DealDrop brand identity across the shipped v1.0 UI. Specifically: drop in the user-provided PNG logo as a clickable header element (replacing the "DealDrop" wordmark text), refresh the favicon to match the new brand mark, redefine the accent color from neutral zinc to the DealDrop orange family across primary buttons / prices / chart line / icons, apply a subtle orange-50 wash to the logged-out hero, remove the "Made with love" line from the hero, and rename the primary CTA from "Add Product" to "Track Price".

**In scope:**
- BRAND-01: Delete the "Made with love" line at `dealdrop/src/components/hero/Hero.tsx:32` (the line lives inside Hero, not a separate Footer component).
- BRAND-02: Drop a user-provided PNG logo into `dealdrop/public/` and render it in `dealdrop/src/components/header/Header.tsx` at 32px tall, replacing the "DealDrop" text node, wrapped in `<Link href="/">` for a click-home affordance.
- BRAND-03: Refresh the favicon to match the new logo (planner's discretion on path: static asset that replaces `app/icon.tsx`, vs keeping `app/icon.tsx` ImageResponse with the new orange-themed glyph).
- BRAND-04: Apply the DealDrop orange family across primary buttons (orange-500 / orange-600 hover), product prices on the dashboard (orange-500), the PriceChart line stroke (auto-via `var(--primary)`), the FeatureCard Lucide icons (auto-via `text-primary`), and a subtle orange-50 gradient on the logged-out Hero section. Implementation: redefine `--primary` and `--primary-foreground` in `dealdrop/app/globals.css` so the cascade auto-applies to existing Shadcn `<Button>` variants and chart/icon code that already reads `var(--primary)`.
- BRAND-05: Verify the new accent renders legibly in both light and dark mode at default / hover / focus states with no contrast regression vs v1.0. Verification = manual visual walk + spot-check WCAG, matching Phase 7's portfolio-bar style.
- Copy change: rename the "Add Product" CTA to "Track Price" across `AddProductForm`, `AddProductDialog`, and any related toast text. Update affected component tests.

**Not in scope for this phase:**
- Phase 9 (Resend Env Config) — EMAIL-01..EMAIL-05. Phase 8 must NOT touch `sendPriceDropAlert`, `env.server.ts`, or the price-drop email HTML template. Brand styling of the email is explicitly v1.2+.
- Custom domain / DNS / Vercel custom domain / Resend domain verification — `PROJECT.md` defers to v1.2 (Custom Domain + Real Email).
- Full palette / typography refresh beyond the single orange accent — deferred to v1.3+ per `REQUIREMENTS.md` Future Requirements.
- Multi-color theme variants (user-selectable accents) — out of scope per `REQUIREMENTS.md`.
- Animated / interactive logo variants — deferred to v1.3+.
- OG images / social cards / multi-size brand asset kit / apple-touch-icon manifest — deferred per Phase 7 D-07 + REQUIREMENTS.md.
- Logo design work — user provides the asset; no design effort.
- Dark mode toggle UI — Phase 8 continues to honor `@media (prefers-color-scheme: dark)`; an explicit toggle is a separate decimal phase if requested.
- Sticky header / nav / profile menu / account settings page — listed in Phase 2 deferred ideas, still deferred.
- POL-* re-implementation — Phase 7 closed all of POL-01..POL-06; Phase 8 only restyles the surfaces Phase 7 already shipped.

</domain>

<decisions>
## Implementation Decisions

### Logo asset & header treatment

- **D-01:** Logo asset is **PNG, dropped into `dealdrop/public/`** (user provides). Planner picks exact filename (suggest `dealdrop-logo.png` for clarity over a generic `logo.png`). If the asset has a transparent background and the user can also provide an `@2x` version, the planner should commit both for retina; if only a single file is provided, render it via `next/image` with explicit `width` / `height` so Next.js handles density.

- **D-02:** Logo **replaces the "DealDrop" text node** in `dealdrop/src/components/header/Header.tsx:13` entirely. There is no logo-plus-wordmark side-by-side variant in v1.1 — the asset is assumed to carry its own wordmark. If after dropping in the user's PNG it reads as a symbol-only mark and the wordmark is lost, the planner should flag this as a deviation rather than improvise side-by-side composition.

- **D-03:** Logo renders at **32px tall** inside the existing 56px header (`h-14`). Header height stays unchanged. Width is intrinsic (preserve aspect ratio of the user's PNG). Use `next/image` with `height={32}` and `width={auto-derived}` based on the asset's intrinsic ratio, or hardcode the width once the planner has the asset on disk. Vertical centering via the existing `flex items-center` on the header row.

- **D-04:** Logo is wrapped in **`<Link href="/">`** so clicking it navigates home. `aria-label="DealDrop home"` on the Link (accessibility — the image alt would otherwise be the only label, and screen readers benefit from an explicit nav purpose). DealDrop is currently a single-route app, but the click-home affordance is a free convention to ship.

### Accent color & token strategy

- **D-05: Brand palette = stock Tailwind orange.** No custom oklch tuning. The planner translates Tailwind v4's orange tokens to oklch values written into `globals.css`:
  - **`orange-500`** — primary buttons (Sign In, Track Price), product prices on dashboard product cards, PriceChart line stroke (via existing `var(--primary)`), FeatureCard Lucide icon tint (via existing `text-primary`).
  - **`orange-600`** — hover state on all interactive primary surfaces (buttons, links).
  - **`orange-700`** — small-text accents. Specific surfaces: **Claude's discretion** (planner picks among FeatureCard blurbs, Hero subheadline, feature card titles, or a combination). The "Made with love" line — originally cited in the user's spec for orange-700 — is being deleted per BRAND-01, so this color migrates to other small-text surfaces.
  - **`orange-50`** — subtle background gradient on the logged-out Hero section only.

- **D-06: Redefine `--primary` (single-token cascade).** Edit `:root` and the `@media (prefers-color-scheme: dark)` block in `dealdrop/app/globals.css` to set `--primary` to the orange-500 oklch and `--primary-foreground` to a high-contrast text-on-orange (planner picks; likely zinc-50 / oklch(0.985 0 0)). The Shadcn `<Button>` variants, the PriceChart line, and the FeatureCard `text-primary` icons all already read `var(--primary)` and auto-pick up the new accent — zero per-component class churn for the cascade. Do NOT introduce a new `--brand` token; the existing `--accent` token (Shadcn's neutral hover color) stays untouched to avoid collision.

- **D-07: Per-mode contrast tuning.** Use slightly different oklch values in the dark-mode block than in `:root`. Mirrors the existing per-mode pattern Shadcn ships in `globals.css` for `--primary`. Light: orange-500 oklch. Dark: lifted L (e.g., orange-400 or 500 with slightly elevated lightness) so the accent stays legible on near-black backgrounds. Hover (`orange-600`) and small-text (`orange-700`) similarly need per-mode tuning checked during the visual walk.

- **D-08: Verify BRAND-05 via manual visual walk + spot-check WCAG.** Walk the running app (logged-out hero, sign-in modal, dashboard empty state, dashboard with products, PriceChart toggle) at desktop and 375px in both light and dark mode. Check default / hover / focus on every primary CTA. Confirm orange-on-background passes AA at minimum. No Storybook, no snapshot harness — matches Phase 7 D-05 fix-as-found portfolio-bar style. Document the audit findings in `08-VERIFICATION.md` as "viewport / mode / surface / pass-or-fix-shipped" rows, modeled on Phase 7's POL-04 audit table.

### Hero subtle background gradient

- **D-09: orange-50 gradient on Hero section ONLY.** Apply a subtle orange-50 wash to the logged-out Hero (`dealdrop/src/components/hero/Hero.tsx`) — implementation (top→bottom linear-gradient vs radial vs corner-anchored) is **Claude's discretion**. The dashboard / authed view keeps its clean `bg-background`. No body-level / site-wide gradient. Use a Tailwind utility (e.g., `bg-gradient-to-b from-orange-50 via-background to-background`) or a CSS custom property if a more nuanced curve is desired. Implementation must not regress contrast of the Hero's heading or paragraph text.

### Footer cleanup (BRAND-01)

- **D-10:** **Delete `dealdrop/src/components/hero/Hero.tsx:31-33`** (the `<p className="mt-16 text-xs text-muted-foreground">Made with love</p>` block). No replacement footer copy. The orange-700 small-text accent originally tied to this line in the user's spec migrates to other small-text surfaces (Claude's Discretion §"orange-700 surface choice" — see D-05). This is a logged-out-only line; the dashboard does not have a footer to clean.

### CTA copy rename

- **D-11: Rename "Add Product" → "Track Price"** across the primary tracking CTA. Affected surfaces (planner audits and updates):
  - `dealdrop/src/components/dashboard/AddProductForm.tsx` — submit button label and any internal copy that says "Add Product".
  - `dealdrop/src/components/dashboard/AddProductDialog.tsx` — trigger button + dialog title (if it reads "Add Product").
  - `dealdrop/src/components/dashboard/InlineAddProductWrapper.tsx` — if it surfaces a label.
  - `dealdrop/src/components/dashboard/EmptyState.tsx` — if the CTA is rendered there.
  - Toast text on add-success (Sonner) — likely "Tracking [name]" or "Now tracking" rather than "Added" (planner picks copy; keep portfolio-clean).
  - Affected component tests — `AddProductForm.test.tsx`, `EmptyState.test.tsx`, `InlineAddProductWrapper.test.tsx` will have text assertions referencing "Add Product" that need updating to "Track Price". The planner re-runs Vitest after the rename and updates assertions one-by-one. The component file names stay (`AddProductForm`, `AddProductDialog`) — only user-visible copy changes; renaming the components themselves is out of scope and not worth the diff churn.
  - **Do NOT** rename SQL columns (`products` table), API route paths (`/api/cron/check-prices`), or any backend identifier. The rename is a pure user-facing copy change.

### Favicon refresh (BRAND-03)

- **D-12: Favicon path is Claude's discretion.** Two viable approaches; planner picks based on the shape of the user's PNG asset:
  - **(a) Static asset.** Drop `dealdrop/public/favicon.png` (or `dealdrop/app/icon.png` per Next.js 16 convention) and **delete `dealdrop/app/icon.tsx`**. Simplest if the user's PNG is already brand-consistent and renders well at 32×32. Lowest code surface.
  - **(b) Keep `app/icon.tsx` ImageResponse**, replace the stylized "D" with a glyph that uses the new orange palette. Useful if the user's logo PNG is a wordmark that doesn't reduce well to 32×32 — a separate ImageResponse glyph keeps the favicon legible at tab-icon size while the header carries the full wordmark.
  - Whichever path the planner picks, **respect Phase 7 D-07's "delete the Next.js scaffold `favicon.ico`" decision** if it ever resurfaces (Phase 7 already removed it; just don't reintroduce a stale binary).

### Claude's Discretion

The user explicitly did not deep-dive these areas. Planner uses these defaults; flag as deviation if any materially changes the plan.

- **Exact orange oklch values.** Planner converts Tailwind's published orange-50 / orange-500 / orange-600 / orange-700 to oklch (Tailwind v4 uses oklch internally) and writes to `globals.css`. Reference: Tailwind v4 default theme.
- **`--primary-foreground` choice.** Planner picks high-contrast text color for orange-500 background (likely `oklch(0.985 0 0)` / zinc-50). Verify AA contrast on the actual button.
- **orange-700 small-text surface.** Planner picks one or two surfaces among: FeatureCard blurbs (`dealdrop/src/components/hero/FeatureCard.tsx`), Hero subheadline (`Hero.tsx:10`), feature card titles. Goal is "small-text accents that benefit from a hint of brand color"; avoid using orange-700 on body copy that would regress legibility.
- **Hero gradient direction.** top→bottom linear (`bg-gradient-to-b from-orange-50 via-background to-background`) is the safest default. Alternative: corner-anchored radial gradient that fades from orange-50 in one corner to background. Planner picks; no strong preference.
- **Dark-mode hue lift for orange.** Planner picks the dark-mode oklch L for `--primary` to maintain AA on near-black background. Stock Tailwind ships dark-mode-tuned values in its palette generator if helpful.
- **Logo rendering technique.** `next/image` with explicit `width`/`height` is the default; falling back to a plain `<img>` is acceptable if `next/image` overhead isn't worth it for a single header asset. If the asset turns out to be SVG-source even though delivered as PNG, the planner can substitute SVG without re-asking.
- **Logo `alt` text.** "DealDrop" is the obvious choice if the logo is a pure logomark; "DealDrop logo" if it's a symbol-only mark. Planner picks.
- **Tests for the rename.** Planner runs `npm run test` (Vitest) after the "Add Product" → "Track Price" rename and updates test assertions one-at-a-time, committing each test file's update with the rename in the same plan / commit.

### Folded Todos

None — `gsd-tools todo match-phase 8` not applicable to brand polish at portfolio bar (no pending todos surfaced for this phase).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope & Requirements
- `.planning/REQUIREMENTS.md` — BRAND-01 through BRAND-05 acceptance criteria + v1.1 Out of Scope list (custom domain, full palette refresh, animated logo, multi-color variants are explicitly excluded).
- `.planning/ROADMAP.md` §"Phase 8: Brand Polish" — goal + 5 success criteria + UI hint=yes.
- `.planning/PROJECT.md` — "Bar: Portfolio/demo quality" constraint + the "Current Milestone: v1.1" section that locks logo asset (user-provided), no domain purchase, single accent color via Tailwind theme token.

### Prior Phase Context (locked decisions Phase 8 inherits)
- `.planning/phases/02-authentication-landing/02-CONTEXT.md` — Sign In modal trigger pattern (`useAuthModal()` hook); Phase 8 only restyles the SignInButton, does not change auth flow.
- `.planning/phases/04-product-tracking-dashboard/04-CONTEXT.md` — `useOptimistic` slot in `ProductGrid` and `SkeletonCard`; Phase 8 must not regress optimistic UI when restyling.
- `.planning/phases/05-price-history-chart/05-CONTEXT.md` — PriceChart line color is `var(--primary)`; the redefinition of `--primary` automatically restyles the chart line. No PriceChart code edits needed for BRAND-04.
- `.planning/phases/07-polish-deployment/07-CONTEXT.md` §D-07 — "Generated `app/icon.tsx` ImageResponse" + "Delete `app/favicon.ico`" decisions. Phase 8 D-12 may keep, replace, or retire `app/icon.tsx`; the `favicon.ico` is already deleted and must NOT be reintroduced.
- `.planning/phases/07-polish-deployment/07-CONTEXT.md` §D-05 — Phase 7's fix-as-found mobile audit pattern; Phase 8 D-08 reuses this style for the BRAND-05 contrast/visual walk.

### Existing Code Contracts (preserve verbatim unless decision says otherwise)
- `dealdrop/src/components/header/Header.tsx:9-18` — current header shape (`h-14`, max-w-6xl, flex layout). D-02 + D-03 + D-04 modify the inner content (replace text with logo, wrap in Link); the header height and outer layout stay.
- `dealdrop/src/components/hero/Hero.tsx:31-33` — "Made with love" line; D-10 deletes this block and the `mt-16` spacing it provided. Planner verifies the Hero still spaces correctly after deletion (FeatureCard grid above should not lose its bottom rhythm).
- `dealdrop/src/components/hero/Hero.tsx` (whole component) — D-09 adds the orange-50 gradient to the section's `className`.
- `dealdrop/src/components/hero/FeatureCard.tsx:13` — Lucide icon already uses `text-primary`; auto-restyles via D-06 cascade. Verify the orange-on-card-background passes contrast (D-08).
- `dealdrop/src/components/dashboard/PriceChart.tsx:117-120` — `<Line stroke="var(--primary)" />`, `dot` and `activeDot` `fill: 'var(--primary)'`. Auto-restyles via D-06.
- `dealdrop/src/components/dashboard/ProductCard.tsx` — product price renderings; D-05 specifies orange-500 on prices. Planner audits the price `<span>` / `<p>` and applies a `text-primary` class (auto-orange via cascade) or a direct `text-orange-500` Tailwind utility.
- `dealdrop/src/components/dashboard/AddProductForm.tsx`, `AddProductDialog.tsx`, `InlineAddProductWrapper.tsx`, `EmptyState.tsx` — D-11 rename targets ("Add Product" → "Track Price"). Planner audits all string literals.
- `dealdrop/src/components/dashboard/{AddProductForm,EmptyState,InlineAddProductWrapper}.test.tsx` — text assertions need "Add Product" → "Track Price" updates per D-11.
- `dealdrop/app/globals.css` lines 6-39 (`:root`) and 81-114 (`@media (prefers-color-scheme: dark)`) — D-06 + D-07 edit `--primary` and `--primary-foreground` in both blocks. Do NOT touch `--accent` (Shadcn neutral hover color, naming-collision avoidance).
- `dealdrop/app/icon.tsx` — D-12 may keep (replace glyph) or delete (in favor of `app/icon.png`). Phase 7 D-07 created this file; Phase 8 may supersede.
- `dealdrop/components/ui/button.tsx` — Shadcn Button variants read `bg-primary` / `hover:bg-primary/90` for the default variant; auto-restyles via D-06 cascade. Do NOT modify the Button source.
- `dealdrop/AGENTS.md` / `dealdrop/CLAUDE.md` — "This is NOT the Next.js you know" instruction. Planner reads `node_modules/next/dist/docs/` for `next/image`, `app/icon` conventions, and any Tailwind v4 `@theme inline` semantics that changed between v3 and v4.

### External Docs (planner should fetch during planning)
- **Next.js 16 docs** — `next/image` for the header logo, `app/icon` (static + ImageResponse) conventions for BRAND-03, `<Link>` for the click-home logo wrapper.
- **Tailwind v4 docs** — `@theme inline` block semantics, oklch values for stock orange-50/500/600/700, `bg-gradient-to-b` utility, dark-mode strategy via `prefers-color-scheme`.
- **Shadcn UI Button** — variant token contract (`bg-primary`, `text-primary-foreground`), confirms the cascade strategy in D-06 covers all variants without per-component change.
- **Recharts `<Line>` stroke prop** — confirms `stroke="var(--primary)"` re-renders correctly when the CSS custom property updates (Phase 5 already verified, but worth re-checking after the redefinition).
- **WCAG 2.1 AA contrast** — for D-08 spot-check on orange-500 / orange-600 / orange-700 against the `--background` and `--card` values in light + dark mode.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`dealdrop/components/ui/button.tsx`** — Shadcn Button variants already token-bound to `--primary` / `--primary-foreground`. The accent restyle via D-06 cascade requires zero edits to this file.
- **`var(--primary)` consumers in source** — `PriceChart.tsx:117,119,120` (line + dot + activeDot), `FeatureCard.tsx:13` (`text-primary` icon tint). All three auto-pick up the new orange via D-06; no per-component changes needed.
- **`@/lib/utils` `cn()` helper** — used across the codebase for conditional classes; planner uses it for any `bg-orange-50/...` gradient utility composition on the Hero.
- **`next/image`** — already imported and used elsewhere (planner can grep `from 'next/image'` to confirm prior usage); appropriate component for the header logo.
- **Lucide icons (`lucide-react`)** — already installed; the FeatureCard icons (`Globe`, `BellRing`, `LineChart`) are existing and need no replacement, only the cascade-via-`text-primary` re-tint.
- **`app/icon.tsx`** (Phase 7) — already a Next.js dynamic icon convention site. D-12 either edits it (new orange glyph via ImageResponse) or deletes it (in favor of `app/icon.png`).
- **Phase 7's `07-VERIFICATION.md` audit table format** — D-08 reuses this row shape (viewport / observed / fix shipped) for BRAND-05 contrast walk.

### Established Patterns
- **Single-token theming via Shadcn CSS custom properties** — every brand-relevant color is a `--*` variable in `globals.css`, exposed to Tailwind via `@theme inline`. Phase 8 stays inside this pattern; do NOT introduce ad-hoc Tailwind `bg-orange-500` utilities on Shadcn components when the cascade can do the same job via `--primary`.
- **`Readonly<>` props + functional components** — applies to any new wrapper component (e.g., a `<HeaderLogo />` extraction if the planner chooses; not required).
- **Tailwind utility-first**, no CSS modules, no `style={{}}` for theme-coupled values.
- **No emojis in source files** — established across phases; do not introduce emoji glyphs in `app/icon.tsx`, alt text, or copy.
- **`@/*` path alias** for internal imports (e.g., `@/components/ui/button`).
- **`'use client'` only when required** — Header is a server-rendered child of `app/page.tsx`; do NOT add `'use client'` when introducing the logo.
- **Tests live alongside components** with `.test.tsx` suffix; assertion updates ship in the same commit as the component copy change (D-11).

### Integration Points
- **Modify: `dealdrop/src/components/header/Header.tsx`** — replace text with `<Link href="/"><Image .../></Link>` block (D-02, D-03, D-04). Header outer shell unchanged.
- **Modify: `dealdrop/src/components/hero/Hero.tsx`** — delete the "Made with love" `<p>` block (D-10) and apply the orange-50 gradient to the section className (D-09).
- **Modify: `dealdrop/app/globals.css`** — `:root` and `@media (prefers-color-scheme: dark)` blocks: redefine `--primary` and `--primary-foreground` to oklch values matching Tailwind orange-500 (light) / orange-400 or tuned-500 (dark). NO new tokens (D-06).
- **Modify: `dealdrop/src/components/dashboard/AddProductForm.tsx`, `AddProductDialog.tsx`, `InlineAddProductWrapper.tsx`, `EmptyState.tsx`** — copy rename "Add Product" → "Track Price" (D-11).
- **Modify: `dealdrop/src/components/dashboard/AddProductForm.test.tsx`, `EmptyState.test.tsx`, `InlineAddProductWrapper.test.tsx`** — assertion updates for the rename (D-11).
- **Modify: `dealdrop/src/components/dashboard/ProductCard.tsx`** — apply orange-500 (via `text-primary`) to the price rendering (D-05). Verify currency adjacency is not lost.
- **New: `dealdrop/public/dealdrop-logo.png`** (or whichever filename the planner picks) — user-provided PNG asset committed to the repo.
- **Modify or Delete: `dealdrop/app/icon.tsx`** — D-12 path A (delete + add `app/icon.png`) or path B (keep + replace glyph).
- **New (path A only): `dealdrop/app/icon.png`** — static icon if D-12 path A is chosen.
- **No modify: `dealdrop/components/ui/button.tsx`, `dealdrop/components/ui/card.tsx`, `dealdrop/src/components/dashboard/PriceChart.tsx`, `dealdrop/src/components/hero/FeatureCard.tsx`** — all auto-restyle via D-06 cascade.
- **No modify: `dealdrop/app/layout.tsx`, `dealdrop/proxy.ts`, `dealdrop/src/lib/env.server.ts`, `dealdrop/src/actions/*`, `dealdrop/app/api/cron/check-prices/route.ts`** — Phase 8 stays out of routing, env, server actions, and the cron path. Brand polish only.
- **Out of repo: nothing.** Unlike Phase 7, no Vercel / Supabase / OAuth / DNS work in Phase 8. All changes are source-tree edits.

</code_context>

<specifics>
## Specific Ideas

- **DealDrop's brand spec is opinionated and orange.** orange-500 main / orange-600 hover / orange-700 small-text-accent / orange-50 gradient. Drawn from the user's own spec — capture this verbatim because the planner will translate it to oklch and any drift would re-litigate the brand decision.
- **The cascade strategy is load-bearing for low-churn delivery (D-06).** Redefining `--primary` once propagates orange to Shadcn buttons, the chart line, and the FeatureCard icons in a single edit. If a planner ever proposes adding `bg-orange-500` utilities directly to Shadcn buttons, that's a planning bug — the token is the source of truth.
- **The "Add Product" → "Track Price" rename is product-copy work, not pure brand polish (D-11).** It expands Phase 8 scope beyond what BRAND-01..BRAND-05 strictly require, but the user explicitly asked for it during discuss-phase. Capture the breadth (form, dialog, empty state, toasts, AND tests) so the planner doesn't half-rename and ship a regression where the dialog title still says "Add Product" while the button says "Track Price".
- **The orange-700 small-text accent surface is genuinely Claude's discretion (D-05).** The user's original spec referenced "Made with love" but BRAND-01 deletes that line. The planner should pick one or two small-text surfaces (FeatureCard blurbs is the safest first pick) without re-asking.
- **The user has a PNG, not an SVG (D-01).** No SVG-as-currentColor trick to apply orange via Tailwind classes. Logo color is whatever ships in the asset; the orange palette restyles its surroundings (header background stays neutral, gradient is on Hero only).
- **BRAND-05 verification is portfolio-bar (D-08).** No Storybook, no snapshot tests. A documented walk in `08-VERIFICATION.md` is the deliverable. Mirror Phase 7 D-05's POL-04 audit table format so verification reads consistently across the repo.
- **The `--accent` token in Shadcn theme is NOT the BRAND-04 accent.** Shadcn's `--accent` is a near-neutral hover background. Phase 8 leaves `--accent` untouched and uses `--primary` as the brand surface (D-06). Naming overlap is intentional in Shadcn; do not let it tempt anyone into editing `--accent`.
- **Hero gradient must not regress text legibility (D-09).** orange-50 is intentionally subtle, but planner should verify the Hero `<h1>` and `<p>` still pass contrast on the warmest part of the gradient. If contrast regresses, narrow the gradient stops or reduce opacity.

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
None — no pending todos surfaced for Phase 8.

### Out of this phase (will be handled elsewhere or explicitly rejected)
- **Phase 9 (EMAIL-01..EMAIL-05) — Resend env-config refactor.** Sequenced after Phase 8 per ROADMAP.md. Phase 8 must not touch `sendPriceDropAlert`, `env.server.ts`, or the price-drop email template.
- **Email template orange brand styling** — applying orange to the price-drop email body (CTA button, header, percentage-drop pill). Out of v1.1 BRAND scope; revisit when a custom domain ships in v1.2 and the email is being touched anyway. Captured for future planning.
- **Custom domain purchase + DNS + Resend domain verification + Vercel custom domain** — locked deferred to v1.2 (Custom Domain + Real Email).
- **Multi-color theme variants / user-selectable accents** — Out of Scope per `REQUIREMENTS.md`.
- **Animated / interactive logo variants** — deferred to v1.3+ per `REQUIREMENTS.md` Future.
- **Full palette / typography refresh beyond the single orange accent** — deferred to v1.3+.
- **OG images / social cards / multi-size brand asset kit / apple-touch-icon manifest** — deferred per Phase 7 D-07 and `REQUIREMENTS.md` Future.
- **Logo design work / SVG authoring** — user provides the asset; no design effort in Phase 8.
- **Storybook or visual snapshot regression harness** — explicitly rejected (D-08); matches Phase 7's portfolio-bar style.
- **Side-by-side logo + wordmark composition in the header** — explicitly rejected (D-02). If the user's PNG turns out to be symbol-only, planner flags as deviation rather than improvising.
- **Renaming the React component files** (`AddProductForm` → `TrackPriceForm`, etc.) — out of scope. D-11 is a copy-only rename; component names stay.
- **Renaming SQL columns, API route paths, server actions** — out of scope. The `products` table, `/api/cron/check-prices`, and `sendPriceDropAlert` keep their identifiers.
- **Dark mode toggle UI / class-based dark mode override** — Phase 8 continues to honor `@media (prefers-color-scheme: dark)`. An explicit toggle is a separate decimal phase if requested.
- **Sticky header / nav menu / profile menu / account settings page** — Phase 2 deferred ideas; still deferred.
- **Browser extension / mobile native apps / payments / social features / FX / per-product alert thresholds / digest emails** — `PROJECT.md` Out of Scope; v2+.

</deferred>

---

*Phase: 08-brand-polish*
*Context gathered: 2026-05-02*
