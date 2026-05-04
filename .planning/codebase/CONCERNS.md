# CONCERNS.md — Technical Debt & Risk Areas

## Project State
DealDrop is a fresh Next.js scaffold created by `create-next-app` with no custom business logic beyond boilerplate. Concerns are primarily **missing infrastructure** rather than accumulated debt.

---

## Critical (Must Address Before Feature Dev)

### 1. Zero Testing Infrastructure
- No test framework, test files, or test configuration present
- No unit, integration, or e2e test setup
- **Risk:** Regressions undetectable as codebase grows

### 2. No Environment Configuration
- No `.env` file, `.env.example`, or environment variable schema validation
- Cannot be safely deployed across environments (dev/staging/prod)
- **Risk:** Hardcoded values or missing config at deploy time

### 3. Missing Authentication/Authorization
- Zero user management infrastructure
- No auth provider integration (NextAuth, Clerk, etc.)
- **Risk:** Any user-facing feature blocked until this is resolved

### 4. No Data Layer
- Zero database configuration, ORM setup, or API route structure
- Cannot persist user data
- **Risk:** All feature work requires this foundation first

---

## High Priority

### 5. Placeholder Metadata
- `app/layout.tsx` contains "Create Next App" title and description
- Needs replacement with actual DealDrop branding before any public deployment

### 6. No Error Handling
- No error boundaries, centralized logging, or error tracking (Sentry, etc.)
- Production errors would be invisible

### 7. No API Documentation Strategy
- No OpenAPI/Swagger setup for future API development

---

## Medium Priority

### 8. Tailwind CSS v4 Adoption Risk
- Using Tailwind v4 (very recent major version with breaking changes from v3)
- Limited production adoption/community support compared to v3
- **Risk:** Fewer examples, potential edge cases, plugin incompatibilities

### 9. Dependency Pinning
- ESLint v9 uses new flat config format (breaking from v8)
- TypeScript v5 without version pinning
- Next.js 16 introduces breaking changes from standard patterns
- **Risk:** Unexpected breakage on `npm install` in fresh environments

### 10. Missing Documentation
- No architecture decisions documented
- No component documentation
- No developer setup guide beyond default Next.js README

---

## Low Priority / Watch

### 11. No CI/CD Pipeline
- No GitHub Actions, Vercel config beyond defaults, or deployment pipeline
- **Risk:** Manual deployments are error-prone at scale

---

## Clean Areas
- Codebase is minimal — no legacy debt
- TypeScript configured correctly
- ESLint baseline in place
- Git history clean
