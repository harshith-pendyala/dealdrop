'use client'
import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'

/**
 * Step list for the scrape-in-progress UI. `atMs` is the absolute time (in ms)
 * from the moment `pending` flips to true at which the corresponding step
 * becomes the active step. The final entry is the hold-on-last-step label —
 * if the action keeps pending past its `atMs`, the UI stays on it indefinitely.
 *
 * Tuning: step 2 ("Visiting the page") gets the largest slice because the
 * Firecrawl fetch is the longest real phase (up to ~60s).
 */
export const SCRAPE_STEPS: ReadonlyArray<{ label: string; atMs: number }> = [
  { label: 'Checking the link', atMs: 0 },
  { label: 'Visiting the page', atMs: 600 },
  { label: 'Reading the product details', atMs: 3500 },
  { label: 'Saving to your dashboard', atMs: 7000 },
  { label: 'Finishing up...', atMs: 9000 },
] as const

const COMPLETION_GRACE_MS = 250

type ScrapeProgressProps = Readonly<{
  pending: boolean
}>

/**
 * Animated step + progress-bar UI driven entirely by the parent's `pending`
 * flag from `useActionState`. Mounted in both the populated-dashboard dialog
 * and the empty-state inline form so the same UX runs across both submission
 * paths without duplicating timer logic.
 *
 * State model (intentionally avoids synchronous setState-in-effect; the eslint
 * rule `react-hooks/set-state-in-effect` is enabled in Next 16):
 *   - `currentStepIndex` is updated only from inside setTimeout callbacks
 *     (asynchronous, allowed by the rule).
 *   - "Are we visible?" is computed from `pending` plus a `hideAfterCompletion`
 *     flag flipped by the grace-period setTimeout — never set synchronously
 *     inside the effect body.
 */
export function ScrapeProgress({ pending }: ScrapeProgressProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [hideAfterCompletion, setHideAfterCompletion] = useState(true)
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const prevPendingRef = useRef(false)

  useEffect(() => {
    function clearAll() {
      for (const t of timeoutsRef.current) clearTimeout(t)
      timeoutsRef.current = []
    }

    const wasPending = prevPendingRef.current
    prevPendingRef.current = pending

    if (pending && !wasPending) {
      // Run start: schedule step transitions. The setTimeout callbacks set
      // state asynchronously — that's the supported pattern.
      clearAll()
      setCurrentStepIndex(0)
      setHideAfterCompletion(false)
      for (let i = 1; i < SCRAPE_STEPS.length; i++) {
        const handle = setTimeout(() => {
          setCurrentStepIndex(i)
        }, SCRAPE_STEPS[i].atMs)
        timeoutsRef.current.push(handle)
      }
    } else if (!pending && wasPending) {
      // Run end: clear pending step timers, schedule the unmount-after-grace.
      clearAll()
      const handle = setTimeout(() => {
        setHideAfterCompletion(true)
      }, COMPLETION_GRACE_MS)
      timeoutsRef.current.push(handle)
    }

    return clearAll
  }, [pending])

  // Visibility: render while pending, OR briefly after pending flips false
  // (until the grace-period timeout sets hideAfterCompletion=true).
  if (!pending && hideAfterCompletion) return null

  const isCompleting = !pending
  const lastIdx = SCRAPE_STEPS.length - 1
  const progressPercent = isCompleting
    ? 100
    : (currentStepIndex / lastIdx) * 100

  return (
    <div className="flex flex-col gap-3" data-testid="scrape-progress">
      <div
        role="progressbar"
        aria-valuenow={Math.round(progressPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 w-full bg-muted rounded-full overflow-hidden"
      >
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <ul className="flex flex-col gap-1.5">
        {SCRAPE_STEPS.map((step, i) => {
          const state: 'complete' | 'active' | 'upcoming' = isCompleting
            ? 'complete'
            : i < currentStepIndex
              ? 'complete'
              : i === currentStepIndex
                ? 'active'
                : 'upcoming'

          const icon =
            state === 'complete' ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : state === 'active' ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/40" />
            )

          const labelClass =
            state === 'active'
              ? 'text-sm text-foreground font-medium'
              : 'text-sm text-muted-foreground'

          return (
            <li
              key={step.label}
              data-testid={`scrape-step-${i}`}
              data-state={state}
              className="flex items-center gap-2"
            >
              {icon}
              <span className={labelClass}>{step.label}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
