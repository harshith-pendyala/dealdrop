import { InlineAddProductWrapper } from './InlineAddProductWrapper'

type EmptyStateProps = Readonly<{ authed: boolean }>

export function EmptyState({ authed }: EmptyStateProps) {
  return (
    <section className="flex flex-col items-center text-center gap-4">
      <h1 className="text-xl font-semibold leading-snug">Track your first product</h1>
      <p className="text-base leading-relaxed text-muted-foreground max-w-xl">
        Paste a product URL from any site &mdash; we&apos;ll check the price daily and email you when it drops.
      </p>
      <div className="w-full max-w-md">
        <InlineAddProductWrapper authed={authed} />
      </div>
      <p className="text-sm text-muted-foreground">
        e.g., https://www.amazon.com/dp/XXXXXXXXXX
      </p>
    </section>
  )
}
