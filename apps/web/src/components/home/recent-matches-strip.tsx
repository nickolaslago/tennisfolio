import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { ErrorState, LoadingState } from '@/components/data/query-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/glass/card'
import { useMatches } from '@/hooks/use-matches'
import { useOpponents } from '@/hooks/use-opponents'

export function RecentMatchesStrip() {
  const { t } = useTranslation()
  const matches = useMatches({ status: 'played', limit: 5 })
  const opponents = useOpponents()
  const opponentsById = new Map((opponents.data?.items ?? []).map((o) => [o.id, o]))

  function opponentLabel(
    opponent: { name: string | null; last_name: string } | undefined,
    id: number,
  ) {
    if (!opponent) return t('home.opponentFallback', { id })
    return opponent.name ? `${opponent.name} ${opponent.last_name}` : opponent.last_name
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>{t('home.recentMatches.title')}</CardTitle>
          <CardDescription>{t('home.recentMatches.description')}</CardDescription>
        </div>
        <Link
          to="/matches"
          className="flex items-center text-sm text-muted-foreground hover:text-primary"
        >
          {t('home.viewAll')}
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      </CardHeader>
      <CardContent>
        {matches.isPending ? (
          <LoadingState />
        ) : matches.isError ? (
          <ErrorState error={matches.error} onRetry={() => void matches.refetch()} />
        ) : (matches.data?.items.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">{t('home.recentMatches.empty')}</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {matches.data!.items.map((match) => (
              <Link
                key={match.id}
                to={`/matches/${match.id}`}
                className="flex flex-col gap-1 rounded-lg border border-border p-3 text-sm hover:bg-accent"
              >
                <span className="truncate text-xs text-muted-foreground">{match.match_date}</span>
                <span className="truncate font-medium">
                  {t('home.vsOpponent', {
                    opponent: opponentLabel(
                      opponentsById.get(match.opponent_id),
                      match.opponent_id,
                    ),
                  })}
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className={
                      match.result === 'Win' ? 'font-medium text-win' : 'font-medium text-loss'
                    }
                  >
                    {match.result}
                  </span>
                  <span className="truncate text-muted-foreground">{match.score}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
