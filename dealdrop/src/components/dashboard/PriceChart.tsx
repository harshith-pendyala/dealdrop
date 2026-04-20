'use client'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import type { PricePoint } from '@/lib/products/get-user-products'

type Props = Readonly<{ history: PricePoint[]; currency: string }>

export function yTickFormatter(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${currency} ${Math.round(value)}`
  }
}

export function xTickFormatter(value: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function fullPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

function fullDate(value: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(value))
  } catch {
    return value
  }
}

type TooltipProps = {
  active?: boolean
  payload?: { value: number }[]
  label?: string
  currency: string
}

function PriceTooltip({ active, payload, label, currency }: TooltipProps) {
  if (!active || !payload?.length) return null
  const price = payload[0].value
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '8px 12px',
        color: 'var(--foreground)',
      }}
    >
      <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{fullDate(label ?? '')}</p>
      <p style={{ fontSize: 14, margin: 0 }}>{fullPrice(price, currency)}</p>
    </div>
  )
}

export function PriceChart({ history, currency }: Props) {
  // Defensive empty-state — TRACK-06 seeds the initial row atomically with
  // product creation, so this branch should not fire in practice. Matches the
  // existing ProductCard placeholder class pattern (min-h-[200px] bg-muted rounded-lg).
  if (history.length === 0) {
    return (
      <div className="min-h-[200px] bg-muted rounded-lg flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No price history yet.</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={history} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <XAxis
          dataKey="checked_at"
          tickFormatter={xTickFormatter}
          tick={{ fontSize: 14, fill: 'var(--muted-foreground)' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(value: number) => yTickFormatter(value, currency)}
          tick={{ fontSize: 14, fill: 'var(--muted-foreground)' }}
          domain={['auto', 'auto']}
          width={60}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<PriceTooltip currency={currency} />} />
        <Line
          type="monotone"
          dataKey="price"
          stroke="var(--primary)"
          strokeWidth={2}
          dot={history.length === 1 ? { r: 4, fill: 'var(--card)', stroke: 'var(--primary)', strokeWidth: 2 } : false}
          activeDot={{ r: 4, fill: 'var(--primary)' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
