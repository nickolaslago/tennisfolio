/**
 * Local-first counterpart of `apps/web/src/lib/api/matches.ts`.
 *
 * The derived-data rule holds here exactly as it does in the API
 * (`app/routers/matches.py`) and the web app: a match's **result**, **score
 * string**, **set breakdown**, **surface** and **match type** are computed on
 * every read and never stored. The only thing persisted is the set rows, and
 * they are validated by `@tennisfolio/core`'s `parseScore` — the same parser
 * the web app and (via its Python mirror) the API use — before anything is
 * written.
 *
 * Create and update accept either a `score` string or nested `sets`, and both
 * forms are normalised through that one parser, so neither can produce data the
 * other would reject.
 */
import {
  computeMatchResult,
  formatScore,
  InvalidScoreError,
  parseScore,
  type EntityId,
  type Match,
  type MatchCreate,
  type MatchListParams,
  type MatchUpdate,
  type Page,
  type ScoredSet,
  type SetRead,
} from '@tennisfolio/core';

import { newId } from '@/db/ids';
import type { Database, SqlRow } from '@/db/sqlite';
import { nowIso } from '@/db/time';
import { notFound, throwIfAborted, unprocessable } from '@/lib/repositories/errors';
import {
  buildUpdate,
  Conditions,
  countRows,
  fromSqlBoolean,
  INSERTION_ORDER,
  page,
  resolvePagination,
  toSqlBoolean,
  toSqlNullable,
} from '@/lib/repositories/shared';

const COLUMNS = `id, match_date, opponent_id, club_id, tournament_id, court_id, stage,
                 duration_min, notes, status, created_at, updated_at`;

interface MatchRow extends SqlRow {
  id: string;
  match_date: string;
  opponent_id: string;
  club_id: string | null;
  tournament_id: string | null;
  court_id: string | null;
  stage: string | null;
  duration_min: number | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface SetRow extends SqlRow {
  id: string;
  match_id: string;
  set_no: number;
  games_won: number;
  games_lost: number;
  tiebreak: number;
}

/** Set rows as the core parser's `ScoredSet`, with `result` derived. */
function toScoredSet(row: SetRow): ScoredSet {
  return {
    setNo: row.set_no,
    gamesWon: row.games_won,
    gamesLost: row.games_lost,
    tiebreak: fromSqlBoolean(row.tiebreak),
    result: row.games_won > row.games_lost ? 'Win' : 'Loss',
  };
}

function toSetRead(set: ScoredSet): SetRead {
  return {
    set_no: set.setNo,
    games_won: set.gamesWon,
    games_lost: set.gamesLost,
    tiebreak: set.tiebreak,
    result: set.result,
  };
}

/** Assembles the read model, deriving everything derivable. */
function toMatch(row: MatchRow, sets: ScoredSet[], surface: Match['surface']): Match {
  return {
    id: row.id,
    match_date: row.match_date,
    opponent_id: row.opponent_id,
    club_id: row.club_id,
    court_id: row.court_id,
    tournament_id: row.tournament_id,
    stage: row.stage,
    surface,
    duration_min: row.duration_min,
    notes: row.notes,
    status: row.status as Match['status'],
    match_type: row.tournament_id === null ? 'Friendly' : 'Competitive',
    result: sets.length > 0 ? computeMatchResult(sets) : null,
    score: sets.length > 0 ? formatScore(sets) : null,
    sets: sets.map(toSetRead),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function conditions(params: MatchListParams): Conditions {
  const where = new Conditions();
  where.addIf(params.opponent_id, 'opponent_id = ?');
  where.addIf(params.club_id, 'club_id = ?');
  where.addIf(params.tournament_id, 'tournament_id = ?');
  where.addIf(params.status, 'status = ?');
  where.addIf(params.date_from, 'match_date >= ?');
  where.addIf(params.date_to, 'match_date <= ?');
  if (params.surface !== undefined) {
    // The API inner-joins courts, so a match with no court is filtered out too.
    where.add(
      'EXISTS (SELECT 1 FROM courts WHERE courts.id = matches.court_id AND courts.surface = ?)',
      params.surface,
    );
  }
  return where;
}

export interface MatchesRepository {
  listMatches(params?: MatchListParams, signal?: AbortSignal): Promise<Page<Match>>;
  getMatch(id: EntityId, signal?: AbortSignal): Promise<Match>;
  createMatch(payload: MatchCreate): Promise<Match>;
  updateMatch(id: EntityId, payload: MatchUpdate): Promise<Match>;
  deleteMatch(id: EntityId): Promise<void>;
}

export function createMatchesRepository(db: Database): MatchesRepository {
  /**
   * Validates a score string or a nested set list through the one canonical
   * parser. Nested sets are normalised to a score string first, so both forms
   * are held to exactly the same rules — the API's `_parse_sets`.
   */
  function parseSets(payload: Pick<MatchCreate, 'score' | 'sets'>): ScoredSet[] {
    const score =
      payload.score ??
      (payload.sets ?? []).map((set) => `${set.games_won}-${set.games_lost}`).join(' ');
    try {
      return parseScore(score);
    } catch (error) {
      if (error instanceof InvalidScoreError) throw unprocessable(error.message);
      throw error;
    }
  }

  async function setsFor(matchIds: EntityId[]): Promise<Map<string, ScoredSet[]>> {
    const bySet = new Map<string, ScoredSet[]>();
    if (matchIds.length === 0) return bySet;
    const placeholders = matchIds.map(() => '?').join(', ');
    const rows = await db.select<SetRow>(
      `SELECT id, match_id, set_no, games_won, games_lost, tiebreak FROM sets
       WHERE match_id IN (${placeholders}) ORDER BY match_id, set_no`,
      matchIds,
    );
    for (const row of rows) {
      const bucket = bySet.get(row.match_id) ?? [];
      bucket.push(toScoredSet(row));
      bySet.set(row.match_id, bucket);
    }
    return bySet;
  }

  /** A match's surface, derived through its court. */
  async function surfacesFor(courtIds: string[]): Promise<Map<string, Match['surface']>> {
    const byCourt = new Map<string, Match['surface']>();
    if (courtIds.length === 0) return byCourt;
    const placeholders = courtIds.map(() => '?').join(', ');
    const rows = await db.select<{ id: string; surface: string }>(
      `SELECT id, surface FROM courts WHERE id IN (${placeholders})`,
      courtIds,
    );
    for (const row of rows) {
      byCourt.set(row.id, row.surface as Match['surface']);
    }
    return byCourt;
  }

  async function hydrate(rows: MatchRow[]): Promise<Match[]> {
    const sets = await setsFor(rows.map((row) => row.id));
    const courtIds = rows.map((row) => row.court_id).filter((id): id is string => id !== null);
    const surfaces = await surfacesFor([...new Set(courtIds)]);
    return rows.map((row) =>
      toMatch(
        row,
        sets.get(row.id) ?? [],
        row.court_id ? (surfaces.get(row.court_id) ?? null) : null,
      ),
    );
  }

  async function requireMatch(id: EntityId): Promise<Match> {
    const row = await db.selectOne<MatchRow>(`SELECT ${COLUMNS} FROM matches WHERE id = ?`, [id]);
    if (row === null) throw notFound('Match', id);
    return (await hydrate([row]))[0];
  }

  async function requireExists(table: string, resourceName: string, id: EntityId): Promise<void> {
    const found = await db.selectValue(`SELECT id FROM ${table} WHERE id = ?`, [id]);
    if (found === null) throw notFound(resourceName, id);
  }

  /** 404 on any referenced row that doesn't exist, before anything is written. */
  async function checkRelatedExist(payload: MatchUpdate): Promise<void> {
    if (payload.opponent_id !== undefined) {
      await requireExists('opponents', 'Opponent', payload.opponent_id);
    }
    if (payload.club_id) await requireExists('clubs', 'Club', payload.club_id);
    if (payload.tournament_id)
      await requireExists('tournaments', 'Tournament', payload.tournament_id);
  }

  /** A match's court must exist and belong to the match's own club. */
  async function validateCourt(
    clubId: EntityId | null | undefined,
    courtId: EntityId | null | undefined,
  ): Promise<void> {
    if (courtId === null || courtId === undefined) return;
    const court = await db.selectOne<{ id: string; club_id: string }>(
      'SELECT id, club_id FROM courts WHERE id = ?',
      [courtId],
    );
    if (court === null) throw notFound('Court', courtId);
    if (!clubId || court.club_id !== clubId) {
      throw unprocessable("Court does not belong to the match's club.");
    }
  }

  /**
   * Reconciles the stored set rows with `scored`, matching on `set_no`.
   *
   * The API rewrites the whole collection; diffing instead keeps a set's row id
   * stable when its score is unchanged, which matters for sync: an edit that
   * only touches set 3 should not look to a future sync engine like every set
   * was deleted and recreated.
   */
  async function applySets(matchId: EntityId, scored: ScoredSet[], now: string): Promise<void> {
    const existing = await db.select<SetRow>(
      'SELECT id, match_id, set_no, games_won, games_lost, tiebreak FROM sets WHERE match_id = ?',
      [matchId],
    );
    const bySetNo = new Map(existing.map((row) => [row.set_no, row]));
    const keep = new Set(scored.map((set) => set.setNo));

    for (const row of existing) {
      if (!keep.has(row.set_no)) {
        await db.run('DELETE FROM sets WHERE id = ?', [row.id]);
      }
    }

    for (const set of scored) {
      const row = bySetNo.get(set.setNo);
      const tiebreak = toSqlBoolean(set.tiebreak);
      if (row === undefined) {
        await db.run(
          `INSERT INTO sets (id, match_id, set_no, games_won, games_lost, tiebreak,
                             created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [newId(), matchId, set.setNo, set.gamesWon, set.gamesLost, tiebreak, now, now],
        );
      } else if (
        row.games_won !== set.gamesWon ||
        row.games_lost !== set.gamesLost ||
        row.tiebreak !== tiebreak
      ) {
        await db.run(
          `UPDATE sets SET games_won = ?, games_lost = ?, tiebreak = ?, updated_at = ?
           WHERE id = ?`,
          [set.gamesWon, set.gamesLost, tiebreak, now, row.id],
        );
      }
    }
  }

  return {
    async listMatches(params: MatchListParams = {}, signal?: AbortSignal) {
      throwIfAborted(signal);
      const pagination = resolvePagination(params);
      const where = conditions(params);

      const total = await countRows(
        db,
        `SELECT COUNT(*) AS total FROM matches ${where.where}`,
        where.params,
      );
      const rows = await db.select<MatchRow>(
        `SELECT ${COLUMNS} FROM matches ${where.where}
         ORDER BY match_date DESC, ${INSERTION_ORDER} DESC LIMIT ? OFFSET ?`,
        [...where.params, pagination.limit, pagination.offset],
      );
      return page(await hydrate(rows), total, pagination);
    },

    async getMatch(id: EntityId, signal?: AbortSignal) {
      throwIfAborted(signal);
      return requireMatch(id);
    },

    async createMatch(payload: MatchCreate) {
      await checkRelatedExist(payload);
      await validateCourt(payload.club_id, payload.court_id);

      const hasResult = payload.score !== undefined || payload.sets !== undefined;
      const scored = hasResult ? parseSets(payload) : [];

      const id = newId();
      const now = nowIso();
      await db.transaction(async () => {
        await db.run(
          `INSERT INTO matches (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            payload.match_date,
            payload.opponent_id,
            payload.club_id ?? null,
            payload.tournament_id ?? null,
            payload.court_id ?? null,
            toSqlNullable(payload.stage),
            payload.duration_min ?? null,
            toSqlNullable(payload.notes),
            scored.length > 0 ? 'played' : 'scheduled',
            now,
            now,
          ],
        );
        await applySets(id, scored, now);
      });
      return requireMatch(id);
    },

    async updateMatch(id: EntityId, payload: MatchUpdate) {
      const current = await requireMatch(id);
      await checkRelatedExist(payload);

      const clubId = 'club_id' in payload ? (payload.club_id ?? null) : current.club_id;
      const courtId = 'court_id' in payload ? (payload.court_id ?? null) : current.court_id;
      await validateCourt(clubId, courtId);

      const scoreTouched = 'score' in payload || 'sets' in payload;
      // An explicit null on both clears the result and reverts to scheduled.
      const clearing = scoreTouched && !payload.score && !payload.sets;
      const scored = scoreTouched && !clearing ? parseSets(payload) : [];

      const now = nowIso();
      const { assignments, params } = buildUpdate(
        {
          match_date: 'match_date' in payload ? payload.match_date : undefined,
          opponent_id: 'opponent_id' in payload ? payload.opponent_id : undefined,
          club_id: 'club_id' in payload ? (payload.club_id ?? null) : undefined,
          tournament_id: 'tournament_id' in payload ? (payload.tournament_id ?? null) : undefined,
          court_id: 'court_id' in payload ? (payload.court_id ?? null) : undefined,
          stage: 'stage' in payload ? toSqlNullable(payload.stage) : undefined,
          duration_min: 'duration_min' in payload ? (payload.duration_min ?? null) : undefined,
          notes: 'notes' in payload ? toSqlNullable(payload.notes) : undefined,
          status: scoreTouched ? (clearing ? 'scheduled' : 'played') : undefined,
        },
        now,
      );

      await db.transaction(async () => {
        await db.run(`UPDATE matches SET ${assignments} WHERE id = ?`, [...params, id]);
        if (scoreTouched) await applySets(id, scored, now);
      });
      return requireMatch(id);
    },

    async deleteMatch(id: EntityId) {
      await requireMatch(id);
      // Sets cascade, and their tombstones are recorded by the delete trigger.
      await db.run('DELETE FROM matches WHERE id = ?', [id]);
    },
  };
}
