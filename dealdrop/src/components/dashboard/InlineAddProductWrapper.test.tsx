// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

afterEach(() => {
  cleanup()
})

// vi.hoisted() runs before vi.mock() factories are hoisted, so these values
// are available inside the mock factory below.
const { mockFormAction, useActionStateSpy } = vi.hoisted(() => {
  const mockFormAction = vi.fn()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const useActionStateSpy: (...args: any[]) => any = vi.fn(() => [null, mockFormAction, false])
  return { mockFormAction, useActionStateSpy }
})

// Stub useActionState via react so we can inject deterministic values.
// Then stub AddProductForm so we can assert the wrapper forwards formAction + state + pending.
vi.mock('@/actions/products', () => ({
  addProduct: vi.fn(),
}))

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    useActionState: useActionStateSpy,
  }
})

vi.mock('./AddProductForm', () => ({
  AddProductForm: (props: {
    authed: boolean
    formAction: (fd: FormData) => void
    state: unknown
    pending: boolean
    onSuccess?: () => void
  }) => (
    <form
      data-testid="inner-form"
      data-authed={String(props.authed)}
      data-pending={String(props.pending)}
      data-has-formaction={String(typeof props.formAction === 'function')}
    >
      AddProductForm-stub
    </form>
  ),
}))

import { InlineAddProductWrapper } from './InlineAddProductWrapper'

describe('InlineAddProductWrapper', () => {
  it('B-NEW: renders the inner AddProductForm and propagates formAction', () => {
    render(<InlineAddProductWrapper authed={true} />)
    const form = screen.getByTestId('inner-form')
    expect(form).toBeTruthy()
    // formAction MUST be a function (NOT undefined — if it were undefined, the
    // empty-state add path would be broken, exactly the B-NEW regression.)
    expect(form).toHaveAttribute('data-has-formaction', 'true')
    // authed + pending propagated correctly.
    expect(form).toHaveAttribute('data-authed', 'true')
    expect(form).toHaveAttribute('data-pending', 'false')
  })

  it('B-NEW: passes authed=false through to AddProductForm (unauth empty-state path)', () => {
    render(<InlineAddProductWrapper authed={false} />)
    const form = screen.getByTestId('inner-form')
    expect(form).toHaveAttribute('data-authed', 'false')
    expect(form).toHaveAttribute('data-has-formaction', 'true')
  })
})
