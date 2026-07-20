import {
  Bar,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/glass/card'
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
  winRateLabel,
  matchesPlayedLabel,
}: {
  active?: boolean
  payload?: { payload: PeriodWinRate }[]
  winRateLabel: string
  matchesPlayedLabel: string
}) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="glass rounded-lg border border-glass-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{formatPeriod(point.period)}</p>
      <p className="text-muted-foreground">
        {winRateLabel}: {point.wins}-{point.losses} ·{' '}
        {point.win_rate !== null ? `${Math.round(point.win_rate * 100)}%` : '—'}
      </p>
      <p className="text-muted-foreground">
        {matchesPlayedLabel}: {point.matches}
      </p>
    </div>
  )
}

export function WinRateOverTimeChart({ data }: WinRateOverTimeChartProps) {
  const { t } = useTranslation()
  const points = data.filter((d) => d.win_rate !== null)
  const winRateLabel = t('home.winRateOverTime.winRate')
  const matchesPlayedLabel = t('home.winRateOverTime.matchesPlayed')

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
              <ComposedChart data={points} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="period"
                  tickFormatter={formatPeriod}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  minTickGap={24}
                />
                <YAxis
                  yAxisId="winRate"
                  domain={[0, 1]}
                  tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                />
                <YAxis
                  yAxisId="matches"
                  orientation="right"
                  allowDecimals={false}
                  domain={[0, (max: number) => Math.max(4, Math.ceil(max * 1.5))]}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                />
                <Tooltip
                  content={
                    <TooltipContent
                      winRateLabel={winRateLabel}
                      matchesPlayedLabel={matchesPlayedLabel}
                    />
                  }
                  cursor={{ stroke: 'var(--border)' }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={24}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, color: 'var(--muted-foreground)' }}
                />
                <Bar
                  yAxisId="matches"
                  dataKey="matches"
                  name={matchesPlayedLabel}
                  fill="var(--muted-foreground)"
                  fillOpacity={0.18}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={24}
                />
                <Line
                  yAxisId="winRate"
                  type="monotone"
                  dataKey="win_rate"
                  name={winRateLabel}
                  stroke="var(--win)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: 'var(--win)', stroke: 'var(--card)', strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: 'var(--win)', stroke: 'var(--card)', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
