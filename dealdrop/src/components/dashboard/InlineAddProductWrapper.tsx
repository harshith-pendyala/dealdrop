'use client'
import { useActionState, useEffect, useRef } from 'react'
import { addProduct } from '@/actions/products'
import {
  AddProductForm,
  dispatchToastForState,
  type AddProductActionResult,
} from './AddProductForm'
import { ScrapeProgress } from './ScrapeProgress'

type InlineAddProductWrapperProps = Readonly<{
  authed: boolean
  onSuccess?: () => void
}>

/**
 * Empty-state client boundary consumed by EmptyState (Plan 05).
 *
 * Why own useActionState here (and not in EmptyState):
 *   EmptyState is an RSC. Post-B1, AddProductForm is a pure renderer that requires
 *   formAction + state + pending from the caller. RSCs cannot call useActionState,
 *   so we need a client-boundary wrapper. This is the empty-state analogue of
 *   AddProductDialog's internal wrapper and ProductGrid's wrapper (Plan 07).
 *
 * Why no optimistic UI here:
 *   The empty-state path has no grid to prepend a skeleton into. On {ok:true}, the
 *   Server Action calls revalidatePath('/'); DashboardShell re-renders, EmptyState
 *   is replaced by ProductGrid, and the added product appears as a real ProductCard.
 *   An optimistic skeleton inside EmptyState would only flash for the window between
 *   submit and response, and would require a custom render branch that EmptyState
 *   doesn't have. Cheaper to let the server re-render happen.
 */
export function InlineAddProductWrapper({ authed, onSuccess }: InlineAddProductWrapperProps) {
  const initial: AddProductActionResult | null = null
  const [state, formAction, pending] = useActionState(addProduct, initial)

  // Toast dispatch lives here (not in AddProductForm) so two AddProductForm
  // instances sharing one state can't double-fire. Ref-dedupe on state identity.
  const lastToastedStateRef = useRef<AddProductActionResult | null>(null)
  useEffect(() => {
    if (state === lastToastedStateRef.current) return
    lastToastedStateRef.current = state
    dispatchToastForState(state)
  }, [state])

  return (
    <>
      <AddProductForm
        authed={authed}
        formAction={formAction}
        state={state}
        pending={pending}
        onSuccess={onSuccess}
      />
      <div className="mt-4">
        <ScrapeProgress pending={pending} />
      </div>
    </>
  )
}
