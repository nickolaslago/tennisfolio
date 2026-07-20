import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/glass/card'
import type { SurfaceWinRate } from '@/lib/api/stats'

interface WinRateBySurfaceChartProps {
  data: SurfaceWinRate[]
}

function percentLabel(value: number): string {
  return `${Math.round(value * 100)}%`
}

function TooltipContent({
  active,
  payload,
  winRateLabel,
  matchesPlayedLabel,
}: {
  active?: boolean
  payload?: { payload: SurfaceWinRate }[]
  winRateLabel: string
  matchesPlayedLabel: string
}) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="glass rounded-lg border border-glass-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{point.surface}</p>
      <p className="text-muted-foreground">
        {winRateLabel}: {point.wins}-{point.losses} ·{' '}
        {point.win_rate !== null ? percentLabel(point.win_rate) : '—'}
      </p>
      <p className="text-muted-foreground">
        {matchesPlayedLabel}: {point.matches}
      </p>
    </div>
  )
}

export function WinRateBySurfaceChart({ data }: WinRateBySurfaceChartProps) {
  const { t } = useTranslation()
  const points = data.filter((d) => d.win_rate !== null)
  const winRateLabel = t('home.winRateBySurface.winRate')
  const matchesPlayedLabel = t('home.winRateBySurface.matchesPlayed')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('home.winRateBySurface.title')}</CardTitle>
        <CardDescription>{t('home.winRateBySurface.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {points.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {t('home.winRateBySurface.empty')}
          </p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={points} margin={{ top: 20, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="surface"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                />
                <YAxis
                  yAxisId="winRate"
                  domain={[0, 1]}
                  tickFormatter={percentLabel}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                />
                <YAxis
                  yAxisId="matches"
                  orientation="right"
                  allowDecimals={false}
                  domain={[0, (max: number) => Math.max(4, Math.ceil(max * 1.4))]}
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
                  cursor={{ fill: 'var(--border)', fillOpacity: 0.3 }}
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
                  yAxisId="winRate"
                  dataKey="win_rate"
                  name={winRateLabel}
                  fill="var(--chart-2)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={56}
                >
                  <LabelList
                    dataKey="win_rate"
                    position="top"
                    formatter={(value: unknown) => percentLabel(Number(value))}
                    fill="var(--foreground)"
                    fontSize={12}
                  />
                </Bar>
                <Bar
                  yAxisId="matches"
                  dataKey="matches"
                  name={matchesPlayedLabel}
                  fill="var(--muted-foreground)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
