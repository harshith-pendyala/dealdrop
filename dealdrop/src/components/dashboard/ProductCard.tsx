'use client'
import { useState } from 'react'
import Image from 'next/image'
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RemoveProductDialog } from './RemoveProductDialog'
import type { Product } from '@/lib/products/get-user-products'

type ProductCardProps = Readonly<{ product: Product }>

export function ProductCard({ product }: ProductCardProps) {
  const [chartOpen, setChartOpen] = useState(false)
  return (
    <Card className="flex flex-col h-full overflow-hidden p-0 gap-0">
      <div className="aspect-[4/3] bg-muted">
        <Image
          src={product.image_url ?? '/placeholder-product.svg'}
          alt={product.name}
          width={400}
          height={300}
          className="object-contain w-full h-full"
        />
      </div>
      <div className="flex flex-col flex-1 p-4 gap-2">
        <p className="text-base font-semibold line-clamp-2">{product.name}</p>
        <p className="text-xl font-semibold">
          {formatPrice(product.current_price, product.currency)}
        </p>
        {product.last_scrape_failed_at !== null && (
          <Badge variant="destructive">Tracking failed</Badge>
        )}
      </div>
      <div className="flex items-center justify-between px-4 pb-4">
        <Button variant="ghost" size="sm" asChild>
          <a href={product.url} target="_blank" rel="noopener noreferrer">
            View Product <ExternalLink className="h-4 w-4 ml-1" />
          </a>
        </Button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={chartOpen}
            onClick={() => setChartOpen((v) => !v)}
          >
            {chartOpen ? 'Hide Chart' : 'Show Chart'}
            {chartOpen ? (
              <ChevronUp className="h-4 w-4 ml-1" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-1" />
            )}
          </Button>
          <RemoveProductDialog productId={product.id} />
        </div>
      </div>
      {chartOpen && (
        <div className="px-4 pb-4">
          <div
            className="min-h-[200px] bg-muted rounded-lg"
            aria-hidden="true"
          />
        </div>
      )}
    </Card>
  )
}

function formatPrice(amount: number, code: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(amount)
  } catch {
    return `${code} ${amount.toFixed(2)}`
  }
}
