import type { User } from '@supabase/supabase-js'
import { getUserProducts } from '@/lib/products/get-user-products'
import { EmptyState } from './EmptyState'
import { ProductGrid } from './ProductGrid'

type DashboardShellProps = Readonly<{ user: User }>

export async function DashboardShell({ user: _user }: DashboardShellProps) {
  const products = await getUserProducts()
  const authed = true  // DashboardShell is only rendered inside the `if (user)` branch of app/page.tsx
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      {products.length === 0 ? (
        <EmptyState authed={authed} />
      ) : (
        <ProductGrid products={products} authed={authed} />
      )}
    </div>
  )
}
