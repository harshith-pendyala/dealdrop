'use client'
import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { addProduct } from '@/actions/products'
import { AddProductForm, type AddProductActionResult } from './AddProductForm'

type AddProductDialogProps = Readonly<{ authed: boolean }>

export function AddProductDialog({ authed }: AddProductDialogProps) {
  const [open, setOpen] = useState(false)
  const initial: AddProductActionResult | null = null
  const [state, formAction, pending] = useActionState(addProduct, initial)

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
