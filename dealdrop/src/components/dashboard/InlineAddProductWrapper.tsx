'use client'
// STUB — Plan 06 Task 1 overwrites this file with the real useActionState wrapper.
// Mirrors the RemoveProductDialog stub/overwrite pattern in this same plan.
// Until Plan 06 lands, rendering InlineAddProductWrapper produces nothing — EmptyState
// still renders its heading + subtitle + sample-URL hint, so visual layout is preserved
// in the interim. Plan 06 replaces this with a real AddProductForm-bearing wrapper.

type InlineAddProductWrapperProps = Readonly<{
  authed: boolean
  onSuccess?: () => void
}>

export function InlineAddProductWrapper(_props: InlineAddProductWrapperProps) {
  return null
}
