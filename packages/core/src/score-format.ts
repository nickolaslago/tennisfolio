/**
 * Score-entry formats shared by the score forms (match, tournament, …).
 *
 * These describe *how a score is entered* in the UI — a scoring-type dropdown
 * plus the structured numeric fields it drives — not how the canonical score
 * string is parsed. Every format still resolves to the same `"6-4 3-6 10-7"`
 * string consumed by {@link parseScore}, so the API contract is unaffected.
 */

/** Stable identifier for a scoring type, used as the select value. */
export type ScoreFormat =
  | 'one-set'
  | 'three-sets'
  | 'five-sets'
  | 'tiebreak'
  | 'super-tiebreak'
  | 'custom'

export interface ScoreFormatOption {
  /** Stable value stored in form state and used as the `<Select>` value. */
  value: ScoreFormat
  /** Human-readable label shown in the dropdown. */
  label: string
  /**
   * How the format collects numbers:
   * - `sets`  — one games-won/games-lost pair per set.
   * - `points` — a single points-won/points-lost pair.
   */
  kind: 'sets' | 'points'
  /** Number of games/points pairs the format collects. */
  pairs: number
}

/**
 * The scoring types offered in score-entry forms, in display order.
 *
 * `sets` formats collect one games pair per set (trailing sets may be left
 * empty when the match clinched early); `points` formats collect a single
 * points pair.
 */
export const SCORE_FORMAT_OPTIONS: ScoreFormatOption[] = [
  { value: 'one-set', label: '1 Set', kind: 'sets', pairs: 1 },
  { value: 'three-sets', label: '3 Sets', kind: 'sets', pairs: 3 },
  { value: 'five-sets', label: '5 Sets', kind: 'sets', pairs: 5 },
  { value: 'tiebreak', label: 'Tie Break', kind: 'points', pairs: 1 },
  { value: 'super-tiebreak', label: 'Super Tie Break', kind: 'points', pairs: 1 },
  { value: 'custom', label: 'Custom', kind: 'points', pairs: 1 },
]
