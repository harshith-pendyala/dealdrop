// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Stub InlineAddProductWrapper so this test doesn't drag in the Plan 06 client module
// (useActionState, useAuthModal, addProduct action). We only assert EmptyState's own
// RSC output + that it passes authed through to the wrapper.
vi.mock('./InlineAddProductWrapper', () => ({
  InlineAddProductWrapper: (props: { authed: boolean }) => (
    <div data-testid="inline-add-product-wrapper" data-authed={String(props.authed)} />
  ),
}))

import { EmptyState } from './EmptyState'

afterEach(() => {
  cleanup()
})

describe('EmptyState', () => {
  it('renders the D-04 heading verbatim', () => {
    render(<EmptyState authed={true} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Track your first product')
  })

  it('renders the D-04 subtitle verbatim (with em-dash)', () => {
    render(<EmptyState authed={true} />)
    // Use normalized text check — the em-dash is U+2014; JSDOM renders &mdash; as that character
    expect(document.body.textContent).toContain(
      "Paste a product URL from any site \u2014 we'll check the price daily and email you when it drops."
    )
  })

  it('renders the sample URL helper hint', () => {
    render(<EmptyState authed={true} />)
    expect(document.body.textContent).toContain('e.g., https://www.amazon.com/dp/XXXXXXXXXX')
  })

  it('renders InlineAddProductWrapper and passes authed prop through', () => {
    render(<EmptyState authed={false} />)
    const wrapper = screen.getByTestId('inline-add-product-wrapper')
    expect(wrapper).toHaveAttribute('data-authed', 'false')
  })
})
