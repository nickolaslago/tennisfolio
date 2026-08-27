/**
 * Writes the whole local database out as the CSV bundle documented in
 * `docs/data-export.md` — the same six files, same columns, same conventions
 * `GET /export/csv` produces, so an export taken on the phone is
 * indistinguishable from one taken from the API.
 *
 * The only thing this layer decides for itself is the *local* ids. The API uses
 * its integer primary keys (`clu-3` is club 3); UUIDs carry no such number, so
 * rows are numbered 1..N in insertion order as they are written, and the map
 * from UUID to local id is threaded through the files that reference them.
 * That is what the format asks for — the local ids only ever have to be
 * consistent inside one bundle.
 *
 * Nothing derived is written: no result, no score string, no match type. They
 * are recomputed from `sets.csv` on import.
 */
import type { Database, SqlRow } from '@/db/sqlite';
import { writeCsv } from '@/lib/transfer/csv';
import {
  CSV_HEADERS,
  formatCsvBoolean,
  formatCsvDate,
  formatCsvValue,
  localId,
  LOCAL_ID_PREFIX,
  type CsvBundle,
} from '@/lib/transfer/format';
import { INSERTION_ORDER } from '@/lib/repositories/shared';

/** UUID to the `clu-1`-style id used inside one bundle. */
type LocalIds = Map<string, string>;

function assignLocalIds(prefix: string, rows: { id: string }[]): LocalIds {
  return new Map(rows.map((row, index) => [row.id, localId(prefix, index + 1)]));
}

/** A nullable reference: an empty cell when the row has none. */
function reference(ids: LocalIds, id: string | null): string {
  return id === null ? '' : (ids.get(id) ?? '');
}

interface ClubExportRow extends SqlRow {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
}

interface CourtExportRow extends SqlRow {
  id: string;
  club_id: string;
  surface: string;
  environment: string;
}

interface OpponentExportRow extends SqlRow {
  id: string;
  last_name: string;
  name: string | null;
  nationality: string | null;
  handedness: string | null;
  age_range: string | null;
  level: string | null;
  notes: string | null;
}

interface TournamentExportRow extends SqlRow {
  id: string;
  name: string;
  season: string | null;
  tournament_type: string;
  format: string | null;
  club_id: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
}

interface MatchExportRow extends SqlRow {
  id: string;
  match_date: string;
  opponent_id: string;
  club_id: string | null;
  court_id: string | null;
  tournament_id: string | null;
  stage: string | null;
  duration_min: number | null;
  status: string;
  notes: string | null;
}

interface SetExportRow extends SqlRow {
  id: string;
  match_id: string;
  set_no: number;
  games_won: number;
  games_lost: number;
  tiebreak: number;
}

/**
 * Reads every table and renders the bundle.
 *
 * Runs in one transaction so a bundle is a consistent snapshot even if a write
 * lands mid-export.
 */
export function exportCsvBundle(db: Database): Promise<CsvBundle> {
  return db.transaction(async () => {
    const clubs = await db.select<ClubExportRow>(
      `SELECT id, name, city, country FROM clubs ORDER BY ${INSERTION_ORDER}`,
    );
    const courts = await db.select<CourtExportRow>(
      `SELECT id, club_id, surface, environment FROM courts ORDER BY ${INSERTION_ORDER}`,
    );
    const opponents = await db.select<OpponentExportRow>(
      `SELECT id, last_name, name, nationality, handedness, age_range, level, notes
       FROM opponents ORDER BY ${INSERTION_ORDER}`,
    );
    const tournaments = await db.select<TournamentExportRow>(
      `SELECT id, name, season, tournament_type, format, club_id, start_date, end_date, notes
       FROM tournaments ORDER BY ${INSERTION_ORDER}`,
    );
    const matches = await db.select<MatchExportRow>(
      `SELECT id, match_date, opponent_id, club_id, court_id, tournament_id, stage,
              duration_min, status, notes
       FROM matches ORDER BY ${INSERTION_ORDER}`,
    );

    const clubIds = assignLocalIds(LOCAL_ID_PREFIX.clubs, clubs);
    const courtIds = assignLocalIds(LOCAL_ID_PREFIX.courts, courts);
    const opponentIds = assignLocalIds(LOCAL_ID_PREFIX.opponents, opponents);
    const tournamentIds = assignLocalIds(LOCAL_ID_PREFIX.tournaments, tournaments);
    const matchIds = assignLocalIds(LOCAL_ID_PREFIX.matches, matches);

    // Sets are grouped by their match and ordered by set_no, so sets.csv comes
    // out in the same order the API's `for m in matches for s in m.sets` gives.
    const setRows: SetExportRow[] = [];
    for (const match of matches) {
      const sets = await db.select<SetExportRow>(
        `SELECT id, match_id, set_no, games_won, games_lost, tiebreak FROM sets
         WHERE match_id = ? ORDER BY set_no`,
        [match.id],
      );
      setRows.push(...sets);
    }

    return {
      'clubs.csv': writeCsv(
        [...CSV_HEADERS['clubs.csv']],
        clubs.map((row) => [
          clubIds.get(row.id) ?? '',
          row.name,
          formatCsvValue(row.city),
          formatCsvValue(row.country),
        ]),
      ),

      'courts.csv': writeCsv(
        [...CSV_HEADERS['courts.csv']],
        courts.map((row) => [
          courtIds.get(row.id) ?? '',
          reference(clubIds, row.club_id),
          row.surface,
          row.environment,
        ]),
      ),

      'opponents.csv': writeCsv(
        [...CSV_HEADERS['opponents.csv']],
        opponents.map((row) => [
          opponentIds.get(row.id) ?? '',
          row.last_name,
          formatCsvValue(row.name),
          formatCsvValue(row.nationality),
          formatCsvValue(row.handedness),
          formatCsvValue(row.age_range),
          formatCsvValue(row.level),
          formatCsvValue(row.notes),
        ]),
      ),

      'tournaments.csv': writeCsv(
        [...CSV_HEADERS['tournaments.csv']],
        tournaments.map((row) => [
          tournamentIds.get(row.id) ?? '',
          row.name,
          formatCsvValue(row.season),
          row.tournament_type,
          formatCsvValue(row.format),
          reference(clubIds, row.club_id),
          formatCsvDate(row.start_date),
          formatCsvDate(row.end_date),
          formatCsvValue(row.notes),
        ]),
      ),

      'matches.csv': writeCsv(
        [...CSV_HEADERS['matches.csv']],
        matches.map((row) => [
          matchIds.get(row.id) ?? '',
          formatCsvDate(row.match_date),
          reference(opponentIds, row.opponent_id),
          reference(clubIds, row.club_id),
          reference(courtIds, row.court_id),
          reference(tournamentIds, row.tournament_id),
          formatCsvValue(row.stage),
          formatCsvValue(row.duration_min),
          row.status,
          formatCsvValue(row.notes),
        ]),
      ),

      'sets.csv': writeCsv(
        [...CSV_HEADERS['sets.csv']],
        setRows.map((row, index) => [
          localId(LOCAL_ID_PREFIX.sets, index + 1),
          reference(matchIds, row.match_id),
          String(row.set_no),
          String(row.games_won),
          String(row.games_lost),
          formatCsvBoolean(row.tiebreak === 1),
        ]),
      ),
    };
  });
}
