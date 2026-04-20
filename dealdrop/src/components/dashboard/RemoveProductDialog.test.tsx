// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const removeProductMock = vi.fn()
const toastSuccess = vi.fn()
const toastError = vi.fn()

vi.mock('@/actions/products', () => ({
  removeProduct: (id: string) => removeProductMock(id),
}))
vi.mock('sonner', () => ({
  toast: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) },
}))

import { RemoveProductDialog } from './RemoveProductDialog'

afterEach(() => {
  cleanup()
})

describe('RemoveProductDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('DASH-06: renders the trigger button with Remove product aria-label', () => {
    render(<RemoveProductDialog productId="p1" />)
    expect(screen.getByRole('button', { name: 'Remove product' })).toBeTruthy()
  })

  it('DASH-06: opens AlertDialog when trigger clicked', async () => {
    render(<RemoveProductDialog productId="p1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove product' }))
    await waitFor(() => {
      expect(screen.getByText('Remove this product?')).toBeTruthy()
      expect(screen.getByText('Its price history will be deleted.')).toBeTruthy()
    })
  })

  it('DASH-07: confirm click invokes removeProduct(productId) and fires success toast', async () => {
    removeProductMock.mockResolvedValue({ ok: true })
    render(<RemoveProductDialog productId="p42" />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove product' }))
    await waitFor(() => screen.getByRole('button', { name: 'Remove' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    await waitFor(() => {
      expect(removeProductMock).toHaveBeenCalledWith('p42')
      expect(toastSuccess).toHaveBeenCalledWith('Product removed.')
    })
  })

  it('DASH-07: confirm click on server error fires error toast (not success)', async () => {
    removeProductMock.mockResolvedValue({ ok: false })
    render(<RemoveProductDialog productId="p42" />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove product' }))
    await waitFor(() => screen.getByRole('button', { name: 'Remove' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Couldn't remove that product. Try again.")
      expect(toastSuccess).not.toHaveBeenCalled()
    })
  })
})
