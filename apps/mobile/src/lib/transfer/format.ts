/**
 * The wire format of the CSV bundle, in one place.
 *
 * This is the contract with `apps/api/src/app/routers/export.py` (writer) and
 * `apps/api/src/app/seed_import.py` (reader), and it is documented for humans
 * in `docs/data-export.md`. Every quirk below is deliberate, because a
 * Tennisfolio export has to be interchangeable between the Docker PoC and the
 * phone in both directions:
 *
 * - Dates are **DD-MM-YYYY**, not ISO.
 * - Booleans are the literal strings `true` / `false`.
 * - Nulls are empty cells, never `"null"` or `"None"`.
 * - `opponents.csv` spells its handedness column **`handeness`** — a typo in
 *   the original seed CSVs that the API's importer still reads and its exporter
 *   still writes.
 * - `*_id` columns hold prefixed *local* ids (`clu-1`, `mat-3`) that link rows
 *   within one bundle. They are not database keys on either side: the API maps
 *   them to its integer primary keys, and this app maps them to UUIDs.
 * - Results, scores and match type are absent by design — they are derived
 *   from `sets.csv` on import (see docs/schema.md).
 *
 * Two columns the local schema stores are *not* in the CSV bundle, because the
 * API does not export them either: a tournament's `organiser` and every
 * entity's `icon`. A bundle round-tripped through this format drops them, on
 * device exactly as on the server.
 */
import type { Surface } from '@tennisfolio/core';

/** The six files a bundle contains, in dependency order. */
export const CSV_FILENAMES = [
  'clubs.csv',
  'courts.csv',
  'opponents.csv',
  'tournaments.csv',
  'matches.csv',
  'sets.csv',
] as const;

export type CsvFilename = (typeof CSV_FILENAMES)[number];

/** A whole bundle: filename to CSV text. */
export type CsvBundle = Record<CsvFilename, string>;

/** Local-id prefixes, one per table. */
export const LOCAL_ID_PREFIX = {
  clubs: 'clu',
  courts: 'cou',
  opponents: 'opp',
  tournaments: 'tou',
  matches: 'mat',
  sets: 'set',
} as const;

export const CSV_HEADERS = {
  'clubs.csv': ['club_id', 'name', 'city', 'country'],
  'courts.csv': ['court_id', 'club_id', 'surface', 'environment'],
  'opponents.csv': [
    'opponent_id',
    'last_name',
    'name',
    'nationality',
    'handeness',
    'age_range',
    'level',
    'notes',
  ],
  'tournaments.csv': [
    'tournament_id',
    'name',
    'season',
    'tournament_type',
    'format',
    'club_id',
    'start_date',
    'end_date',
    'notes',
  ],
  'matches.csv': [
    'match_id',
    'match_date',
    'opponent_id',
    'club_id',
    'court_id',
    'tournament_id',
    'stage',
    'duration_min',
    'status',
    'notes',
  ],
  'sets.csv': ['set_id', 'match_id', 'set_no', 'games_won', 'games_lost', 'tiebreak'],
} as const satisfies Record<CsvFilename, readonly string[]>;

/**
 * Surfaces the importer accepts, including the seed data's colloquial `Fast`.
 *
 * `Fast` is not an enum member — it is how the original seed CSVs describe the
 * hard courts at the USTA National Tennis Center and La Defense Arena. The
 * API's importer maps it to `Hard`; so does this one, and exports write the
 * canonical value back out.
 */
export const SURFACE_ALIASES: Record<string, Surface> = {
  Hard: 'Hard',
  Clay: 'Clay',
  Grass: 'Grass',
  Carpet: 'Carpet',
  Fast: 'Hard',
};

// ---------------------------------------------------------------------------
// Cell formatting (export side)
// ---------------------------------------------------------------------------

/** ISO `YYYY-MM-DD` to the bundle's `DD-MM-YYYY`; null becomes an empty cell. */
export function formatCsvDate(value: string | null): string {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}-${month}-${year}`;
}

export function formatCsvBoolean(value: boolean): string {
  return value ? 'true' : 'false';
}

export function formatCsvValue(value: string | number | null): string {
  return value === null ? '' : String(value);
}

/** `clu-1`, `mat-3`, … */
export function localId(prefix: string, ordinal: number): string {
  return `${prefix}-${ordinal}`;
}

// ---------------------------------------------------------------------------
// Cell parsing (import side)
// ---------------------------------------------------------------------------

const CSV_DATE_PATTERN = /^(\d{2})-(\d{2})-(\d{4})$/;

/** `DD-MM-YYYY` to ISO `YYYY-MM-DD`, or `null` when unparseable. */
export function parseCsvDate(value: string): string | null {
  const match = CSV_DATE_PATTERN.exec(value.trim());
  if (match === null) return null;
  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  // Rejects 31-02-2026 and friends, which Date would roll forward.
  return parsed.toISOString().slice(0, 10) === iso ? iso : null;
}

export function parseCsvBoolean(value: string): boolean {
  return value.trim().toLowerCase() === 'true';
}

/** Trims, and treats an empty cell as null — the API's `blank_to_none`. */
export function blankToNull(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
