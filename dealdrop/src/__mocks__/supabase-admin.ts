// File: dealdrop/src/__mocks__/supabase-admin.ts
// Shared Vitest mock factory for @/lib/supabase/admin createAdminClient().
// Separate from supabase-server.ts because the admin client has different surface:
//   - auth.admin.getUserById (not on user-scoped client)
//   - from('products').update().eq().not() chains (only used by cron orchestrator)
// Consumed by: src/lib/cron/check-prices.test.ts + app/api/cron/check-prices/route.test.ts

import { vi } from 'vitest'

type PostgrestErrorShape = { code: string; message?: string; details?: string } | null
type AuthErrorShape = { name: string; message: string; status?: number } | null

// Simplified User shape matching the slice of @supabase/auth-js/User that cron reads.
// Real type has many more fields; we only use id + email.
type MockUser = { id: string; email?: string }

export interface AdminMockOverrides {
  // Per-user-id lookup for auth.admin.getUserById.
  // Map user_id -> user record (email may be undefined).
  // If the uid isn't present, getUserById returns { data: { user: null }, error: { name: 'user_not_found' } }.
  userById?: Record<string, MockUser>
  // Response for admin.from('products').select('*').order('created_at', { ascending: true })
  selectProducts?: { data: unknown[]; error: PostgrestErrorShape }
  // Response for admin.from('products').update(...).eq('id', ...) — generic catch-all
  updateProductResult?: { error: PostgrestErrorShape }
  // Response for admin.from('price_history').insert(...)
  insertHistoryResult?: { error: PostgrestErrorShape }
}

export function makeSupabaseAdminMock(overrides: AdminMockOverrides = {}) {
  const userById = overrides.userById ?? {}
  const selectProducts = overrides.selectProducts ?? { data: [], error: null }
  const updateProductResult = overrides.updateProductResult ?? { error: null }
  const insertHistoryResult = overrides.insertHistoryResult ?? { error: null }

  // Chainable .eq().not() builder for products UPDATE
  const makeUpdateBuilder = () => {
    const eqFn = vi.fn(() => ({
      then: (onFulfilled: (v: { error: PostgrestErrorShape }) => unknown) =>
        Promise.resolve(updateProductResult).then(onFulfilled),
      not: vi.fn().mockResolvedValue(updateProductResult),
    }))
    return { eq: eqFn }
  }

  // Chainable .order() builder for products SELECT
  const makeSelectBuilder = () => ({
    order: vi.fn().mockResolvedValue(selectProducts),
  })

  // price_history.insert resolves directly (no .select().single() chain in cron)
  const makeInsertBuilder = () => ({
    then: (onFulfilled: (v: { error: PostgrestErrorShape }) => unknown) =>
      Promise.resolve(insertHistoryResult).then(onFulfilled),
  })

  return {
    auth: {
      admin: {
        getUserById: vi.fn(async (uid: string) => {
          const user = userById[uid]
          if (!user) {
            return {
              data: { user: null },
              error: { name: 'user_not_found', message: `User ${uid} not found`, status: 404 } as AuthErrorShape,
            }
          }
          return { data: { user }, error: null }
        }),
      },
    },
    from: vi.fn((table: string) => ({
      select: vi.fn(() => makeSelectBuilder()),
      insert: vi.fn(() => {
        if (table === 'price_history') return makeInsertBuilder()
        // Unused in cron; included for defense.
        return {
          then: (o: (v: { error: PostgrestErrorShape }) => unknown) =>
            Promise.resolve({ error: null }).then(o),
        }
      }),
      update: vi.fn(() => makeUpdateBuilder()),
    })),
  }
}
