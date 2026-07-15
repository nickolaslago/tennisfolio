import type { MatchResult, ScoredSet } from './types'

/**
 * Canonical tennis score-string parser.
 *
 * Pure logic that turns a score string written from the user's perspective
 * (games won first) — e.g. "6-4" or "6-4 3-6 10-7" — into per-set rows and
 * derives the match result.
 *
 * A mirror implementation lives in `apps/api/src/app/scoring.py`; the two are
 * kept in exact behavioural parity by shared test suites.
 *
 * Scoring model:
 * - A match records 1, 3, or 5 sets. Even set counts cannot decide a winner.
 * - A standard set is won 6-0 to 6-4, 7-5, or 7-6 (7-6 being a tiebreak set).
 * - The deciding (final) set may instead be a super-tiebreak — first to 10,
 *   win by two — written like "10-7" or "12-10".
 * - The player who wins the match must win the final set, and cannot have
 *   clinched before it (a best-of-n match ends at `n / 2 + 1` sets won).
 */

const SET_PATTERN = /^(-?\d+)-(-?\d+)$/
const ALLOWED_SET_COUNTS = [1, 3, 5]
// For a match of N sets, the winner must take exactly one of these many sets:
// 3-set matches are ambiguous (best-of-3 decider = 2, best-of-5 sweep = 3).
const WINNING_SETS_BY_COUNT: Record<number, number[]> = {
  1: [1],
  3: [2, 3],
  5: [3],
}

/** Raised when a score string cannot describe a real, completed match. */
export class InvalidScoreError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidScoreError'
  }
}

/**
 * Parses a score string into per-set rows, validating it end to end.
 *
 * Throws {@link InvalidScoreError} with a human-readable message for any score
 * that cannot describe a real, completed match.
 */
export function parseScore(score: string): ScoredSet[] {
  const tokens = score.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) {
    throw new InvalidScoreError('Score string must contain at least one set.')
  }

  const count = tokens.length
  if (!ALLOWED_SET_COUNTS.includes(count)) {
    throw new InvalidScoreError(setCountMessage(count))
  }

  const sets = tokens.map((token, index) =>
    parseSet(token, index + 1, index === count - 1),
  )

  const userWins = sets.filter((set) => set.result === 'Win').length
  const opponentWins = count - userWins
  const matchResult: MatchResult = userWins > opponentWins ? 'Win' : 'Loss'

  if (sets[count - 1].result !== matchResult) {
    throw new InvalidScoreError(
      'Inconsistent score: the player who wins the match must win the final set.',
    )
  }

  const winnerWins = Math.max(userWins, opponentWins)
  if (!WINNING_SETS_BY_COUNT[count].includes(winnerWins)) {
    throw new InvalidScoreError(
      `Inconsistent score: a best-of-${count} match is won by taking ` +
        `${Math.floor(count / 2) + 1} sets, but this score has a player winning ${winnerWins}.`,
    )
  }

  return sets
}

/** Aggregates the match result: whoever won the majority of sets. */
export function computeMatchResult(sets: ScoredSet[]): MatchResult {
  const wins = sets.filter((set) => set.result === 'Win').length
  return wins * 2 > sets.length ? 'Win' : 'Loss'
}

/** Reconstructs the "6-4 3-6 10-7" display string from parsed sets. */
export function formatScore(sets: ScoredSet[]): string {
  return sets.map((set) => `${set.gamesWon}-${set.gamesLost}`).join(' ')
}

function setCountMessage(count: number): string {
  if (count % 2 === 0) {
    return (
      `A tennis match has an odd number of sets (1, 3, or 5); ` +
      `${count} sets cannot decide a winner.`
    )
  }
  return `A tennis match has at most 5 sets; got ${count}.`
}

function parseSet(token: string, setNo: number, isLast: boolean): ScoredSet {
  const match = SET_PATTERN.exec(token)
  if (!match) {
    throw new InvalidScoreError(
      `Invalid set score '${token}': expected two whole numbers joined by '-', e.g. '6-4'.`,
    )
  }

  const gamesWon = Number(match[1])
  const gamesLost = Number(match[2])
  if (gamesWon < 0 || gamesLost < 0) {
    throw new InvalidScoreError(`Set score '${token}' cannot contain negative numbers.`)
  }
  if (gamesWon === gamesLost) {
    throw new InvalidScoreError(`'${token}' is not a completed set: a set cannot end level.`)
  }

  const tiebreak = classifySet(gamesWon, gamesLost, token, isLast)
  const result = gamesWon > gamesLost ? 'Win' : 'Loss'
  return { setNo, gamesWon, gamesLost, tiebreak, result }
}

/** Validates a set and reports whether it was decided by a tiebreak. */
function classifySet(gamesWon: number, gamesLost: number, token: string, isLast: boolean): boolean {
  const high = Math.max(gamesWon, gamesLost)
  const low = Math.min(gamesWon, gamesLost)

  // Standard set: 6-0..6-4, 7-5 (no tiebreak) or 7-6 (tiebreak).
  if (high === 6 && low <= 4) return false
  if (high === 7 && low === 5) return false
  if (high === 7 && low === 6) return true

  // Super-tiebreak (match tiebreak) — only ever the deciding set.
  if (high >= 10) {
    if (!isLast) {
      throw new InvalidScoreError(
        `'${token}' is not valid here: a super-tiebreak can only be the deciding set.`,
      )
    }
    if (isValidSuperTiebreak(high, low)) return true
    throw new InvalidScoreError(
      `'${token}' is not a valid super-tiebreak: play to 10, win by two ` +
        `(e.g. '10-7' or '11-9').`,
    )
  }

  throw new InvalidScoreError(
    `'${token}' is not a valid set score: a set is won 6-0 to 6-4, 7-5, or 7-6.`,
  )
}

function isValidSuperTiebreak(high: number, low: number): boolean {
  if (high === 10) return low <= 8 // 10-0 .. 10-8; 10-9 must play on
  return high - low === 2 // 11-9, 12-10, ... (win by exactly two past 10)
}
