import type { MatchResult, ScoredSet } from './types'

const SET_PATTERN = /^(\d+)-(\d+)$/

/**
 * Parses a score string like "6-4" or "6-4 3-6 10-7" into per-set results.
 * Each set's result is derived from games won vs. lost.
 */
export function parseScore(score: string): ScoredSet[] {
  const tokens = score.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) {
    throw new Error('Score string must contain at least one set')
  }

  return tokens.map((token, index) => {
    const match = SET_PATTERN.exec(token)
    if (!match) {
      throw new Error(`Invalid set score: "${token}"`)
    }

    const gamesWon = Number(match[1])
    const gamesLost = Number(match[2])

    return {
      setNo: index + 1,
      gamesWon,
      gamesLost,
      tiebreak: false,
      result: gamesWon > gamesLost ? 'Win' : 'Loss',
    }
  })
}

/** Aggregates a match result from its sets: most set wins takes the match. */
export function computeMatchResult(sets: ScoredSet[]): MatchResult {
  const wins = sets.filter((set) => set.result === 'Win').length
  return wins > sets.length / 2 ? 'Win' : 'Loss'
}

/** Reconstructs the "6-4 3-6 10-7" display string from parsed sets. */
export function formatScore(sets: ScoredSet[]): string {
  return sets.map((set) => `${set.gamesWon}-${set.gamesLost}`).join(' ')
}
