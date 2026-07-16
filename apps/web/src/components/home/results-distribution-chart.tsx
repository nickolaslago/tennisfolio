import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { WinRateStat } from '@/lib/api/stats'

interface ResultsDistributionChartProps {
  data: WinRateStat
}

/** Part-to-whole win/loss split — a horizontal stacked bar reads better than a two-slice pie. */
export function ResultsDistributionChart({ data }: ResultsDistributionChartProps) {
  const { matches, wins, losses } = data
  const winPct = matches > 0 ? wins / matches : 0
  const lossPct = matches > 0 ? losses / matches : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Results distribution</CardTitle>
        <CardDescription>Every played match, split by result.</CardDescription>
      </CardHeader>
      <CardContent>
        {matches === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Play your first match to see your results split here.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div
              role="img"
              aria-label={`${wins} wins, ${losses} losses out of ${matches} matches`}
              className="flex h-8 w-full overflow-hidden rounded-lg bg-muted"
            >
              {winPct > 0 ? (
                <div
                  className="flex items-center justify-center bg-win text-xs font-medium text-win-foreground"
                  style={{ width: `${winPct * 100}%` }}
                >
                  {winPct >= 0.14 ? `${Math.round(winPct * 100)}%` : null}
                </div>
              ) : null}
              {lossPct > 0 ? (
                <div
                  className="flex items-center justify-center bg-loss text-xs font-medium text-loss-foreground"
                  style={{ width: `${lossPct * 100}%` }}
                >
                  {lossPct >= 0.14 ? `${Math.round(lossPct * 100)}%` : null}
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-6 text-sm">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2.5 rounded-full bg-win" />
                <span className="text-muted-foreground">Wins</span>
                <span className="font-medium">{wins}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2.5 rounded-full bg-loss" />
                <span className="text-muted-foreground">Losses</span>
                <span className="font-medium">{losses}</span>
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
