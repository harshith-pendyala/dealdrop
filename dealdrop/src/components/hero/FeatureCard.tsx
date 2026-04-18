import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'

type FeatureCardProps = Readonly<{
  icon: LucideIcon
  title: string
  blurb: string
}>

export function FeatureCard({ icon: Icon, title, blurb }: FeatureCardProps) {
  return (
    <Card className="p-6 text-left">
      <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
      <h3 className="mt-4 text-xl font-semibold leading-snug">{title}</h3>
      <p className="mt-2 text-base leading-relaxed text-muted-foreground">{blurb}</p>
    </Card>
  )
}
