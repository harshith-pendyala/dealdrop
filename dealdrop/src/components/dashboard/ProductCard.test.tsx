// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Stub next/image to a plain img so we don't pull the Next.js runtime.
vi.mock('next/image', () => ({
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}))

// Stub RemoveProductDialog to avoid pulling the action + AlertDialog here.
vi.mock('./RemoveProductDialog', () => ({
  RemoveProductDialog: (props: { productId: string }) => (
    <button aria-label="Remove product" data-testid="remove-stub" data-id={props.productId} />
  ),
}))

import { ProductCard } from './ProductCard'
import type { Product } from '@/lib/products/get-user-products'

afterEach(() => {
  cleanup()
})

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    user_id: 'u1',
    url: 'https://example.com/product',
    name: 'Test Product',
    current_price: 19.99,
    currency: 'USD',
    image_url: 'https://cdn/x.jpg',
    created_at: '2026-04-20T00:00:00Z',
    updated_at: '2026-04-20T00:00:00Z',
    last_scrape_failed_at: null,
    ...overrides,
  } as Product
}

describe('ProductCard', () => {
  it('DASH-03: formats price via Intl with stored currency (USD)', () => {
    render(<ProductCard product={makeProduct({ current_price: 19.99, currency: 'USD' })} />)
    // Accept either '$19.99' or 'US$19.99' depending on locale, but GBP formatting should NOT appear
    expect(document.body.textContent).toMatch(/\$19\.99|US\$19\.99/)
    expect(document.body.textContent).not.toMatch(/£|GBP 19/)
  })

  it('DASH-03: formats price via Intl with stored currency (GBP)', () => {
    render(<ProductCard product={makeProduct({ current_price: 1299, currency: 'GBP' })} />)
    // In en-US locale Intl renders £1,299.00 for GBP
    expect(document.body.textContent).toMatch(/£1,299\.00|GBP.*1,299\.00/)
  })

  it('DASH-05: View Product link has target=_blank and rel=noopener noreferrer', () => {
    render(<ProductCard product={makeProduct({ url: 'https://example.com/widget' })} />)
    const link = screen.getByRole('link', { name: /View Product/i })
    expect(link).toHaveAttribute('href', 'https://example.com/widget')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('DASH-04: Show Chart toggle flips aria-expanded and label', () => {
    render(<ProductCard product={makeProduct()} />)
    const btn = screen.getByRole('button', { name: /Show Chart/ })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(btn)
    const btnAfter = screen.getByRole('button', { name: /Hide Chart/ })
    expect(btnAfter).toHaveAttribute('aria-expanded', 'true')
  })

  it('DASH-08: failed badge renders when last_scrape_failed_at is non-null', () => {
    render(
      <ProductCard
        product={makeProduct({ last_scrape_failed_at: '2026-04-19T12:00:00Z' })}
      />,
    )
    expect(screen.getByText('Tracking failed')).toBeInTheDocument()
  })

  it('DASH-08: failed badge does NOT render when last_scrape_failed_at is null', () => {
    render(<ProductCard product={makeProduct({ last_scrape_failed_at: null })} />)
    expect(screen.queryByText('Tracking failed')).not.toBeInTheDocument()
  })

  it('falls back to placeholder SVG when image_url is null', () => {
    render(<ProductCard product={makeProduct({ image_url: null })} />)
    const img = screen.getByAltText('Test Product') as HTMLImageElement
    expect(img.src).toContain('/placeholder-product.svg')
  })
})
