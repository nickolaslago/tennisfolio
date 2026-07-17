import { Link } from 'react-router-dom'

import { ErrorState, LoadingState } from '@/components/data/query-state'
import { Card, CardContent } from '@/components/ui/card'
import { useMatches } from '@/hooks/use-matches'
import { useWinRate, useWinRateBySurface } from '@/hooks/use-stats'

/** Overall record, last 5 results and per-surface splits vs one opponent — derived on read. */
export function OpponentHeadToHead({ opponentId }: { opponentId: number }) {
  const overall = useWinRate({ opponent_id: opponentId })
  const bySurface = useWinRateBySurface({ opponent_id: opponentId })
  const recent = useMatches({ opponent_id: opponentId, status: 'played', limit: 5 })

  const isPending = overall.isPending || bySurface.isPending || recent.isPending
  const error = overall.error ?? bySurface.error ?? recent.error
  const isError = overall.isError || bySurface.isError || recent.isError

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <h2 className="cn-font-heading text-lg font-semibold">Head-to-head</h2>

        {isPending ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState error={error} />
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <div>
                <span className="text-2xl font-semibold">
                  {overall.data.wins}–{overall.data.losses}
                </span>
                <span className="ml-2 text-sm text-muted-foreground">
                  {overall.data.win_rate === null
                    ? 'No matches yet'
                    : `${Math.round(overall.data.win_rate * 100)}% win rate, ${
                        overall.data.matches
                      } match${overall.data.matches === 1 ? '' : 'es'}`}
                </span>
              </div>
            </div>

            {recent.data.items.length > 0 ? (
              <div>
                <p className="mb-1.5 text-sm font-medium text-muted-foreground">Last 5</p>
                <div className="flex flex-wrap gap-1.5">
                  {recent.data.items.map((match) => (
                    <Link
                      key={match.id}
                      to={`/matches/${match.id}`}
                      title={`${match.match_date} · ${match.score ?? ''}`}
                      className={
                        'flex size-7 items-center justify-center rounded-full text-xs font-semibold ' +
                        (match.result === 'Win'
                          ? 'bg-win text-win-foreground'
                          : 'bg-loss text-loss-foreground')
                      }
                    >
                      {match.result === 'Win' ? 'W' : 'L'}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {bySurface.data.length > 0 ? (
              <div>
                <p className="mb-1.5 text-sm font-medium text-muted-foreground">By surface</p>
                <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  {bySurface.data.map((row) => (
                    <div key={row.surface}>
                      <dt className="text-muted-foreground">{row.surface}</dt>
                      <dd>
                        {row.wins}–{row.losses}
                        {row.win_rate !== null ? ` (${Math.round(row.win_rate * 100)}%)` : ''}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
