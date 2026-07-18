import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Card, CardContent } from '@/components/glass/card'
import { cn } from '@/lib/utils'

interface StatTileProps {
  label: string
  value: ReactNode
  description?: ReactNode
  icon: LucideIcon
  tone?: 'neutral' | 'win' | 'loss'
}

const TONE_ICON_CLASS: Record<NonNullable<StatTileProps['tone']>, string> = {
  neutral: 'bg-muted text-foreground',
  win: 'bg-win/10 text-win',
  loss: 'bg-loss/10 text-loss',
}

/** A single KPI figure — label, value, and an optional supporting line. */
export function StatTile({
  label,
  value,
  description,
  icon: Icon,
  tone = 'neutral',
}: StatTileProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="font-heading text-2xl font-semibold tracking-tight">{value}</span>
          {description ? (
            <span className="text-xs text-muted-foreground">{description}</span>
          ) : null}
        </div>
        <span
          aria-hidden="true"
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full',
            TONE_ICON_CLASS[tone],
          )}
        >
          <Icon className="size-4.5" />
        </span>
      </CardContent>
    </Card>
  )
}
