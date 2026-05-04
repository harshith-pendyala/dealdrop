# TESTING.md — Test Structure & Practices

## Status: NOT CONFIGURED

No testing infrastructure is present in this codebase. This is a fresh `create-next-app` scaffold.

---

## What's Missing

| Item | Status |
|------|--------|
| Test framework (Jest/Vitest) | Not installed |
| Test configuration file | Not present |
| Test files (`.test.ts`, `.spec.ts`) | None found |
| Test scripts in `package.json` | Not configured |
| Mock library | Not installed |
| Coverage tooling | Not configured |

Note: `.gitignore` references a `coverage/` directory — carry-over from the Next.js template, not an active setup.

---

## Recommended Setup (when ready)

**Framework:** Vitest (aligns with modern Next.js App Router + React 19)

**Install:**
```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

**Suggested structure:**
```
dealdrop/
├── __tests__/          # Integration/e2e tests
└── app/
    └── components/
        └── MyComponent/
            ├── MyComponent.tsx
            └── MyComponent.test.tsx   # Co-located unit tests
```

**Scripts to add in `package.json`:**
```json
"test": "vitest",
"test:coverage": "vitest run --coverage"
```

---

## Priority
Testing setup should be completed before any feature development begins (see CONCERNS.md).
