import { Card } from '@/components/ui/card'

export function SkeletonCard() {
  return (
    <Card
      className="flex flex-col h-full animate-pulse overflow-hidden p-0 gap-0"
      aria-hidden="true"
    >
      <div className="aspect-[4/3] bg-muted" />
      <div className="p-4 flex flex-col gap-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="h-6 bg-muted rounded w-1/3 mt-2" />
      </div>
      <div className="px-4 pb-4 flex gap-2">
        <div className="h-8 bg-muted rounded w-24" />
        <div className="h-8 bg-muted rounded w-24" />
      </div>
    </Card>
  )
}
