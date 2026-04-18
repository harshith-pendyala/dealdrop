# Deferred Items (Phase 02)

## DEF-02-02-01: Turbopack CSS @import resolution fails in git worktrees

**Discovered during:** Plan 02-02 verification (npm run build)
**Plan in scope:** 02-02
**Symptom:** `next build` (Turbopack mode, default) fails with:
```
./app/globals.css:2:1
Module not found: Can't resolve 'tw-animate-css'
```
even though `node_modules/tw-animate-css` is present with correct `package.json` exports.

**Scope verdict:** OUT OF SCOPE for Plan 02-02 (pre-existing Turbopack + git-worktree interaction bug; `tw-animate-css` was introduced in Phase 1 Plan 01-05 shadcn scaffolding). Same globals.css builds cleanly in the main checkout.

**Workaround used for verification:** `npx next build --webpack` produces a successful build with expected route tree (`ƒ /auth/callback` + `ƒ Proxy (Middleware)`).

**Next step:** Investigate in a dedicated ticket — likely Turbopack resolving package CSS exports via a path that does not survive the `.git`-is-a-file worktree layout. Not blocking Phase 2 because (a) the main checkout builds fine and (b) webpack build succeeds in the worktree too.
