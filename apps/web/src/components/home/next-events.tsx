import { CalendarClock, ChevronRight, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { EntityIcon } from '@/components/data/entity-icon'
import { ErrorState, LoadingState } from '@/components/data/query-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/glass/card'
import { useMatches } from '@/hooks/use-matches'
import { useOpponents } from '@/hooks/use-opponents'
import { useTournaments } from '@/hooks/use-tournaments'
import { cn } from '@/lib/utils'

const todayIso = () => new Date().toISOString().slice(0, 10)

function UpcomingMatches() {
  const { t } = useTranslation()
  const today = todayIso()
  const matches = useMatches({ status: 'scheduled', date_from: today, limit: 100 })
  const opponents = useOpponents()

  const opponentsById = new Map((opponents.data?.items ?? []).map((o) => [o.id, o]))

  function opponentLabel(
    opponent: { name: string | null; last_name: string } | undefined,
    id: number,
  ) {
    if (!opponent) return t('home.opponentFallback', { id })
    return opponent.name ? `${opponent.name} ${opponent.last_name}` : opponent.last_name
  }

  const upcoming = [...(matches.data?.items ?? [])]
    .sort((a, b) => a.match_date.localeCompare(b.match_date))
    .slice(0, 5)

  if (matches.isPending) return <LoadingState />
  if (matches.isError)
    return <ErrorState error={matches.error} onRetry={() => void matches.refetch()} />

  if (upcoming.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t('home.nextEvents.upcomingMatches.empty')}</p>
    )
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {upcoming.map((match) => (
        <li key={match.id}>
          <Link
            to={`/matches/${match.id}`}
            className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-primary"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <CalendarClock aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {t('home.vsOpponent', {
                  opponent: opponentLabel(opponentsById.get(match.opponent_id), match.opponent_id),
                })}
              </span>
            </span>
            <span className="shrink-0 text-muted-foreground">{match.match_date}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function ActiveAndUpcomingTournaments() {
  const { t } = useTranslation()
  const today = todayIso()
  const tournaments = useTournaments({ limit: 200 })

  if (tournaments.isPending) return <LoadingState />
  if (tournaments.isError)
    return <ErrorState error={tournaments.error} onRetry={() => void tournaments.refetch()} />

  const relevant = (tournaments.data?.items ?? [])
    .filter((t) => t.end_date === null || t.end_date >= today)
    .map((t) => ({ ...t, isActive: t.start_date !== null && t.start_date <= today }))
    .sort((a, b) => (a.start_date ?? '').localeCompare(b.start_date ?? ''))
    .slice(0, 5)

  if (relevant.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('home.nextEvents.tournaments.empty')}</p>
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {relevant.map((tournament) => (
        <li key={tournament.id}>
          <Link
            to={`/tournaments/${tournament.id}`}
            className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-primary"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              {tournament.icon ? (
                <EntityIcon value={tournament.icon} className="size-4 shrink-0" />
              ) : (
                <Trophy aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate">{tournament.name}</span>
            </span>
            <span
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                tournament.isActive
                  ? 'bg-highlight/15 text-highlight'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {tournament.isActive
                ? t('home.nextEvents.tournamentActive')
                : (tournament.start_date ?? t('home.nextEvents.tournamentUpcoming'))}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function NextEvents() {
  const { t } = useTranslation()

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>{t('home.nextEvents.upcomingMatches.title')}</CardTitle>
            <CardDescription>{t('home.nextEvents.upcomingMatches.description')}</CardDescription>
          </div>
          <Link
            to="/matches?status=scheduled"
            className="flex items-center text-sm text-muted-foreground hover:text-primary"
          >
            {t('home.viewAll')}
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        </CardHeader>
        <CardContent>
          <UpcomingMatches />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>{t('home.nextEvents.tournaments.title')}</CardTitle>
            <CardDescription>{t('home.nextEvents.tournaments.description')}</CardDescription>
          </div>
          <Link
            to="/tournaments"
            className="flex items-center text-sm text-muted-foreground hover:text-primary"
          >
            {t('home.viewAll')}
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        </CardHeader>
        <CardContent>
          <ActiveAndUpcomingTournaments />
        </CardContent>
      </Card>
    </div>
  )
}
