import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { PeriodWinRate } from '@/lib/api/stats'

interface WinRateOverTimeChartProps {
  data: PeriodWinRate[]
}

function formatPeriod(period: string): string {
  const [year, month] = period.split('-')
  if (!month) return period
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
}

function TooltipContent({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: PeriodWinRate }[]
}) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{formatPeriod(point.period)}</p>
      <p className="text-muted-foreground">
        {point.wins}-{point.losses} ·{' '}
        {point.win_rate !== null ? `${Math.round(point.win_rate * 100)}%` : '—'}
      </p>
    </div>
  )
}

export function WinRateOverTimeChart({ data }: WinRateOverTimeChartProps) {
  const { t } = useTranslation()
  const points = data.filter((d) => d.win_rate !== null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('home.winRateOverTime.title')}</CardTitle>
        <CardDescription>{t('home.winRateOverTime.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {points.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {t('home.winRateOverTime.empty')}
          </p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="period"
                  tickFormatter={formatPeriod}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  minTickGap={24}
                />
                <YAxis
                  domain={[0, 1]}
                  tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                />
                <Tooltip content={<TooltipContent />} cursor={{ stroke: 'var(--border)' }} />
                <Line
                  type="monotone"
                  dataKey="win_rate"
                  stroke="var(--win)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: 'var(--win)', stroke: 'var(--card)', strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: 'var(--win)', stroke: 'var(--card)', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
