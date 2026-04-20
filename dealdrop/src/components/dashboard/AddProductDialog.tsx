'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AddProductForm, type AddProductActionResult } from './AddProductForm'

type AddProductDialogProps = Readonly<{
  authed: boolean
  // Action state supplied by parent (ProductGrid) so the dialog submit goes
  // through the same useActionState+useOptimistic wrapper that drives the
  // SkeletonCard insertion. Without sharing the action, dialog submits bypass
  // the optimistic reducer and no skeleton appears.
  formAction: (formData: FormData) => void
  state: AddProductActionResult | null
  pending: boolean
}>

export function AddProductDialog({ authed, formAction, state, pending }: AddProductDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">+ Add Product</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a product</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <AddProductForm
            authed={authed}
            formAction={formAction}
            state={state}
            pending={pending}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
