/**
 * Reads a CSV bundle into SQLite — the destructive counterpart of
 * `export.ts`, and a port of the API's `POST /import` CSV branch
 * (`app/routers/data_import.py` on top of `app/seed_import.py`).
 *
 * Like the API, this is always a **wipe and replace**, never a merge: the
 * caller is responsible for confirming that with the user first. Everything
 * happens in one transaction, so a bundle that fails halfway leaves the
 * existing data untouched.
 *
 * The per-entity rules are ported one for one, because a bundle that imports
 * cleanly on the server has to import cleanly here and vice versa:
 *
 * - Each entity upserts on a **natural key** (a club's name, an opponent's
 *   name pair, a tournament's name + season, a court's club + surface +
 *   environment, a match's date + opponent + club + tournament, a set's match +
 *   number). After the wipe the table is empty, so this only ever de-duplicates
 *   rows *within one bundle* — exactly as it does on the server.
 * - A row referencing an id the bundle does not define is **skipped**, with a
 *   reason recorded in `ImportResult.skipped`, rather than failing the import.
 * - A malformed enum on an opponent is nulled out and reported; a malformed one
 *   anywhere else skips the row. That asymmetry is the API's, not a slip.
 * - Set scores are validated with the API's `validate_set`, which accepts only
 *   6-x, 7-5 and 7-6 and cross-checks the `tiebreak` flag. Note that this
 *   rejects a super-tiebreak decider such as `10-7`: the CSV bundle simply does
 *   not carry them, on either side of the wire.
 *
 * Deleting every row runs the tombstone triggers, so a sync engine later sees
 * that the pre-import rows are gone rather than silently missing.
 */
import {
  isEnumValue,
  AGE_RANGE_VALUES,
  ENVIRONMENT_VALUES,
  HANDEDNESS_VALUES,
  MATCH_STATUS_VALUES,
  TOURNAMENT_TYPE_VALUES,
  type ImportResult,
} from '@tennisfolio/core';

import { newId } from '@/db/ids';
import type { Database } from '@/db/sqlite';
import { WIPE_ORDER } from '@/db/tables';
import { nowIso } from '@/db/time';
import { unprocessable } from '@/lib/repositories/errors';
import { parseCsvDicts } from '@/lib/transfer/csv';
import {
  blankToNull,
  CSV_FILENAMES,
  parseCsvBoolean,
  parseCsvDate,
  SURFACE_ALIASES,
  type CsvBundle,
} from '@/lib/transfer/format';

type Row = Record<string, string>;
/** Bundle-local id (`clu-1`) to the UUID the row was inserted under. */
type IdMap = Map<string, string>;

/** Accumulates counts and skip reasons, mirroring the API's `ImportReport`. */
class ImportReport {
  readonly inserted: Record<string, number> = {};
  readonly skipped: string[] = [];

  count(table: string): void {
    this.inserted[table] = (this.inserted[table] ?? 0) + 1;
  }

  skip(table: string, rowId: string, reason: string): void {
    this.skipped.push(`[${table}] ${rowId}: ${reason}`);
  }

  result(): ImportResult {
    return {
      clubs: this.inserted.clubs ?? 0,
      courts: this.inserted.courts ?? 0,
      opponents: this.inserted.opponents ?? 0,
      tournaments: this.inserted.tournaments ?? 0,
      matches: this.inserted.matches ?? 0,
      sets: this.inserted.sets ?? 0,
      skipped: this.skipped,
    };
  }
}

/**
 * Whether a score is a legal set, and whether the `tiebreak` flag agrees —
 * the API's `validate_set`. Returns an error message, or `null` when valid.
 */
export function validateSet(gamesWon: number, gamesLost: number, tiebreak: boolean): string | null {
  const winner = Math.max(gamesWon, gamesLost);
  const loser = Math.min(gamesWon, gamesLost);

  let expectedTiebreak: boolean;
  if (winner === 6 && loser <= 4) expectedTiebreak = false;
  else if (winner === 7 && loser === 5) expectedTiebreak = false;
  else if (winner === 7 && loser === 6) expectedTiebreak = true;
  else return `not a legal set score (${gamesWon}-${gamesLost})`;

  if (tiebreak !== expectedTiebreak) {
    return `tiebreak flag inconsistent with score (${gamesWon}-${gamesLost}, tiebreak=${tiebreak})`;
  }
  return null;
}

/** Python's `repr` for the strings the skip messages quote. */
function repr(value: string | null): string {
  return value === null ? 'None' : `'${value}'`;
}

function parseIntOrNull(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

/** Deletes every row of every table, in foreign-key-safe order. */
async function wipeAll(db: Database): Promise<void> {
  for (const table of WIPE_ORDER) {
    await db.run(`DELETE FROM ${table}`);
  }
}

async function importClubs(db: Database, rows: Row[], report: ImportReport): Promise<IdMap> {
  const ids: IdMap = new Map();
  const byName = new Map<string, string>();
  for (const row of rows) {
    const csvId = row.club_id;
    const name = (row.name ?? '').trim();
    const now = nowIso();

    let id = byName.get(name);
    if (id === undefined) {
      id = newId();
      await db.run(
        `INSERT INTO clubs (id, name, city, country, icon, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, ?, ?)`,
        [id, name, blankToNull(row.city), blankToNull(row.country), now, now],
      );
      byName.set(name, id);
      report.count('clubs');
    } else {
      await db.run('UPDATE clubs SET city = ?, country = ?, updated_at = ? WHERE id = ?', [
        blankToNull(row.city),
        blankToNull(row.country),
        now,
        id,
      ]);
    }
    ids.set(csvId, id);
  }
  return ids;
}

async function importCourts(
  db: Database,
  rows: Row[],
  clubIds: IdMap,
  report: ImportReport,
): Promise<IdMap> {
  const ids: IdMap = new Map();
  const byKey = new Map<string, string>();
  for (const row of rows) {
    const csvId = row.court_id;

    const clubCsvId = blankToNull(row.club_id);
    const clubId = clubCsvId === null ? undefined : clubIds.get(clubCsvId);
    if (clubId === undefined) {
      report.skip('courts', csvId, `unknown club_id ${repr(clubCsvId)}`);
      continue;
    }

    const surfaceRaw = blankToNull(row.surface);
    const surface = surfaceRaw === null ? undefined : SURFACE_ALIASES[surfaceRaw];
    if (surface === undefined) {
      report.skip('courts', csvId, `unknown surface ${repr(surfaceRaw)}`);
      continue;
    }

    const environmentRaw = blankToNull(row.environment);
    if (environmentRaw === null) {
      report.skip('courts', csvId, 'missing environment');
      continue;
    }
    if (!isEnumValue(ENVIRONMENT_VALUES, environmentRaw)) {
      report.skip('courts', csvId, `unknown environment ${repr(environmentRaw)}`);
      continue;
    }

    const key = `${clubId}|${surface}|${environmentRaw}`;
    let id = byKey.get(key);
    if (id === undefined) {
      id = newId();
      const now = nowIso();
      await db.run(
        `INSERT INTO courts (id, club_id, surface, environment, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, clubId, surface, environmentRaw, now, now],
      );
      byKey.set(key, id);
      report.count('courts');
    }
    ids.set(csvId, id);
  }
  return ids;
}

async function importOpponents(db: Database, rows: Row[], report: ImportReport): Promise<IdMap> {
  const ids: IdMap = new Map();
  const byKey = new Map<string, string>();
  for (const row of rows) {
    const csvId = row.opponent_id;
    const lastName = (row.last_name ?? '').trim();
    const name = blankToNull(row.name);
    const now = nowIso();

    // The source column is the misspelled `handeness`; fall back to the correct
    // spelling in case it is ever fixed upstream.
    const handednessRaw = blankToNull(row.handeness) ?? blankToNull(row.handedness);
    let handedness: string | null = null;
    if (handednessRaw !== null) {
      if (isEnumValue(HANDEDNESS_VALUES, handednessRaw)) handedness = handednessRaw;
      else report.skip('opponents', csvId, `unknown handedness ${repr(handednessRaw)}`);
    }

    const ageRangeRaw = blankToNull(row.age_range);
    let ageRange: string | null = null;
    if (ageRangeRaw !== null) {
      if (isEnumValue(AGE_RANGE_VALUES, ageRangeRaw)) ageRange = ageRangeRaw;
      else report.skip('opponents', csvId, `unknown age_range ${repr(ageRangeRaw)}`);
    }

    const key = `${lastName}|${name ?? ''}`;
    let id = byKey.get(key);
    if (id === undefined) {
      id = newId();
      await db.run(
        `INSERT INTO opponents (id, last_name, name, nationality, handedness, age_range,
                                level, notes, icon, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
        [
          id,
          lastName,
          name,
          blankToNull(row.nationality),
          handedness,
          ageRange,
          blankToNull(row.level),
          blankToNull(row.notes),
          now,
          now,
        ],
      );
      byKey.set(key, id);
      report.count('opponents');
    } else {
      await db.run(
        `UPDATE opponents SET nationality = ?, handedness = ?, age_range = ?, level = ?,
                              notes = ?, updated_at = ?
         WHERE id = ?`,
        [
          blankToNull(row.nationality),
          handedness,
          ageRange,
          blankToNull(row.level),
          blankToNull(row.notes),
          now,
          id,
        ],
      );
    }
    ids.set(csvId, id);
  }
  return ids;
}

async function importTournaments(
  db: Database,
  rows: Row[],
  clubIds: IdMap,
  report: ImportReport,
): Promise<IdMap> {
  const ids: IdMap = new Map();
  const byKey = new Map<string, string>();
  for (const row of rows) {
    const csvId = row.tournament_id;
    const name = (row.name ?? '').trim();
    const season = blankToNull(row.season);

    const typeRaw = (row.tournament_type ?? '').trim();
    if (!isEnumValue(TOURNAMENT_TYPE_VALUES, typeRaw)) {
      report.skip('tournaments', csvId, `unknown tournament_type ${repr(typeRaw)}`);
      continue;
    }

    const clubCsvId = blankToNull(row.club_id);
    let clubId: string | null = null;
    if (clubCsvId !== null) {
      const mapped = clubIds.get(clubCsvId);
      if (mapped === undefined) {
        report.skip('tournaments', csvId, `unknown club_id ${repr(clubCsvId)}`);
        continue;
      }
      clubId = mapped;
    }

    const startDateRaw = blankToNull(row.start_date);
    const endDateRaw = blankToNull(row.end_date);
    const startDate = startDateRaw === null ? null : parseCsvDate(startDateRaw);
    const endDate = endDateRaw === null ? null : parseCsvDate(endDateRaw);
    if (
      (startDateRaw !== null && startDate === null) ||
      (endDateRaw !== null && endDate === null)
    ) {
      report.skip('tournaments', csvId, 'unparseable start_date/end_date');
      continue;
    }

    const now = nowIso();
    const key = `${name}|${season ?? ''}`;
    let id = byKey.get(key);
    if (id === undefined) {
      id = newId();
      await db.run(
        `INSERT INTO tournaments (id, name, season, tournament_type, format, organiser, club_id,
                                  start_date, end_date, notes, icon, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, NULL, ?, ?)`,
        [
          id,
          name,
          season,
          typeRaw,
          blankToNull(row.format),
          clubId,
          startDate,
          endDate,
          blankToNull(row.notes),
          now,
          now,
        ],
      );
      byKey.set(key, id);
      report.count('tournaments');
    } else {
      await db.run(
        `UPDATE tournaments SET tournament_type = ?, format = ?, club_id = ?, start_date = ?,
                                end_date = ?, notes = ?, updated_at = ?
         WHERE id = ?`,
        [
          typeRaw,
          blankToNull(row.format),
          clubId,
          startDate,
          endDate,
          blankToNull(row.notes),
          now,
          id,
        ],
      );
    }
    ids.set(csvId, id);
  }
  return ids;
}

async function importMatches(
  db: Database,
  rows: Row[],
  opponentIds: IdMap,
  clubIds: IdMap,
  courtIds: IdMap,
  tournamentIds: IdMap,
  report: ImportReport,
): Promise<IdMap> {
  const ids: IdMap = new Map();
  const byKey = new Map<string, string>();
  for (const row of rows) {
    const csvId = row.match_id;

    const opponentCsvId = (row.opponent_id ?? '').trim();
    const opponentId = opponentIds.get(opponentCsvId);
    if (opponentId === undefined) {
      report.skip('matches', csvId, `unknown opponent_id ${repr(opponentCsvId)}`);
      continue;
    }

    const clubCsvId = blankToNull(row.club_id);
    let clubId: string | null = null;
    if (clubCsvId !== null) {
      const mapped = clubIds.get(clubCsvId);
      if (mapped === undefined) {
        report.skip('matches', csvId, `unknown club_id ${repr(clubCsvId)}`);
        continue;
      }
      clubId = mapped;
    }

    const courtCsvId = blankToNull(row.court_id);
    let courtId: string | null = null;
    if (courtCsvId !== null) {
      const mapped = courtIds.get(courtCsvId);
      if (mapped === undefined) {
        report.skip('matches', csvId, `unknown court_id ${repr(courtCsvId)}`);
        continue;
      }
      courtId = mapped;
    }

    const tournamentCsvId = blankToNull(row.tournament_id);
    let tournamentId: string | null = null;
    if (tournamentCsvId !== null) {
      const mapped = tournamentIds.get(tournamentCsvId);
      if (mapped === undefined) {
        report.skip('matches', csvId, `unknown tournament_id ${repr(tournamentCsvId)}`);
        continue;
      }
      tournamentId = mapped;
    }

    const matchDate = parseCsvDate(row.match_date ?? '');
    if (matchDate === null) {
      report.skip('matches', csvId, `unparseable match_date ${repr(row.match_date ?? null)}`);
      continue;
    }

    const statusRaw = (row.status ?? 'played').trim() || 'played';
    if (!isEnumValue(MATCH_STATUS_VALUES, statusRaw)) {
      report.skip('matches', csvId, `unknown status ${repr(statusRaw)}`);
      continue;
    }

    const durationMin = parseIntOrNull(blankToNull(row.duration_min));
    const stage = blankToNull(row.stage);
    const notes = blankToNull(row.notes);
    const now = nowIso();

    const key = `${matchDate}|${opponentId}|${clubId ?? ''}|${tournamentId ?? ''}`;
    let id = byKey.get(key);
    if (id === undefined) {
      id = newId();
      await db.run(
        `INSERT INTO matches (id, match_date, opponent_id, club_id, tournament_id, court_id,
                              stage, duration_min, notes, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          matchDate,
          opponentId,
          clubId,
          tournamentId,
          courtId,
          stage,
          durationMin,
          notes,
          statusRaw,
          now,
          now,
        ],
      );
      byKey.set(key, id);
      report.count('matches');
    } else {
      await db.run(
        `UPDATE matches SET court_id = ?, stage = ?, duration_min = ?, notes = ?, status = ?,
                            updated_at = ?
         WHERE id = ?`,
        [courtId, stage, durationMin, notes, statusRaw, now, id],
      );
    }
    ids.set(csvId, id);
  }
  return ids;
}

async function importSets(
  db: Database,
  rows: Row[],
  matchIds: IdMap,
  report: ImportReport,
): Promise<void> {
  const seen = new Map<string, [number, number, boolean]>();
  const existing = new Map<string, string>();

  for (const row of rows) {
    const csvId = row.set_id;

    const matchCsvId = (row.match_id ?? '').trim();
    const matchId = matchIds.get(matchCsvId);
    if (matchId === undefined) {
      report.skip('sets', csvId, `unknown match_id ${repr(matchCsvId)}`);
      continue;
    }

    const setNo = parseIntOrNull(blankToNull(row.set_no));
    const gamesWon = parseIntOrNull(blankToNull(row.games_won));
    const gamesLost = parseIntOrNull(blankToNull(row.games_lost));
    if (setNo === null || gamesWon === null || gamesLost === null) {
      report.skip('sets', csvId, 'non-numeric set_no/games_won/games_lost');
      continue;
    }
    const tiebreak = parseCsvBoolean(row.tiebreak ?? 'false');

    const dupKey = `${matchCsvId}|${setNo}`;
    const previous = seen.get(dupKey);
    if (
      previous !== undefined &&
      (previous[0] !== gamesWon || previous[1] !== gamesLost || previous[2] !== tiebreak)
    ) {
      report.skip(
        'sets',
        csvId,
        `duplicate set_no ${setNo} for ${matchCsvId} with a different score than ` +
          `(${previous[0]}, ${previous[1]}, ${previous[2] ? 'True' : 'False'}) — ` +
          'keeping the first one seen',
      );
      continue;
    }
    seen.set(dupKey, [gamesWon, gamesLost, tiebreak]);

    const error = validateSet(gamesWon, gamesLost, tiebreak);
    if (error !== null) {
      report.skip('sets', csvId, error);
      continue;
    }

    const now = nowIso();
    const rowKey = `${matchId}|${setNo}`;
    const id = existing.get(rowKey);
    if (id === undefined) {
      const created = newId();
      await db.run(
        `INSERT INTO sets (id, match_id, set_no, games_won, games_lost, tiebreak,
                           created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [created, matchId, setNo, gamesWon, gamesLost, tiebreak ? 1 : 0, now, now],
      );
      existing.set(rowKey, created);
      report.count('sets');
    } else {
      await db.run(
        'UPDATE sets SET games_won = ?, games_lost = ?, tiebreak = ?, updated_at = ? WHERE id = ?',
        [gamesWon, gamesLost, tiebreak ? 1 : 0, now, id],
      );
    }
  }
}

/** 400 when the bundle is not a bundle at all — the API's missing-file check. */
function assertCompleteBundle(bundle: Partial<CsvBundle>): asserts bundle is CsvBundle {
  const missing = CSV_FILENAMES.filter((name) => typeof bundle[name] !== 'string');
  if (missing.length > 0) {
    throw unprocessable(`Bundle is missing required file(s): ${missing.join(', ')}`);
  }
}

/**
 * Wipes every table and reloads it from `bundle`, all in one transaction.
 *
 * Returns the same `ImportResult` the API's `POST /import` does: how many rows
 * of each table were written, plus a human-readable reason for every row that
 * could not be.
 */
export async function importCsvBundle(
  db: Database,
  bundle: Partial<CsvBundle>,
): Promise<ImportResult> {
  assertCompleteBundle(bundle);
  const rows = Object.fromEntries(
    CSV_FILENAMES.map((name) => [name, parseCsvDicts(bundle[name])]),
  ) as Record<(typeof CSV_FILENAMES)[number], Row[]>;

  return db.transaction(async () => {
    const report = new ImportReport();
    await wipeAll(db);

    const clubIds = await importClubs(db, rows['clubs.csv'], report);
    const courtIds = await importCourts(db, rows['courts.csv'], clubIds, report);
    const opponentIds = await importOpponents(db, rows['opponents.csv'], report);
    const tournamentIds = await importTournaments(db, rows['tournaments.csv'], clubIds, report);
    const matchIds = await importMatches(
      db,
      rows['matches.csv'],
      opponentIds,
      clubIds,
      courtIds,
      tournamentIds,
      report,
    );
    await importSets(db, rows['sets.csv'], matchIds, report);

    return report.result();
  });
}
