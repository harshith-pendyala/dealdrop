// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

afterEach(() => {
  cleanup()
})

// Mock toast + auth modal + toast-messages BEFORE import.
const toastSuccess = vi.fn()
const toastError = vi.fn()
const openAuthModal = vi.fn()

vi.mock('sonner', () => ({
  toast: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) },
}))
vi.mock('@/components/auth/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal, isOpen: false, setOpen: vi.fn() }),
}))

import { AddProductForm, dispatchToastForState, REASON_TO_TOAST } from './AddProductForm'

describe('AddProductForm (pure renderer)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
  })

  it('TRACK-02: renders a form with a URL input and Track button', () => {
    const noop = vi.fn()
    render(
      <AddProductForm authed={true} formAction={noop} state={null} pending={false} />,
    )
    expect(screen.getByLabelText('Product URL')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Track/i })).toBeTruthy()
  })

  it('AUTH-04 / D-03: unauth submit stashes URL to sessionStorage and calls openAuthModal (action NOT called)', () => {
    const formAction = vi.fn()
    render(
      <AddProductForm authed={false} formAction={formAction} state={null} pending={false} />,
    )
    const input = screen.getByLabelText('Product URL') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'https://example.com/x' } })
    fireEvent.submit(input.closest('form')!)
    expect(window.sessionStorage.getItem('dealdrop:pending-add-url')).toBe('https://example.com/x')
    expect(openAuthModal).toHaveBeenCalledTimes(1)
    // formAction must NOT be invoked in the unauth branch
    expect(formAction).not.toHaveBeenCalled()
  })

  it('D-03 auto-submit: on mount with authed=true AND sessionStorage pending, reads + clears + requestSubmit', async () => {
    window.sessionStorage.setItem('dealdrop:pending-add-url', 'https://example.com/pending')
    const requestSubmitSpy = vi.spyOn(HTMLFormElement.prototype, 'requestSubmit').mockImplementation(() => {})
    const noop = vi.fn()
    render(
      <AddProductForm authed={true} formAction={noop} state={null} pending={false} />,
    )
    await waitFor(() => {
      expect(window.sessionStorage.getItem('dealdrop:pending-add-url')).toBeNull()
    })
    expect(requestSubmitSpy).toHaveBeenCalledTimes(1)
    requestSubmitSpy.mockRestore()
  })

  it('D-03 auto-submit: does nothing when authed=false (even with pending URL)', () => {
    window.sessionStorage.setItem('dealdrop:pending-add-url', 'https://example.com/pending')
    const requestSubmitSpy = vi.spyOn(HTMLFormElement.prototype, 'requestSubmit').mockImplementation(() => {})
    const noop = vi.fn()
    render(
      <AddProductForm authed={false} formAction={noop} state={null} pending={false} />,
    )
    expect(requestSubmitSpy).not.toHaveBeenCalled()
    expect(window.sessionStorage.getItem('dealdrop:pending-add-url')).toBe('https://example.com/pending')
    requestSubmitSpy.mockRestore()
  })
})

// B2 FIX: direct unit coverage of toast dispatch. Target: the -t "toast" grep in
// VALIDATION.md must match a real test.
describe('dispatchToastForState (toast dispatcher)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('toast: null state is a no-op (neither success nor error)', () => {
    dispatchToastForState(null)
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
  })

  it('toast: { ok: true } fires toast.success once with "Product added!"', () => {
    dispatchToastForState({ ok: true })
    expect(toastSuccess).toHaveBeenCalledTimes(1)
    expect(toastSuccess).toHaveBeenCalledWith('Product added!')
    expect(toastError).not.toHaveBeenCalled()
  })

  it('toast: { ok: false, reason: "duplicate_url" } fires toast.error with REASON_TO_TOAST["duplicate_url"]', () => {
    dispatchToastForState({ ok: false, reason: 'duplicate_url' })
    expect(toastError).toHaveBeenCalledTimes(1)
    expect(toastError).toHaveBeenCalledWith(REASON_TO_TOAST.duplicate_url)
    expect(toastError).toHaveBeenCalledWith("You're already tracking this product.")
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it('toast: { ok: false, reason: "invalid_url" } fires toast.error with REASON_TO_TOAST["invalid_url"]', () => {
    dispatchToastForState({ ok: false, reason: 'invalid_url' })
    expect(toastError).toHaveBeenCalledWith(REASON_TO_TOAST.invalid_url)
  })

  it('toast: { ok: false, reason: "db_error" } fires toast.error with REASON_TO_TOAST["db_error"]', () => {
    dispatchToastForState({ ok: false, reason: 'db_error' })
    expect(toastError).toHaveBeenCalledWith(REASON_TO_TOAST.db_error)
  })

  it('toast: { ok: false, reason: "unauthenticated" } fires toast.error with REASON_TO_TOAST["unauthenticated"]', () => {
    dispatchToastForState({ ok: false, reason: 'unauthenticated' })
    expect(toastError).toHaveBeenCalledWith(REASON_TO_TOAST.unauthenticated)
  })
})
