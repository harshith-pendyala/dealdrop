---
type: quick
quick_id: 260504-pap
slug: dealdrop-logo-black-background-in-dark-m
phase: quick-260504-pap
plan: 01
wave: 1
depends_on: []
autonomous: true
requirements: [QUICK-260504-PAP]
files_modified:
  - dealdrop/src/components/header/Header.tsx
  - dealdrop/src/components/header/Header.test.tsx
must_haves:
  truths:
    - "In light mode, the header logo displays with its original (white) background — visually unchanged from current behavior."
    - "In dark mode (OS prefers-color-scheme: dark OR .dark class), the header logo's white background reads as black, blending into the dark page background."
    - "The orange accent in the logo wordmark stays orange in both light and dark modes (no hue shift)."
    - "All 5 existing Header.test.tsx assertions still pass (src, alt, width, height, link href)."
    - "A new test asserts the logo <img> carries `dark:invert` and `dark:hue-rotate-180` className tokens so the dark-mode behavior is regression-locked."
  artifacts:
    - path: "dealdrop/src/components/header/Header.tsx"
      provides: "Header server component with logo using dark-mode-aware className"
      contains: "dark:invert"
    - path: "dealdrop/src/components/header/Header.test.tsx"
      provides: "Header tests including new dark-mode className assertion"
      contains: "dark:hue-rotate-180"
  key_links:
    - from: "dealdrop/src/components/header/Header.tsx"
      to: "dealdrop/app/globals.css"
      via: "Tailwind `dark:` utility resolved by @custom-variant dark (honors prefers-color-scheme + .dark class)"
      pattern: "dark:invert.*dark:hue-rotate-180"
---

<objective>
Make the DealDrop wordmark logo in the site header render with a black background in dark mode while preserving the orange accent — without swapping the asset, adding a new component, or refactoring.

Purpose: Today the logo PNG (`dealdrop/public/deal-drop-logo.png`) has a white background baked into 8-bit RGB pixels (no alpha). In OS dark mode the page is near-black but the logo remains a stark white slab — a visible brand defect noted by the user.

Output: A one-token className change on the `<Image>` element in `Header.tsx` plus a regression test in `Header.test.tsx`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md
@dealdrop/CLAUDE.md
@dealdrop/AGENTS.md
@dealdrop/src/components/header/Header.tsx
@dealdrop/src/components/header/Header.test.tsx
@dealdrop/app/globals.css
@.planning/quick/260503-ime-fix-dark-variant-in-globals-css-to-honor/SUMMARY.md

<orchestrator_findings>
Pre-planning investigation (do not re-do):

1. **Asset constraints:** `dealdrop/public/deal-drop-logo.png` is 8-bit RGB, 620×210, with a baked-in white background (no alpha). A `dark:bg-black` wrapper is therefore invisible — the PNG covers it.

2. **Single render site:** `dealdrop/src/components/header/Header.tsx:16-22` is the only place the logo is rendered:
   ```tsx
   <Image
     src="/deal-drop-logo.png"
     alt="DealDrop"
     width={95}
     height={32}
     priority
   />
   ```

3. **Existing test invariants:** `dealdrop/src/components/header/Header.test.tsx` asserts only `src`, `alt`, `width`, `height` on the img and `href`/`aria-label` on the link. No styling assertions exist, so a className change cannot break them.

4. **Dark mode plumbing is wired:** `dealdrop/app/globals.css:4` declares `@custom-variant dark (&:where(.dark, .dark *), @media (prefers-color-scheme: dark));` — fixed in quick task `260503-ime`. So `dark:` Tailwind utilities WILL fire under OS dark mode today. No CSS plumbing change needed.

5. **Filter idiom rationale:** `dark:invert dark:hue-rotate-180` is the standard CSS-only inversion that keeps colored brand marks intact:
   - `invert(1)` flips lightness → white background becomes black, dark grey "dealdrop" text becomes light grey/white (now readable on black). Side effect: orange → blue.
   - `hue-rotate(180deg)` then rotates the color wheel back → blue → orange. Net effect on orange: unchanged. Net effect on grayscale (white/black/grey): unchanged (greyscale has no hue).
   - Combined effect: white→black, dark text→light text, orange→orange. Exactly what we want.

6. **Light mode is already correct:** Page background is `oklch(1 0 0)` (white) via `--background` in `globals.css:7`. White logo PNG on white page = no visible seam. No light-mode utility needed.
</orchestrator_findings>

<interfaces>
Header.tsx Image element receives `className` prop pass-through to the rendered `<img>` (verified in Header.test.tsx mock at line 9-12: `default: (props) => <img src={props.src} alt={props.alt} width={props.width} height={props.height} />`).

**Mock gap to fix in this plan:** The current next/image stub does NOT forward `className`. The test will need to either (a) extend the stub to forward className, or (b) extend the Header.tsx Image with className AND extend the stub in the same edit. Choose path (b) — the className must reach the rendered DOM for the assertion to be meaningful.

The next/link stub at line 15-26 already forwards className correctly.
</interfaces>

</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add dark-mode logo filter className + regression test</name>
  <files>dealdrop/src/components/header/Header.tsx, dealdrop/src/components/header/Header.test.tsx</files>
  <behavior>
    - Existing test: logo `<img>` still has `src='/deal-drop-logo.png'`, `alt='DealDrop'`, `width='95'`, `height='32'` (preserved verbatim).
    - Existing test: link still has `href='/'` and `aria-label='DealDrop home'` (preserved verbatim).
    - Existing test: SignInButton renders when user is null; SignOutButton renders when user is present (preserved verbatim).
    - NEW test (BRAND-DARK-LOGO regression): logo `<img>` className contains both substrings `dark:invert` AND `dark:hue-rotate-180`. Use `expect(logo.className).toContain('dark:invert')` and `expect(logo.className).toContain('dark:hue-rotate-180')`.
    - All 5 existing assertions plus the 1 new assertion (6 total in this file) pass under `cd dealdrop && npm test -- src/components/header/Header.test.tsx`.
  </behavior>
  <action>
    Make TWO coordinated edits in a single task (they MUST land together — neither half is meaningful alone):

    **Edit 1 — `dealdrop/src/components/header/Header.tsx`:**
    Add `className="dark:invert dark:hue-rotate-180"` to the `<Image>` element at lines 16-22. The element becomes:
    ```tsx
    <Image
      src="/deal-drop-logo.png"
      alt="DealDrop"
      width={95}
      height={32}
      priority
      className="dark:invert dark:hue-rotate-180"
    />
    ```
    Do NOT change anything else — not the wrapping `<Link>`, not the `<header>` background, not the layout, not the import order. This is a one-attribute addition.

    **Edit 2 — `dealdrop/src/components/header/Header.test.tsx`:**
    Two sub-edits:
    (a) Extend the next/image vi.mock at lines 8-12 to forward `className`. Updated stub:
    ```tsx
    vi.mock('next/image', () => ({
      default: (props: { src: string; alt: string; width?: number; height?: number; className?: string }) => (
        <img
          src={props.src}
          alt={props.alt}
          width={props.width}
          height={props.height}
          className={props.className}
        />
      ),
    }))
    ```
    (b) Add a new `it(...)` test inside the existing `describe('Header (BRAND-02)', ...)` block (after the existing 5 tests, before the closing `})` at line 74). New test:
    ```tsx
    it('logo has dark-mode invert+hue-rotate filter so white bg reads as black in dark mode (quick-260504-pap)', () => {
      render(<Header user={null} />)
      const logo = screen.getByRole('img', { name: 'DealDrop' })
      expect(logo.className).toContain('dark:invert')
      expect(logo.className).toContain('dark:hue-rotate-180')
    })
    ```

    **Why this idiom (don't substitute):** `dark:invert dark:hue-rotate-180` is the CSS-only filter combo that flips white→black for the logo background while preserving the orange wordmark accent. `invert` alone would turn the orange to blue; `hue-rotate-180` rotates it back. Do NOT use `dark:bg-black` (invisible — PNG has no alpha). Do NOT swap the asset. Do NOT add a separate dark-mode PNG. Do NOT introduce a client component or theme hook — this is a pure-CSS solution that works with the existing server-rendered Header and the `@custom-variant dark` plumbing already in `globals.css:4`.

    **Read first (mandatory):** Per `dealdrop/AGENTS.md`, this is "NOT the Next.js you know" — but the only Next.js APIs touched here are `next/image` className pass-through (stable since v10) and `next/link` (already in use). No new Next.js surface. Skip the docs read for this trivial change UNLESS the className addition triggers an unexpected `next build` warning, in which case consult `dealdrop/node_modules/next/dist/docs/01-app/` for `next/image` className guidance.
  </action>
  <verify>
    <automated>cd dealdrop && npm test -- src/components/header/Header.test.tsx</automated>
  </verify>
  <done>
    - `dealdrop/src/components/header/Header.tsx` `<Image>` element has `className="dark:invert dark:hue-rotate-180"`.
    - `dealdrop/src/components/header/Header.test.tsx` next/image mock forwards `className` to the rendered `<img>`.
    - `dealdrop/src/components/header/Header.test.tsx` contains a new test asserting both `dark:invert` and `dark:hue-rotate-180` are present in the logo className.
    - `npm test -- src/components/header/Header.test.tsx` reports 6/6 passing for this file.
    - Full suite green: `cd dealdrop && npm test` reports no new failures vs baseline (177+ tests, all passing).
    - No other files modified.
  </done>
</task>

</tasks>

<verification>
**Automated (executor must run before declaring done):**
1. `cd dealdrop && npm test -- src/components/header/Header.test.tsx` — 6/6 passing.
2. `cd dealdrop && npm test` — full suite still green (177+ tests, no regressions).
3. `cd dealdrop && npm run lint` — no new lint errors.

**Visual sanity check (operator may do post-merge, not blocking):**
- Open the dev server (`cd dealdrop && npm run dev`), visit `http://localhost:3000` in light mode → logo background reads white, blends with page (unchanged).
- Toggle OS to dark mode → logo background reads black, blends with page background; "dealdrop" wordmark text becomes readable; orange accent stays orange.
</verification>

<success_criteria>
- The logo's white background no longer creates a visible white slab against the dark-mode page background.
- The orange accent in the logo is preserved (not flipped to blue or any other hue) in both modes.
- Light mode appearance is unchanged from current behavior.
- Header.test.tsx grew by exactly 1 new `it(...)` block; the next/image mock stub gained a `className` pass-through; no other test changes.
- No new files created. No new dependencies. No new components.
</success_criteria>

<output>
After completion, create `.planning/quick/260504-pap-dealdrop-logo-black-background-in-dark-m/SUMMARY.md` describing:
- The two-line className addition + mock-stub extension + new test
- Why `dark:invert dark:hue-rotate-180` was chosen (and why simpler alternatives like `dark:bg-black` or asset swap were rejected)
- Test results (X/Y passing for Header.test.tsx, full suite count)
- Link to this plan and to the prior dark-variant fix (`260503-ime`) that made `dark:` utilities work in OS dark mode
</output>
