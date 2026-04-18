// TEMPORARY — delete after Phase 1 gate (Task 5 of plan 01-05)
import { Button } from '@/components/ui/button'

export default function ShadcnTest() {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Shadcn UI Test</h1>
      <div className="flex flex-wrap gap-3">
        <Button variant="default">Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
    </div>
  )
}
