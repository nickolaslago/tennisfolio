/**
 * Local-first counterpart of `apps/web/src/lib/api/tournaments.ts`.
 *
 * Includes `getTournamentStandings`, which the web client also exposes here.
 * Standings are derived from the tournament's played matches on every read —
 * nothing about a table is stored — mirroring
 * `apps/api/src/app/stats.py::tournament_standings`, tie-break order included.
 */
import type {
  EntityId,
  Page,
  StandingsRow,
  Tournament,
  TournamentCreate,
  TournamentListParams,
  TournamentUpdate,
} from '@tennisfolio/core';

import { newId } from '@/db/ids';
import type { Database, SqlRow } from '@/db/sqlite';
import { nowIso } from '@/db/time';
import { notFound, throwIfAborted } from '@/lib/repositories/errors';
import {
  buildUpdate,
  Conditions,
  countRows,
  LIKE_ESCAPE,
  likePattern,
  page,
  resolvePagination,
  toSqlNullable,
} from '@/lib/repositories/shared';

const COLUMNS = `id, name, season, tournament_type, format, organiser, club_id,
                 start_date, end_date, notes, icon, created_at, updated_at`;

interface TournamentRow extends SqlRow {
  id: string;
  name: string;
  season: string | null;
  tournament_type: string;
  format: string | null;
  organiser: string | null;
  club_id: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

function toTournament(row: TournamentRow): Tournament {
  return {
    id: row.id,
    name: row.name,
    season: row.season,
    tournament_type: row.tournament_type as Tournament['tournament_type'],
    format: row.format,
    organiser: row.organiser,
    club_id: row.club_id,
    start_date: row.start_date,
    end_date: row.end_date,
    notes: row.notes,
    icon: row.icon,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function conditions(params: TournamentListParams): Conditions {
  const where = new Conditions();
  if (params.search) {
    where.add(`name LIKE ? ${LIKE_ESCAPE}`, likePattern(params.search));
  }
  where.addIf(params.tournament_type, 'tournament_type = ?');
  where.addIf(params.club_id, 'club_id = ?');
  return where;
}

/**
 * One row per (opponent, match) with the per-match aggregates the standings
 * table sums. `sets_won`/`sets_lost` count sets, not games, and a match counts
 * as a win when it took more sets than it lost — the same derivation the score
 * parser applies, expressed in SQL because it aggregates over many matches.
 *
 * Only `status = 'played'` matches with at least one set count, matching the
 * API's `_played_matches`.
 */
const PLAYED_MATCH_AGGREGATES = `
  SELECT
    m.id AS match_id,
    m.opponent_id AS opponent_id,
    SUM(CASE WHEN s.games_won > s.games_lost THEN 1 ELSE 0 END) AS sets_won,
    SUM(CASE WHEN s.games_won < s.games_lost THEN 1 ELSE 0 END) AS sets_lost,
    SUM(s.games_won) AS games_won,
    SUM(s.games_lost) AS games_lost
  FROM matches m
  JOIN sets s ON s.match_id = m.id
  WHERE m.status = 'played' AND m.tournament_id = ?
  GROUP BY m.id, m.opponent_id
`;

interface StandingsAggregateRow extends SqlRow {
  opponent_id: string;
  name: string | null;
  last_name: string;
  played: number;
  wins: number;
  sets_won: number;
  sets_lost: number;
  games_won: number;
  games_lost: number;
}

/** Mirrors the API's `_record_kwargs`: win rate is null with nothing played. */
function winRate(played: number, wins: number): number | null {
  return played > 0 ? wins / played : null;
}

export interface TournamentsRepository {
  listTournaments(params?: TournamentListParams, signal?: AbortSignal): Promise<Page<Tournament>>;
  getTournament(id: EntityId, signal?: AbortSignal): Promise<Tournament>;
  getTournamentStandings(id: EntityId, signal?: AbortSignal): Promise<StandingsRow[]>;
  createTournament(payload: TournamentCreate): Promise<Tournament>;
  updateTournament(id: EntityId, payload: TournamentUpdate): Promise<Tournament>;
  deleteTournament(id: EntityId): Promise<void>;
}

export function createTournamentsRepository(db: Database): TournamentsRepository {
  async function requireTournament(id: EntityId): Promise<Tournament> {
    const row = await db.selectOne<TournamentRow>(
      `SELECT ${COLUMNS} FROM tournaments WHERE id = ?`,
      [id],
    );
    if (row === null) throw notFound('Tournament', id);
    return toTournament(row);
  }

  /** The API 404s on an unknown `club_id` before writing anything. */
  async function requireClubExists(clubId: EntityId | null | undefined): Promise<void> {
    if (clubId === null || clubId === undefined) return;
    const found = await db.selectValue('SELECT id FROM clubs WHERE id = ?', [clubId]);
    if (found === null) throw notFound('Club', clubId);
  }

  return {
    async listTournaments(params: TournamentListParams = {}, signal?: AbortSignal) {
      throwIfAborted(signal);
      const pagination = resolvePagination(params);
      const where = conditions(params);

      const total = await countRows(
        db,
        `SELECT COUNT(*) AS total FROM tournaments ${where.where}`,
        where.params,
      );
      const rows = await db.select<TournamentRow>(
        `SELECT ${COLUMNS} FROM tournaments ${where.where} ORDER BY name LIMIT ? OFFSET ?`,
        [...where.params, pagination.limit, pagination.offset],
      );
      return page(rows.map(toTournament), total, pagination);
    },

    async getTournament(id: EntityId, signal?: AbortSignal) {
      throwIfAborted(signal);
      return requireTournament(id);
    },

    async getTournamentStandings(id: EntityId, signal?: AbortSignal) {
      throwIfAborted(signal);
      await requireTournament(id);

      const rows = await db.select<StandingsAggregateRow>(
        `SELECT
           o.id AS opponent_id,
           o.name AS name,
           o.last_name AS last_name,
           COUNT(*) AS played,
           SUM(CASE WHEN agg.sets_won > agg.sets_lost THEN 1 ELSE 0 END) AS wins,
           SUM(agg.sets_won) AS sets_won,
           SUM(agg.sets_lost) AS sets_lost,
           SUM(agg.games_won) AS games_won,
           SUM(agg.games_lost) AS games_lost
         FROM (${PLAYED_MATCH_AGGREGATES}) agg
         JOIN opponents o ON o.id = agg.opponent_id
         GROUP BY o.id, o.name, o.last_name`,
        [id],
      );

      return rows
        .map((row) => ({
          opponent_id: row.opponent_id,
          opponent_name: row.name ? `${row.name} ${row.last_name}` : row.last_name,
          played: row.played,
          wins: row.wins,
          losses: row.played - row.wins,
          win_rate: winRate(row.played, row.wins),
          sets_won: row.sets_won,
          sets_lost: row.sets_lost,
          games_won: row.games_won,
          games_lost: row.games_lost,
          // Kept only for the sort below; stripped before returning.
          _last_name: row.last_name,
        }))
        .sort(
          (a, b) =>
            b.wins - a.wins ||
            b.sets_won - b.sets_lost - (a.sets_won - a.sets_lost) ||
            b.games_won - b.games_lost - (a.games_won - a.games_lost) ||
            a._last_name.localeCompare(b._last_name),
        )
        .map(({ _last_name, ...row }): StandingsRow => row);
    },

    async createTournament(payload: TournamentCreate) {
      await requireClubExists(payload.club_id);
      const id = newId();
      const now = nowIso();
      await db.run(
        `INSERT INTO tournaments (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          payload.name.trim(),
          toSqlNullable(payload.season),
          payload.tournament_type,
          toSqlNullable(payload.format),
          toSqlNullable(payload.organiser),
          payload.club_id ?? null,
          toSqlNullable(payload.start_date),
          toSqlNullable(payload.end_date),
          toSqlNullable(payload.notes),
          toSqlNullable(payload.icon),
          now,
          now,
        ],
      );
      return requireTournament(id);
    },

    async updateTournament(id: EntityId, payload: TournamentUpdate) {
      await requireTournament(id);
      if ('club_id' in payload) await requireClubExists(payload.club_id);
      const { assignments, params } = buildUpdate({
        name: 'name' in payload ? payload.name?.trim() : undefined,
        season: 'season' in payload ? toSqlNullable(payload.season) : undefined,
        tournament_type: 'tournament_type' in payload ? payload.tournament_type : undefined,
        format: 'format' in payload ? toSqlNullable(payload.format) : undefined,
        organiser: 'organiser' in payload ? toSqlNullable(payload.organiser) : undefined,
        club_id: 'club_id' in payload ? (payload.club_id ?? null) : undefined,
        start_date: 'start_date' in payload ? toSqlNullable(payload.start_date) : undefined,
        end_date: 'end_date' in payload ? toSqlNullable(payload.end_date) : undefined,
        notes: 'notes' in payload ? toSqlNullable(payload.notes) : undefined,
        icon: 'icon' in payload ? toSqlNullable(payload.icon) : undefined,
      });
      await db.run(`UPDATE tournaments SET ${assignments} WHERE id = ?`, [...params, id]);
      return requireTournament(id);
    },

    async deleteTournament(id: EntityId) {
      await requireTournament(id);
      // Matches keep their rows and become friendlies (ON DELETE SET NULL).
      await db.run('DELETE FROM tournaments WHERE id = ?', [id]);
    },
  };
}
