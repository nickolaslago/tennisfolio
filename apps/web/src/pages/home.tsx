import { CalendarRange, Flame, Plus, Target, Trophy } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { ErrorState } from '@/components/data/query-state'
import { NextEvents } from '@/components/home/next-events'
import { RecentMatchesStrip } from '@/components/home/recent-matches-strip'
import { ResultsDistributionChart } from '@/components/home/results-distribution-chart'
import { StatTile } from '@/components/home/stat-tile'
import { WinRateBySurfaceChart } from '@/components/home/win-rate-by-surface-chart'
import { WinRateOverTimeChart } from '@/components/home/win-rate-over-time-chart'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useMatches } from '@/hooks/use-matches'
import {
  useStreaks,
  useTiebreaks,
  useWinRate,
  useWinRateByPeriod,
  useWinRateBySurface,
} from '@/hooks/use-stats'
import { useDocumentTitle } from '@/lib/use-document-title'

function seasonStart(): string {
  return `${new Date().getFullYear()}-01-01`
}

function formatPercent(value: number | null): string {
  return value !== null ? `${Math.round(value * 100)}%` : '—'
}

function EmptyHome() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome to Tennisfolio 🎾</CardTitle>
        <CardDescription>
          Your performance dashboard lands here as soon as you've logged a match — win rate,
          streaks, charts, and what's next.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild size="sm">
          <Link to="/matches/new">
            <Plus aria-hidden="true" data-icon="inline-start" />
            Log your first match
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export function HomePage() {
  useDocumentTitle('Home')

  const anyMatches = useMatches({ limit: 1 })
  const winRate = useWinRate()
  const seasonFilters = useMemo(() => ({ date_from: seasonStart() }), [])
  const seasonWinRate = useWinRate(seasonFilters)
  const streaks = useStreaks()
  const tiebreaks = useTiebreaks()
  const winRateByPeriod = useWinRateByPeriod('month')
  const winRateBySurface = useWinRateBySurface()

  const hasMatches = (anyMatches.data?.total ?? 0) > 0

  return (
    <>
      <PageHeader
        title="Home"
        description="Your tennis portfolio at a glance — recent matches, form, and what's next."
      />

      {anyMatches.isPending ? null : anyMatches.isError ? (
        <ErrorState error={anyMatches.error} onRetry={() => void anyMatches.refetch()} />
      ) : !hasMatches ? (
        <EmptyHome />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Overall win rate"
              icon={Trophy}
              tone="win"
              value={winRate.isPending ? '—' : formatPercent(winRate.data?.win_rate ?? null)}
              description={winRate.data ? `${winRate.data.wins}-${winRate.data.losses}` : undefined}
            />
            <StatTile
              label="Current streak"
              icon={Flame}
              tone={
                streaks.data?.current_streak_type === 'Win'
                  ? 'win'
                  : streaks.data?.current_streak_type === 'Loss'
                    ? 'loss'
                    : 'neutral'
              }
              value={
                streaks.isPending
                  ? '—'
                  : streaks.data?.current_streak_length
                    ? `${streaks.data.current_streak_length}${streaks.data.current_streak_type === 'Win' ? 'W' : 'L'}`
                    : '—'
              }
              description="Consecutive results"
            />
            <StatTile
              label="Matches this season"
              icon={CalendarRange}
              value={seasonWinRate.isPending ? '—' : (seasonWinRate.data?.matches ?? 0)}
              description={new Date().getFullYear().toString()}
            />
            <StatTile
              label="Tiebreak record"
              icon={Target}
              value={
                tiebreaks.isPending ? '—' : `${tiebreaks.data?.wins ?? 0}-${tiebreaks.data?.losses ?? 0}`
              }
              description={tiebreaks.data ? formatPercent(tiebreaks.data.win_rate) : undefined}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <WinRateOverTimeChart data={winRateByPeriod.data ?? []} />
            <WinRateBySurfaceChart data={winRateBySurface.data ?? []} />
          </div>

          {winRate.data ? <ResultsDistributionChart data={winRate.data} /> : null}

          <NextEvents />

          <RecentMatchesStrip />
        </div>
      )}
    </>
  )
}
