/**
 * Local-first counterpart of `apps/web/src/lib/api/opponents.ts`.
 *
 * Same five operations, same parameters, same result shapes — served from
 * SQLite instead of `/opponents`. Filters and ordering mirror
 * `apps/api/src/app/routers/opponents.py`.
 */
import type {
  EntityId,
  Opponent,
  OpponentCreate,
  OpponentListParams,
  OpponentUpdate,
  Page,
} from '@tennisfolio/core';

import { newId } from '@/db/ids';
import type { Database, SqlRow } from '@/db/sqlite';
import { nowIso } from '@/db/time';
import { conflict, notFound, throwIfAborted } from '@/lib/repositories/errors';
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

const COLUMNS = `id, last_name, name, nationality, handedness, age_range, level, notes, icon,
                 created_at, updated_at`;

interface OpponentRow extends SqlRow {
  id: string;
  last_name: string;
  name: string | null;
  nationality: string | null;
  handedness: string | null;
  age_range: string | null;
  level: string | null;
  notes: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

function toOpponent(row: OpponentRow): Opponent {
  return {
    id: row.id,
    last_name: row.last_name,
    name: row.name,
    nationality: row.nationality,
    handedness: row.handedness as Opponent['handedness'],
    age_range: row.age_range as Opponent['age_range'],
    level: row.level,
    notes: row.notes,
    icon: row.icon,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Shared by list and count so the two can never drift. */
function conditions(params: OpponentListParams): Conditions {
  const where = new Conditions();
  if (params.search) {
    const pattern = likePattern(params.search);
    where.add(`(last_name LIKE ? ${LIKE_ESCAPE} OR name LIKE ? ${LIKE_ESCAPE})`, pattern, pattern);
  }
  where.addIf(params.handedness, 'handedness = ?');
  where.addIf(params.age_range, 'age_range = ?');
  return where;
}

export interface OpponentsRepository {
  listOpponents(params?: OpponentListParams, signal?: AbortSignal): Promise<Page<Opponent>>;
  getOpponent(id: EntityId, signal?: AbortSignal): Promise<Opponent>;
  createOpponent(payload: OpponentCreate): Promise<Opponent>;
  updateOpponent(id: EntityId, payload: OpponentUpdate): Promise<Opponent>;
  deleteOpponent(id: EntityId): Promise<void>;
}

export function createOpponentsRepository(db: Database): OpponentsRepository {
  async function requireOpponent(id: EntityId): Promise<Opponent> {
    const row = await db.selectOne<OpponentRow>(`SELECT ${COLUMNS} FROM opponents WHERE id = ?`, [
      id,
    ]);
    if (row === null) throw notFound('Opponent', id);
    return toOpponent(row);
  }

  return {
    async listOpponents(params: OpponentListParams = {}, signal?: AbortSignal) {
      throwIfAborted(signal);
      const pagination = resolvePagination(params);
      const where = conditions(params);

      const total = await countRows(
        db,
        `SELECT COUNT(*) AS total FROM opponents ${where.where}`,
        where.params,
      );
      const rows = await db.select<OpponentRow>(
        `SELECT ${COLUMNS} FROM opponents ${where.where}
         ORDER BY last_name LIMIT ? OFFSET ?`,
        [...where.params, pagination.limit, pagination.offset],
      );
      return page(rows.map(toOpponent), total, pagination);
    },

    async getOpponent(id: EntityId, signal?: AbortSignal) {
      throwIfAborted(signal);
      return requireOpponent(id);
    },

    async createOpponent(payload: OpponentCreate) {
      const id = newId();
      const now = nowIso();
      await db.run(
        `INSERT INTO opponents (${COLUMNS})
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          payload.last_name.trim(),
          toSqlNullable(payload.name),
          toSqlNullable(payload.nationality),
          payload.handedness ?? null,
          payload.age_range ?? null,
          toSqlNullable(payload.level),
          toSqlNullable(payload.notes),
          toSqlNullable(payload.icon),
          now,
          now,
        ],
      );
      return requireOpponent(id);
    },

    async updateOpponent(id: EntityId, payload: OpponentUpdate) {
      await requireOpponent(id);
      const { assignments, params } = buildUpdate({
        last_name: 'last_name' in payload ? payload.last_name?.trim() : undefined,
        name: 'name' in payload ? toSqlNullable(payload.name) : undefined,
        nationality: 'nationality' in payload ? toSqlNullable(payload.nationality) : undefined,
        handedness: 'handedness' in payload ? (payload.handedness ?? null) : undefined,
        age_range: 'age_range' in payload ? (payload.age_range ?? null) : undefined,
        level: 'level' in payload ? toSqlNullable(payload.level) : undefined,
        notes: 'notes' in payload ? toSqlNullable(payload.notes) : undefined,
        icon: 'icon' in payload ? toSqlNullable(payload.icon) : undefined,
      });
      await db.run(`UPDATE opponents SET ${assignments} WHERE id = ?`, [...params, id]);
      return requireOpponent(id);
    },

    async deleteOpponent(id: EntityId) {
      await requireOpponent(id);
      // The schema's ON DELETE RESTRICT would raise a bare SQLite error; the
      // API answers 409 with this message, so check first and say the same.
      const matches = await countRows(
        db,
        'SELECT COUNT(*) AS total FROM matches WHERE opponent_id = ?',
        [id],
      );
      if (matches > 0) {
        throw conflict(`Opponent ${id} has matches and cannot be deleted`);
      }
      await db.run('DELETE FROM opponents WHERE id = ?', [id]);
    },
  };
}
