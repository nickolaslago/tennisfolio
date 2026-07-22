/**
 * The virtual "Friendlies" tournament: matches with `tournament_id === null` are
 * friendly (no-tournament) matches. There is no such row in the database — it's a
 * frontend-only entity, so its id is a string sentinel that is never a real
 * tournament id, and its standings are derived on read (never stored), mirroring
 * the API's `tournament_standings`.
 */
import type { Match } from '@/lib/api/matches'
import type { StandingsRow } from '@/lib/api/tournaments'

/** Route/sentinel id for the virtual Friendlies entry. Never a real tournament id. */
export const FRIENDLIES_ID = 'friendlies' as const

/** True when a route param is the Friendlies sentinel rather than a real tournament id. */
export function isFriendliesId(id: string | undefined): boolean {
  return id === FRIENDLIES_ID
}

/** The minimal opponent shape needed to name and tie-break a standings row. */
export interface StandingsOpponent {
  name: string | null
  last_name: string
}

/** Full display name, mirroring the API's `"{name} {last_name}"` / `last_name` rule. */
export function opponentDisplayName(opponent: StandingsOpponent): string {
  return opponent.name ? `${opponent.name} ${opponent.last_name}` : opponent.last_name
}

interface StandingsAccumulator {
  played: number
  wins: number
  sets_won: number
  sets_lost: number
  games_won: number
  games_lost: number
}

/**
 * Per-opponent standings derived from a set of matches, mirroring the shape and
 * tie-break order of the API's `tournament_standings`: only played matches count,
 * a set is won/lost by its game score, and rows are ranked by wins, then set
 * difference, then game difference, then opponent last name.
 */
export function computeStandings(
  matches: Match[],
  opponentsById: Map<number, StandingsOpponent>,
): StandingsRow[] {
  const byOpponent = new Map<number, StandingsAccumulator>()

  for (const match of matches) {
    if (match.status !== 'played') continue

    let acc = byOpponent.get(match.opponent_id)
    if (!acc) {
      acc = { played: 0, wins: 0, sets_won: 0, sets_lost: 0, games_won: 0, games_lost: 0 }
      byOpponent.set(match.opponent_id, acc)
    }

    let matchSetsWon = 0
    let matchSetsLost = 0
    for (const set of match.sets) {
      if (set.games_won > set.games_lost) matchSetsWon += 1
      else if (set.games_won < set.games_lost) matchSetsLost += 1
      acc.games_won += set.games_won
      acc.games_lost += set.games_lost
    }
    acc.sets_won += matchSetsWon
    acc.sets_lost += matchSetsLost
    acc.played += 1
    if (matchSetsWon > matchSetsLost) acc.wins += 1
  }

  const lastName = (opponentId: number) => opponentsById.get(opponentId)?.last_name ?? ''

  const rows: StandingsRow[] = Array.from(byOpponent.entries()).map(([opponentId, acc]) => {
    const opponent = opponentsById.get(opponentId)
    return {
      opponent_id: opponentId,
      opponent_name: opponent ? opponentDisplayName(opponent) : lastName(opponentId),
      played: acc.played,
      wins: acc.wins,
      losses: acc.played - acc.wins,
      win_rate: acc.played ? acc.wins / acc.played : null,
      sets_won: acc.sets_won,
      sets_lost: acc.sets_lost,
      games_won: acc.games_won,
      games_lost: acc.games_lost,
    }
  })

  return rows.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    const setDiff = b.sets_won - b.sets_lost - (a.sets_won - a.sets_lost)
    if (setDiff !== 0) return setDiff
    const gameDiff = b.games_won - b.games_lost - (a.games_won - a.games_lost)
    if (gameDiff !== 0) return gameDiff
    return lastName(a.opponent_id).localeCompare(lastName(b.opponent_id))
  })
}
