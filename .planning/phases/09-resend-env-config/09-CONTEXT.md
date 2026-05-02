# Phase 9: Resend Env Config - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Refactor the existing Phase 6 Resend pipeline so the `from` address and recipient are fully env-configurable. Specifically: introduce an optional `RESEND_TEST_RECIPIENT` env var that routes every price-drop alert to one demo inbox when set; preserve the v1.0 user-of-record code path byte-identically when unset; validate both env vars through the existing typed `env.server.ts` schema (Zod) so the app fails fast at boot if required vars are missing; document the one-env-var flip from test-recipient mode to production mode for the future v1.2 domain-verification milestone. Covers EMAIL-01 through EMAIL-05.

**In scope:**
- `RESEND_TEST_RECIPIENT` added to `dealdrop/src/lib/env.server.ts` Zod schema (optional, email-format-validated when set)
- `sendPriceDropAlert` in `dealdrop/src/lib/resend.ts` reads `env.RESEND_TEST_RECIPIENT` and overrides the `to` field internally before calling `resend.emails.send` (D-01)
- `PriceDropInput.to` semantics preserved: caller always passes user-of-record's email; the override happens inside the email module (D-03)
- New unit tests in `dealdrop/src/lib/resend.test.ts` covering the override branch + env-validation rejection of malformed override values (D-04)
- `dealdrop/.env.example` updated with the new optional var + a one-line comment explaining when to set it
- `dealdrop/README.md` (currently scaffold copy) updated with a real DealDrop section explaining the test-recipient → production flip for v1.2 (EMAIL-05)
- `RESEND_FROM_EMAIL` stays `z.string().email()` required in `env.server.ts` (Phase 6 contract preserved — see Claude's Discretion §"FROM_EMAIL strictness")
- One `console.warn` at module load in `resend.ts` when the override is active so it shows up in Vercel logs / dev terminal (see Claude's Discretion §"Override observability")

**Not in scope:**
- Custom domain purchase / DNS records / Resend domain verification / Vercel custom domain — locked to v1.2 (Custom Domain + Real Email) per `PROJECT.md` Future Milestones and `REQUIREMENTS.md` Out of Scope
- Switching email providers (Brevo / MailerSend / SES) — Resend stays in place; refactor only
- Brand-styling the price-drop email body (orange CTA, header treatment) — explicitly deferred to v1.2 per Phase 8 deferred ideas; Phase 9 must not touch the HTML template body
- Renaming `RESEND_FROM_EMAIL` or `RESEND_API_KEY` — Phase 6 names are stable
- Multi-recipient cc/bcc routing, branded display name (`"DealDrop <alerts@…>"`) — display name at send-time is Claude's Discretion in Phase 6 06-CONTEXT and stays that way
- Per-product or per-user recipient overrides — single global override only
- Email-on-tracking-failure transactional flow — `PROJECT.md` Out of Scope
- Production-hardened secret rotation, environment-promotion automation, audit logs of override toggles — portfolio bar
- Touching `cron/check-prices.ts` orchestrator beyond what the override layer needs (which per D-01 is **nothing** — caller stays unchanged)
- Touching `app/api/cron/check-prices/route.ts` — no Route Handler changes
- Phase 8 (Brand Polish) artifacts: globals.css, Header.tsx, Hero.tsx, ProductCard.tsx, AddProductForm.tsx, app/icon.tsx — fully out of scope

</domain>

<decisions>
## Implementation Decisions

### Override layer placement (the one area discussed)

- **D-01: The test-recipient swap happens inside `sendPriceDropAlert` (resend.ts).** When `env.RESEND_TEST_RECIPIENT` is set, `sendPriceDropAlert` overrides the `to` field internally before passing the payload to `resend.emails.send`. The caller (cron orchestrator) keeps passing the user-of-record's email — its call-site code is byte-identical to v1.0. Rationale: encapsulation. The email module owns "who actually receives this"; routing policy should not bleed into the cron orchestrator. Preserves EMAIL-03 ("production code path delivers alerts to the user-of-record's email — preserving v1.0 behavior") most cleanly: the call site does not even know the override exists.

- **D-02: The override layer reads the env var via direct `env.server` import.** `resend.ts` already imports `env` from `@/lib/env.server` for `RESEND_API_KEY` and `RESEND_FROM_EMAIL`; reading `env.RESEND_TEST_RECIPIENT` from the same module-scope import matches the established pattern (no parameter threading; tests stub via `vi.stubEnv` exactly as `resend.test.ts` already does for `RESEND_API_KEY`).

- **D-03: `PriceDropInput.to` always means "the user-of-record's email".** The cron orchestrator (`processOneProduct` in `cron/check-prices.ts`) continues to resolve `userData.user.email` via `admin.auth.admin.getUserById(...)` and pass it as `input.to` exactly as today. The override (when active) substitutes a different value at the SDK boundary inside `sendPriceDropAlert`. Rationale: the `PriceDropInput` type contract should describe the **business intent** (alert this user about their tracked product), not the **wire-level recipient** (whatever happens to land in Resend's `to:` field this run). This keeps `PriceDropInput` stable when the override flips on/off.

- **D-04: Override-routing tests live in `resend.test.ts`** alongside the existing `sendPriceDropAlert` describe-block. Add: (1) override-unset → resend SDK called with `to = input.to` (user-of-record), (2) override-set → resend SDK called with `to = env.RESEND_TEST_RECIPIENT`, regardless of `input.to`, (3) env-validation rejects malformed override (e.g., `"not-an-email"`). Re-uses the existing `vi.stubEnv` + `sendMock` infrastructure at the top of `resend.test.ts` — zero new test scaffolding. No new tests in `cron/check-prices.test.ts` because per D-01 the cron orchestrator does not change at all.

### Env schema shape (locked by EMAIL-04 + downstream of D-01..D-04)

- **D-05: `RESEND_TEST_RECIPIENT` validation = `z.string().email().optional()`.** Same `.email()` Zod check as `RESEND_FROM_EMAIL` so a malformed override value fails at boot rather than silently routing to a bad address. `.optional()` because EMAIL-02 explicitly says "**when set**" — the production code path requires it to be unset. With `emptyStringAsUndefined: true` already enabled in `env.server.ts`, an empty `RESEND_TEST_RECIPIENT=` line in `.env.local` correctly resolves to `undefined` and triggers the production code path. Mirrors Phase 6's existing pattern (D-04 in 06-CONTEXT preserves `env.server.ts` as the gate; this phase extends it by exactly one optional field).

- **D-06: Validation strictness for `RESEND_TEST_RECIPIENT` is the same as `RESEND_FROM_EMAIL` — bare RFC-5321 address only.** The mailbox format `"Name <addr@host>"` does NOT pass Zod v4's `.email()` regex (already documented in `resend.test.ts:15-19` for FROM_EMAIL). The override is the recipient, so a display name is meaningless anyway — keep the schema strict; reject the mailbox format if a user tries to set it.

### Documentation surface (EMAIL-05)

- **D-07: Both `dealdrop/.env.example` AND `dealdrop/README.md` get updated.** `.env.example` is the discovery surface (a developer cloning the repo sees all required + optional env vars in one place); `README.md` is currently scaffold copy and gets a real DealDrop intro plus a short "Email modes" section explaining the one-env-var flip. The README content is intentionally short — portfolio-bar README, not a manual. No dedicated `docs/email-config.md` (over-organized for a single env-var toggle at this scale).

### Claude's Discretion

The user explicitly did not deep-dive these areas. Planner uses these defaults; flag as deviation if any materially changes the plan or user-visible behavior.

- **`RESEND_FROM_EMAIL` strictness.** Keep **required** with `z.string().email()` exactly as Phase 6 shipped it. Rationale: every running environment of this app already has it set (local dev `.env.local`, Vercel preview, Vercel prod) — so the "sensible default" framing in EMAIL-01 is already satisfied operationally without a Zod default. Adding a `.default('onboarding@resend.dev')` would mask a missing prod config (the Vercel deployment would silently use the sandbox sender) — fail-fast at boot is a stronger guarantee for a portfolio demo. If a future contributor wants a frictionless first-clone experience, they can add a default in a later iteration; the env-var name and Zod node stay forward-compatible either way. Phase 9 makes **zero changes** to `RESEND_FROM_EMAIL`'s schema or default behavior.

- **Override observability.** When `env.RESEND_TEST_RECIPIENT` is set, emit **one** `console.warn('resend: test_recipient_override_active', { recipient: env.RESEND_TEST_RECIPIENT })` at module load (top of `resend.ts`, after the `Resend` SDK construction). Rationale: visible once in Vercel function logs and the dev terminal; doesn't add per-send noise; structured-log payload (Phase 6 D-08 / 06-CONTEXT pattern). No per-send warnings (would clutter cron logs and hurt EMAIL-03's "production code path identical" framing). No silent mode (a portfolio demo benefits from a visible "hey, this is in test mode" signal). If the planner finds the module-load warn fires twice in dev (HMR / Next.js hot-reload), that's acceptable noise — a `let warned = false` guard is cheap if needed but not required.

- **Email subject/body adjustment when override is active.** **Do not modify the email content** when the override is set. No `[TEST]` subject prefix, no in-body banner, no extra metadata. Rationale: EMAIL-03 says "production code path delivers alerts" — the cleanest interpretation is "the bytes Resend receives are identical regardless of recipient". The override is a recipient-routing concern only. The demo recipient still gets a real, accurate alert about a real product price drop — that's the point of the demo. If the user later wants a "[TEST]" subject for clarity, that's a one-line follow-up; doesn't need to ship in Phase 9.

- **README copy length and tone.** Short DealDrop intro (what it is, link to PROJECT.md or a one-paragraph description), then a small "Environment configuration" section listing required vs optional env vars with one-line descriptions, then a "Email recipient modes" subsection with a 3-line explanation: (1) `RESEND_TEST_RECIPIENT` set → all alerts go to that address; (2) unset → alerts go to user-of-record's email; (3) for v1.2, unset it after Resend domain verification. Planner picks exact copy. Match the portfolio-bar tone — informative, not exhaustive.

- **`.env.example` comment style.** Add `RESEND_TEST_RECIPIENT=` (no value, optional) under the existing `# Phase 6 — email + cron` block, with a one-line `# When set, all price-drop alerts route to this address (test mode). Leave blank for production user-of-record.` comment. Match the `# Phase 6 — email + cron` header style already in the file. Planner may instead create a new `# Phase 9 — email recipient override` header for clarity; either is acceptable.

- **Test names / describe-block organization.** Planner picks exact `describe(...)`/`it(...)` strings. Recommended: extend the existing `describe('sendPriceDropAlert (EMAIL-02, EMAIL-06)', ...)` block with a new nested `describe('with RESEND_TEST_RECIPIENT override (EMAIL-02, EMAIL-03)', ...)` containing the three D-04 tests. Reuses the `sendMock` and stubbed env from the file's top-level setup.

- **Type/interface changes to `PriceDropInput` or `SendResult`.** None expected. The override is internal to `sendPriceDropAlert`; the public type contract stays stable. If the planner discovers a reason to surface "what address was actually used" in the return shape (e.g., for cron audit logs), that's a deviation — flag and ask.

- **Whether to also export a pure helper like `resolveRecipient(userEmail)`.** Optional. If extracting the 2-line override decision into a named function helps test readability, do it (e.g., `export function resolveRecipient(userEmail: string): string { return env.RESEND_TEST_RECIPIENT ?? userEmail }`). If the inline expression `env.RESEND_TEST_RECIPIENT ?? input.to` reads cleanly enough at the SDK call site, skip the helper. Planner's call.

### Folded Todos

None — `gsd-tools todo match-phase 9` returned zero matches. No backlog items surfaced for this phase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope & Requirements
- `.planning/REQUIREMENTS.md` — EMAIL-01 through EMAIL-05 acceptance criteria + v1.1 Out of Scope (custom domain, full provider switch, multi-recipient routing all explicitly excluded)
- `.planning/ROADMAP.md` §"Phase 9: Resend Env Config" — goal + 5 success criteria; depends on Phase 6 (the refactor target) and Phase 8 (atomic-commit hygiene only — no functional dependency)
- `.planning/PROJECT.md` — "Bar: Portfolio/demo quality" constraint + the "Current Milestone: v1.1" section that locks domain verification deferral to v1.2; "Resend account email differs from user's DealDrop OAuth email — solved by env-configurable test-recipient override"

### Prior Phase Context (locked decisions Phase 9 inherits)
- `.planning/phases/06-automated-monitoring-email-alerts/06-CONTEXT.md` §D-05..D-08 — `lib/resend.ts` inline-HTML template, table-based layout, one-email-per-drop, EMAIL-06 log-but-don't-abort. **Phase 9 must not touch the HTML template body or the email-content shape.**
- `.planning/phases/06-automated-monitoring-email-alerts/06-CONTEXT.md` §"Existing Code Contracts" — `env.server.ts` already validates `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (z.string().email()), `CRON_SECRET` (≥32). Phase 9 extends by exactly one optional field.
- `.planning/phases/08-brand-polish/08-CONTEXT.md` §"Not in scope for this phase" — explicitly states "Phase 9 must NOT be touched in Phase 8"; conversely Phase 9 must NOT touch the brand-polish surface area (globals.css, Header.tsx, Hero.tsx, ProductCard.tsx, AddProductDialog.tsx, AddProductForm.tsx, app/icon.tsx). Clean separation is the whole reason v1.1 was split into two phases.
- `.planning/phases/08-brand-polish/08-CONTEXT.md` §"Deferred Ideas / Email template orange brand styling" — captured for future v1.2 work; Phase 9 does not touch email body styling.

### Existing Code Contracts (modify or preserve verbatim per D-01..D-07)
- `dealdrop/src/lib/env.server.ts` — Zod schema. **Modify**: add `RESEND_TEST_RECIPIENT: z.string().email().optional()` to the `server` block and the `runtimeEnv` block (D-05). Do NOT touch the existing five fields' validators. Do NOT touch `emptyStringAsUndefined: true` or `skipValidation`.
- `dealdrop/src/lib/resend.ts` — **Modify**: in `sendPriceDropAlert`, replace the SDK `to: input.to` with `to: env.RESEND_TEST_RECIPIENT ?? input.to` (D-01, D-02). Add a one-time `console.warn('resend: test_recipient_override_active', { recipient: env.RESEND_TEST_RECIPIENT })` at module load (Claude's Discretion §"Override observability"). Do NOT touch `renderPriceDropEmailHtml`, `computePercentDrop`, `formatCurrency`, `escapeHtml`, the `Resend` SDK construction, the `from`/`subject`/`html` fields, or the error-mapping branch.
- `dealdrop/src/lib/cron/check-prices.ts` — **Do NOT modify**. Per D-01 + D-03, the cron orchestrator is untouched. The `userData.user.email` resolution at line 180-194 stays exactly as Phase 6 shipped it.
- `dealdrop/app/api/cron/check-prices/route.ts` — **Do NOT modify**. Route Handler is unaffected.
- `dealdrop/src/lib/resend.test.ts` — **Modify**: extend the existing `describe('sendPriceDropAlert (EMAIL-02, EMAIL-06)', ...)` block with override tests per D-04. Re-use `vi.stubEnv` for `RESEND_TEST_RECIPIENT` per the file's existing top-level pattern. **Do NOT touch** the `escapeHtml`, `computePercentDrop`, `formatCurrency`, `renderPriceDropEmailHtml` describe-blocks.
- `dealdrop/.env.example` — **Modify**: add `RESEND_TEST_RECIPIENT=` (empty value, with one-line comment) under the existing `# Phase 6 — email + cron` block. Or add a new `# Phase 9 — email recipient override` block (Claude's Discretion).
- `dealdrop/README.md` — **Modify**: replace the scaffold copy with a real DealDrop README per D-07 + Claude's Discretion §"README copy length". Keep portfolio-bar tone.
- `dealdrop/AGENTS.md` / `dealdrop/CLAUDE.md` — **Read before coding.** "This is NOT the Next.js you know" — read `node_modules/next/dist/docs/` for any Next.js 16.2 env-handling specifics if needed (Phase 9 is unlikely to touch Next-specific APIs but the convention applies repo-wide).

### External Docs (planner may fetch during research)
- **`@t3-oss/env-nextjs` docs** — confirm `.optional()` behavior with `emptyStringAsUndefined: true` (an empty `RESEND_TEST_RECIPIENT=` line should resolve to `undefined`, not an empty string, so the `?? input.to` fallback fires). Verify against the installed package version in `dealdrop/package.json` / `dealdrop/node_modules/@t3-oss/env-nextjs/`.
- **Resend Node SDK docs** — confirm `emails.send({ to: string })` accepts a single string (not just an array); already used as `to: input.to` in v1.0 so this is verification, not new ground.
- **Zod v4 `.email()` regex** — confirm it still rejects mailbox format (`"Name <addr@host>"`); already documented in `resend.test.ts:15-19` but worth a sanity check at planning time in case Zod was upgraded between phases.
- **Vercel env-var docs** — for the README's "production deployment" subsection, confirm the latest pattern for setting/unsetting an env var via `vercel env` CLI or the dashboard. Optional — README can stay agnostic.

### PROJECT.md Out of Scope reminders (do NOT regress)
- No password / magic-link auth — only Google OAuth (PROJECT.md Constraints)
- No multi-recipient routing or per-product alert thresholds — single global override only (REQUIREMENTS.md v2+ deferred)
- No retry-on-email-failure — EMAIL-06 from Phase 6 stays "log but don't abort" (06-CONTEXT D-08)
- No FX / currency conversion in the email body — Phase 6 D-07 owns the formatted currency string

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`env` object from `@/lib/env.server`** — already imported by `resend.ts`; adding `env.RESEND_TEST_RECIPIENT` is a zero-friction extension that downstream modules pick up via the same import.
- **`vi.stubEnv` infrastructure in `resend.test.ts:8-24`** — already stubs five env vars at file load; adding `vi.stubEnv('RESEND_TEST_RECIPIENT', ...)` per-test is one line of test setup.
- **`sendMock` + `vi.mock('resend', ...)` at `resend.test.ts:28-31`** — captures every `resend.emails.send(...)` call; the override tests assert on `sendMock.mock.calls[0][0].to` exactly like the existing happy-path test at line 152-164.
- **`emptyStringAsUndefined: true` in env.server.ts:29** — already coerces empty `RESEND_TEST_RECIPIENT=` lines to `undefined`, so the `?? input.to` fallback fires correctly without an explicit `if (env.RESEND_TEST_RECIPIENT === '')` branch.
- **Structured `console.warn` / `console.error` pattern** — established in Phase 3 (`scrape-product.ts:88`) and Phase 6 (`resend.ts:157`, `cron/check-prices.ts:90,107`). Phase 9's one new `console.warn` follows this verbatim.

### Established Patterns
- **`import 'server-only'` first line** — `resend.ts:1` and `env.server.ts:1` already comply. Any new helper module Phase 9 introduces (only if planner picks the optional `resolveRecipient()` extraction) must mark this on its first line.
- **Discriminated-union `SendResult` return shape** — `{ ok: true, messageId } | { ok: false, reason }` (resend.ts:31-33). Phase 9 does NOT change this shape — the override is invisible from the outside.
- **Zod schema additivity** — `env.server.ts` extends by adding fields, never restructuring. Five existing fields stay untouched.
- **Test re-export shape** — `resend.test.ts` imports the module as a namespace (`mod`) at file load; Phase 9 tests follow the same import pattern.
- **Portfolio-bar testing** — Vitest unit tests for the swap behavior + manual inbox verification per success-criterion 2 + 3 = sufficient. No e2e harness, no Playwright, no Resend webhook integration test.

### Integration Points
- **Modify: `dealdrop/src/lib/env.server.ts`** — extend Zod schema with one optional field.
- **Modify: `dealdrop/src/lib/resend.ts`** — change one expression (`to:` value) + one new `console.warn` at module load.
- **Modify: `dealdrop/src/lib/resend.test.ts`** — extend describe-block with 2-3 new tests.
- **Modify: `dealdrop/.env.example`** — append one new line (with comment).
- **Modify: `dealdrop/README.md`** — replace scaffold body with portfolio-bar DealDrop README.
- **No modify: `dealdrop/src/lib/cron/check-prices.ts`** — orchestrator unchanged per D-01.
- **No modify: `dealdrop/src/lib/cron/check-prices.test.ts`** — no integration test added per D-04 + D-01 (no behavior change to integrate-test).
- **No modify: `dealdrop/app/api/cron/check-prices/route.ts`** — route handler unaffected.
- **No modify: any Phase 8 surface** — globals.css, Header.tsx, Hero.tsx, AddProductForm.tsx, ProductCard.tsx, app/icon.tsx, dashboard tests all untouched.
- **No new files expected** — unless planner picks the optional `lib/email/resolve-recipient.ts` helper extraction (Claude's Discretion); even then, it's a 5-line module.
- **Out of repo: nothing.** No Vercel dashboard work, no Resend dashboard work, no Supabase migration. All changes are source-tree edits + the README. (Setting the env var in Vercel for a real demo is an operator concern, not a code-change deliverable.)

</code_context>

<specifics>
## Specific Ideas

- **The override is a recipient-routing concern only — never a content concern.** The bytes Resend receives (subject, HTML body, from-address) are identical whether `RESEND_TEST_RECIPIENT` is set or not. Only the `to:` field differs. This is the cleanest interpretation of EMAIL-03's "production code path preserved".
- **"Local dev has a sensible default" (EMAIL-01) is already satisfied by operational reality, not by a Zod default.** Every running environment has `RESEND_FROM_EMAIL` set in `.env.local` / Vercel env. Adding a `.default('onboarding@resend.dev')` would mask missing prod config and hurt the fail-fast guarantee. Keep the field required.
- **The override is a single-flip lever for the v1.2 demo.** When v1.2 ships a verified domain, the operator unsets `RESEND_TEST_RECIPIENT` in Vercel prod env — alerts immediately route to user-of-record. Zero code change required at v1.2 cutover. This is what EMAIL-05's "one-env-var flip" wording locks in.
- **`PriceDropInput.to` is a business-intent type, not a wire-level type.** The cron orchestrator's responsibility is "tell the email module who this alert is *for*"; the email module's responsibility is "deliver the alert per current routing policy". Keeping these layers separate (D-03) is what makes the v1.0 → v1.2 transition zero-code at the call site.
- **`env.RESEND_TEST_RECIPIENT ?? input.to`** is the entire override expression. The planner should not over-engineer this with a config object, a settings module, or a routing strategy pattern. Two operands, one nullish coalesce, done.
- **One module-load `console.warn` is the right observability budget.** A portfolio demo benefits from one visible "test mode is on" signal in the Vercel logs / dev terminal — it surfaces the override during demo prep without spamming the cron log every send. Anything more (per-send warning, dedicated dashboard surface) is over-engineering for v1.1.
- **The README rewrite is a side-quest of Phase 9.** The current `dealdrop/README.md` is `create-next-app` scaffold copy. EMAIL-05 forces a real README; the scope creep is "while we're touching it, give it a real intro". Planner keeps it portfolio-bar — short, useful, links to PROJECT.md for full context. No exhaustive deployment guide.
- **`.env.example` comment style stays consistent with Phase 6.** Existing format is `# Phase 6 — email + cron` then bare keys. Phase 9 either adds under that block or adds a `# Phase 9 — email recipient override` header. Planner picks; both readable.
- **No tests in `cron/check-prices.test.ts`** — D-01 means the cron orchestrator's behavior literally does not change. Adding integration tests there would test "I haven't introduced a regression in code I didn't touch", which is not a productive use of test surface.

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
None — `gsd-tools todo match-phase 9` returned zero matches. No backlog items reviewed.

### Out of this phase
- **`RESEND_FROM_EMAIL` made optional with a `onboarding@resend.dev` default** — discussed, deferred. Could improve first-clone DX for a future contributor; not worth the loss of fail-fast prod config in v1.1. Re-open if/when DealDrop becomes a multi-contributor codebase.
- **`[TEST]` subject prefix or in-body banner when override is active** — discussed, deferred. EMAIL-03's "production code path preserved" reads cleanest if the bytes are identical regardless of recipient. If the demo recipient ever finds the lack of a "this is test routing" hint confusing, add it as a one-line follow-up in v1.2 or later.
- **Per-send `console.warn` with `{originalRecipient, overrideRecipient, productId}`** — discussed, deferred. Module-load warn is enough observability for portfolio bar; per-send log would clutter cron output.
- **Dedicated `docs/email-config.md` file** — discussed, deferred. Single env-var toggle does not justify a docs subdirectory. README + .env.example comments is the right granularity.
- **`resolveRecipient(userEmail)` exported helper** — Claude's Discretion. Planner may add for test readability or skip if inline `?? input.to` reads cleanly. Either is acceptable.
- **Branded sender display name (`"DealDrop <alerts@…>"`)** — Claude's Discretion in 06-CONTEXT, stays Claude's Discretion in Phase 9. Cannot use mailbox format in the env var (Zod rejects), but Resend's `from` parameter at send-time accepts it. v1.2 with a verified domain is the natural place to revisit.
- **Custom domain purchase + DNS records + Resend domain verification + Vercel custom domain** — locked deferred to v1.2 (Custom Domain + Real Email) per `PROJECT.md` Future Milestones.
- **Email body brand styling (orange CTA / header / drop-percent pill)** — deferred to v1.2 per Phase 8 deferred ideas list. Phase 9 does not touch the HTML template body.
- **Switching email providers (Brevo / MailerSend / SES)** — out of v1.1 per `REQUIREMENTS.md` Out of Scope. Larger refactor; Resend wiring stays.
- **Multi-recipient cc/bcc routing** — out of scope. EMAIL-02 is a single-string override.
- **Per-product or per-user recipient overrides** — out of scope. Single global override only.
- **Production-hardened secret rotation, environment-promotion automation, audit logs** — portfolio bar; not in v1.1.
- **Email-on-scrape-failure transactional flow** — `PROJECT.md` Out of Scope (v1 surfaces failure in UI only).

</deferred>

---

*Phase: 09-resend-env-config*
*Context gathered: 2026-05-02*
