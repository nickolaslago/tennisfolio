/**
 * App-level adapter over the shared score parser in `@tennisfolio/core`.
 *
 * This is the only place the mobile app derives match data from a score string —
 * all the real logic (validation, set classification, result) lives in the
 * workspace package and is *not* re-implemented here. Keeping this thin wrapper
 * lets the UI render a summary and lets us unit-test the workspace wiring
 * without mounting a React Native tree.
 */
import {
  computeMatchResult,
  formatScore,
  parseScore,
  type MatchResult,
  type ScoredSet,
} from '@tennisfolio/core';

export interface MatchSummary {
  /** The raw score string as entered, e.g. "6-4 3-6 10-7". */
  input: string;
  /** Per-set rows derived by the core parser. */
  sets: ScoredSet[];
  /** Win/Loss for the match as a whole. */
  result: MatchResult;
  /** Canonical score string reconstructed from the parsed sets. */
  normalized: string;
  /** Sets won by the player whose perspective the score is written from. */
  setsWon: number;
  /** Sets lost. */
  setsLost: number;
}

/** Parses a score string and derives everything the UI needs to render it. */
export function summarizeMatch(score: string): MatchSummary {
  const sets = parseScore(score);
  const setsWon = sets.filter((set) => set.result === 'Win').length;
  return {
    input: score,
    sets,
    result: computeMatchResult(sets),
    normalized: formatScore(sets),
    setsWon,
    setsLost: sets.length - setsWon,
  };
}
