// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Stub child components so this test stays focused on grid + count + optimistic behavior.
vi.mock('./ProductCard', () => ({
  ProductCard: (props: { product: { id: string; name: string } }) => (
    <div data-testid="product-card" data-id={props.product.id}>{props.product.name}</div>
  ),
}))
vi.mock('./SkeletonCard', () => ({
  SkeletonCard: () => <div data-testid="skeleton-card" />,
}))
vi.mock('./AddProductDialog', () => ({
  AddProductDialog: (props: { authed: boolean }) => (
    <button data-testid="add-dialog-stub" data-authed={String(props.authed)}>
      + Add Product
    </button>
  ),
}))
// AddProductForm must remain the REAL component so the form element + formAction
// dispatch path is real — we only stub the collaborators it pulls in.
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock('@/components/auth/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: vi.fn(), isOpen: false, setOpen: vi.fn() }),
}))
// Mock addProduct to a pending-forever promise so we can observe the optimistic
// skeleton BEFORE the server action resolves.
const addProductMock = vi.fn()
vi.mock('@/actions/products', () => ({
  addProduct: (...args: unknown[]) => addProductMock(...args),
}))

import { ProductGrid } from './ProductGrid'
import type { Product } from '@/lib/products/get-user-products'

afterEach(() => {
  cleanup()
})

function makeProducts(n: number): Product[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    user_id: 'u1',
    url: `https://example.com/${i + 1}`,
    name: `Product ${i + 1}`,
    current_price: 10 + i,
    currency: 'USD',
    image_url: null,
    created_at: '2026-04-20T00:00:00Z',
    updated_at: '2026-04-20T00:00:00Z',
    last_scrape_failed_at: null,
  })) as Product[]
}

describe('ProductGrid', () => {
  it('DASH-01: count singular "1 product tracked" when products.length === 1', () => {
    render(<ProductGrid products={makeProducts(1)} authed={true} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('1 product tracked')
  })

  it('DASH-01: count plural "3 products tracked" when products.length > 1', () => {
    render(<ProductGrid products={makeProducts(3)} authed={true} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('3 products tracked')
  })

  it('DASH-01: count plural "0 products tracked" when products.length === 0', () => {
    render(<ProductGrid products={[]} authed={true} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('0 products tracked')
  })

  it('DASH-02: renders one ProductCard per product row (3 products -> 3 cards)', () => {
    render(<ProductGrid products={makeProducts(3)} authed={true} />)
    const cards = screen.getAllByTestId('product-card')
    expect(cards).toHaveLength(3)
    expect(cards[0]).toHaveAttribute('data-id', 'p1')
    expect(cards[2]).toHaveAttribute('data-id', 'p3')
  })

  it('DASH-02: grid uses responsive Tailwind classes', () => {
    const { container } = render(<ProductGrid products={makeProducts(1)} authed={true} />)
    const grid = container.querySelector('[data-testid="product-grid"]')
    expect(grid?.className).toMatch(/grid-cols-1/)
    expect(grid?.className).toMatch(/sm:grid-cols-2/)
    expect(grid?.className).toMatch(/lg:grid-cols-3/)
  })

  it('passes authed through to AddProductDialog', () => {
    render(<ProductGrid products={makeProducts(1)} authed={false} />)
    expect(screen.getByTestId('add-dialog-stub')).toHaveAttribute('data-authed', 'false')
  })

  // B1 FIX: dispatching the wrapping action produces a SkeletonCard insertion
  // into the grid within one render. This asserts the canonical React 19 wiring
  // works — useOptimistic fires at the start of the action, inside the transition.
  it('B1: dispatching the wrapping action inserts a SkeletonCard immediately', async () => {
    // addProduct returns a promise that stays pending — so the only thing happening
    // synchronously is the optimistic reducer.
    addProductMock.mockImplementation(() => new Promise(() => {}))

    render(<ProductGrid products={makeProducts(2)} authed={true} />)

    // Pre-dispatch: no skeletons, 2 real cards.
    expect(screen.queryAllByTestId('skeleton-card')).toHaveLength(0)
    expect(screen.getAllByTestId('product-card')).toHaveLength(2)

    // Dispatch the inline form's action. The wrapper <AddProductForm> in the
    // sr-only container holds the real form bound to useActionState's formAction.
    const input = screen.getByLabelText('Product URL') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'https://example.com/new' } })
    await act(async () => {
      fireEvent.submit(input.closest('form')!)
    })

    // Post-dispatch: 1 skeleton inserted at the head; real cards still present.
    await waitFor(() => {
      expect(screen.getAllByTestId('skeleton-card')).toHaveLength(1)
    })
    expect(screen.getAllByTestId('product-card')).toHaveLength(2)
    // The wrapping server call fired (addProductMock invoked once).
    expect(addProductMock).toHaveBeenCalledTimes(1)
  })
})
