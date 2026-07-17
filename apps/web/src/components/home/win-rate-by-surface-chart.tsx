import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { SurfaceWinRate } from '@/lib/api/stats'

interface WinRateBySurfaceChartProps {
  data: SurfaceWinRate[]
}

function percentLabel(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function WinRateBySurfaceChart({ data }: WinRateBySurfaceChartProps) {
  const { t } = useTranslation()
  const points = data.filter((d) => d.win_rate !== null)

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
                  domain={[0, 1]}
                  tickFormatter={percentLabel}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                />
                <Bar dataKey="win_rate" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={56}>
                  <LabelList
                    dataKey="win_rate"
                    position="top"
                    formatter={(value: unknown) => percentLabel(Number(value))}
                    fill="var(--foreground)"
                    fontSize={12}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
