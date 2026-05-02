'use client'
import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthModal } from '@/components/auth/AuthModalProvider'
import { toastMessageForReason } from '@/lib/firecrawl/toast-messages'
import type { AddProductResult } from '@/actions/products'

const PENDING_KEY = 'dealdrop:pending-add-url'

// Re-export a typed alias so callers/tests can rely on a local name.
export type AddProductActionResult = AddProductResult

// Map of failure reasons to toast copy. Single source of truth for dispatchToastForState.
// Delegates to toastMessageForReason (Plan 03) — do NOT duplicate copy strings here.
export const REASON_TO_TOAST = {
  get invalid_url()       { return toastMessageForReason('invalid_url') },
  get network_error()     { return toastMessageForReason('network_error') },
  get scrape_timeout()    { return toastMessageForReason('scrape_timeout') },
  get missing_price()     { return toastMessageForReason('missing_price') },
  get missing_name()      { return toastMessageForReason('missing_name') },
  get invalid_currency()  { return toastMessageForReason('invalid_currency') },
  get duplicate_url()     { return toastMessageForReason('duplicate_url') },
  get unauthenticated()   { return toastMessageForReason('unauthenticated') },
  get db_error()          { return toastMessageForReason('db_error') },
  get unknown()           { return toastMessageForReason('unknown') },
} as const

/**
 * Pure toast-dispatcher for an action result. Extracted from the component so it
 * is directly unit-testable (B2 fix) without needing to drive the action state hook.
 *
 * Semantics:
 *   - null           → no-op (no toast)
 *   - { ok: true }   → toast.success('Now tracking')
 *   - { ok: false }  → toast.error(REASON_TO_TOAST[state.reason])
 */
export function dispatchToastForState(state: AddProductActionResult | null): void {
  if (!state) return
  if (state.ok) {
    toast.success('Now tracking')
  } else {
    toast.error(REASON_TO_TOAST[state.reason])
  }
}

type AddProductFormProps = Readonly<{
  authed: boolean
  // Callers provide the action + state + pending from their own wrapper.
  // This keeps optimistic wiring inside the caller's transition boundary (B1 fix).
  formAction: (formData: FormData) => void
  state: AddProductActionResult | null
  pending: boolean
  onSuccess?: () => void
}>

export function AddProductForm({ authed, formAction, state, pending, onSuccess }: AddProductFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const { openAuthModal } = useAuthModal()

  // Ref-dedupe: only react to state identity changes, regardless of how many times
  // the parent re-renders with a new onSuccess reference. Initialize the ref to the
  // current state at mount so a Dialog re-open (which unmounts+remounts this form)
  // doesn't treat a persisted `{ ok: true }` from a prior submit as a new transition
  // and fire onSuccess immediately — that bug closed the dialog on re-open.
  const lastHandledStateRef = useRef<AddProductActionResult | null>(state)
  const onSuccessRef = useRef(onSuccess)
  useEffect(() => {
    onSuccessRef.current = onSuccess
  }, [onSuccess])

  useEffect(() => {
    if (state === lastHandledStateRef.current) return
    lastHandledStateRef.current = state
    if (state?.ok) {
      onSuccessRef.current?.()
      formRef.current?.reset()
    }
  }, [state])

  // D-03: on mount, if authed AND sessionStorage has a pending URL, auto-submit.
  useEffect(() => {
    if (!authed) return
    if (typeof window === 'undefined') return
    const pendingUrl = window.sessionStorage.getItem(PENDING_KEY)
    if (!pendingUrl) return
    window.sessionStorage.removeItem(PENDING_KEY)
    const form = formRef.current
    if (!form) return
    const input = form.elements.namedItem('url') as HTMLInputElement | null
    if (!input) return
    input.value = pendingUrl
    form.requestSubmit()
  }, [authed])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (authed) {
      // Authed path: allow the <form action={formAction}> behavior to proceed.
      return
    }
    // Unauth branch — D-03. Short-circuit: stash + open modal, do NOT submit.
    e.preventDefault()
    const url = (e.currentTarget.elements.namedItem('url') as HTMLInputElement).value
    if (!url) return
    window.sessionStorage.setItem(PENDING_KEY, url)
    openAuthModal()
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 w-full"
    >
      <Label htmlFor="add-product-url" className="sr-only">Product URL</Label>
      <div className="flex gap-2 w-full">
        <Input
          id="add-product-url"
          name="url"
          type="text"
          required
          placeholder="https://example.com/product"
          className="flex-1"
          autoComplete="off"
        />
        <Button type="submit" variant="default" disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Track Price
        </Button>
      </div>
    </form>
  )
}
