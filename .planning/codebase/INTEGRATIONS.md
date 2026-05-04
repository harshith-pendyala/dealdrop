# External Integrations

**Analysis Date:** 2026-04-17

## APIs & External Services

**Third-Party Services:**
- Not detected - No external API clients or SDKs currently integrated

**Google Fonts:**
- Next.js Google Fonts integration (built-in)
  - Uses Geist and Geist Mono fonts loaded via `next/font/google`
  - Implementation: `app/layout.tsx` (lines 2, 5-13)

## Data Storage

**Databases:**
- Not detected - No database client library in dependencies

**File Storage:**
- Local filesystem only
- Public assets served from `public/` directory

**Caching:**
- Not detected - No caching layer configured

## Authentication & Identity

**Auth Provider:**
- Not detected - No authentication system implemented

**Implementation:**
- No auth middleware or routes identified

## Monitoring & Observability

**Error Tracking:**
- Not detected - No error tracking service configured

**Logs:**
- Console logging only (application-level)
- Next.js development server logs available during `npm run dev`

**Performance Monitoring:**
- Not detected - No APM or performance monitoring service

## CI/CD & Deployment

**Hosting:**
- Vercel (recommended, no explicit configuration)
  - Indicated by deployment instructions in README.md

**CI Pipeline:**
- Not detected - No CI/CD configuration file present (.github/workflows/, .gitlab-ci.yml, etc.)

**Build Artifact Location:**
- `.next/` directory (created during build)
- `out/` directory (optional static export)

## Environment Configuration

**Required env vars:**
- None explicitly required in source code
- `.env*` files are listed in `.gitignore` - support for environment-specific configuration exists
- No production secrets detected in dependencies

**Secrets location:**
- Environment variables: `.env*` files (not committed to repository)
- .gitignore pattern: `.env*` (line 34 of .gitignore)

## Webhooks & Callbacks

**Incoming:**
- Not detected - No API routes or webhook endpoints defined

**Outgoing:**
- Not detected - No external webhook calls identified

## Font Services

**Google Fonts:**
- Service: google-fonts API (via Next.js built-in integration)
- Implementation: `next/font/google`
  - Fonts: Geist, Geist_Mono
  - Auto-optimization enabled (built-in to Next.js)

## Development Tools & External Resources

**Documentation Resources:**
- Next.js official documentation (referenced in app/page.tsx and README.md)
- Vercel deployment documentation

---

*Integration audit: 2026-04-17*
