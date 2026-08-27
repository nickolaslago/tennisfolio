/**
 * Local-first counterpart of `apps/web/src/lib/api/clubs.ts`.
 *
 * A club owns its courts, managed inline exactly as
 * `apps/api/src/app/routers/clubs.py` does it: create takes a nested `courts`
 * list, and update diffs the submitted list against the stored courts —
 * updating by id, adding new ones, deleting any that are no longer present.
 * There is no separate courts repository for the same reason there is no
 * `/courts` endpoint.
 */
import type {
  Club,
  ClubCreate,
  ClubListParams,
  ClubUpdate,
  Court,
  CourtInput,
  EntityId,
  Page,
} from '@tennisfolio/core';

import { newId } from '@/db/ids';
import type { Database, SqlRow } from '@/db/sqlite';
import { nowIso } from '@/db/time';
import { notFound, throwIfAborted, unprocessable } from '@/lib/repositories/errors';
import {
  buildUpdate,
  Conditions,
  countRows,
  INSERTION_ORDER,
  LIKE_ESCAPE,
  likePattern,
  page,
  resolvePagination,
  toSqlNullable,
} from '@/lib/repositories/shared';

const COLUMNS = 'id, name, city, country, icon, created_at, updated_at';

interface ClubRow extends SqlRow {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

interface CourtRow extends SqlRow {
  id: string;
  club_id: string;
  surface: string;
  environment: string;
}

function toCourt(row: CourtRow): Court {
  return {
    id: row.id,
    surface: row.surface as Court['surface'],
    environment: row.environment as Court['environment'],
  };
}

function toClub(row: ClubRow, courts: Court[]): Club {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    country: row.country,
    icon: row.icon,
    courts,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function conditions(params: ClubListParams): Conditions {
  const where = new Conditions();
  if (params.search) {
    where.add(`name LIKE ? ${LIKE_ESCAPE}`, likePattern(params.search));
  }
  where.addIf(params.country, 'country = ?');
  // The API joins courts and DISTINCTs; EXISTS says the same thing without
  // needing the de-duplication.
  if (params.surface !== undefined || params.environment !== undefined) {
    const courtWhere = new Conditions();
    courtWhere.add('courts.club_id = clubs.id');
    courtWhere.addIf(params.surface, 'courts.surface = ?');
    courtWhere.addIf(params.environment, 'courts.environment = ?');
    where.add(`EXISTS (SELECT 1 FROM courts ${courtWhere.where})`, ...courtWhere.params);
  }
  return where;
}

export interface ClubsRepository {
  listClubs(params?: ClubListParams, signal?: AbortSignal): Promise<Page<Club>>;
  getClub(id: EntityId, signal?: AbortSignal): Promise<Club>;
  createClub(payload: ClubCreate): Promise<Club>;
  updateClub(id: EntityId, payload: ClubUpdate): Promise<Club>;
  deleteClub(id: EntityId): Promise<void>;
}

export function createClubsRepository(db: Database): ClubsRepository {
  /** Courts for a set of clubs, in insertion order (the API's `order_by=Court.id`). */
  async function courtsFor(clubIds: EntityId[]): Promise<Map<string, Court[]>> {
    const byClub = new Map<string, Court[]>();
    if (clubIds.length === 0) return byClub;
    const placeholders = clubIds.map(() => '?').join(', ');
    const rows = await db.select<CourtRow>(
      `SELECT id, club_id, surface, environment FROM courts
       WHERE club_id IN (${placeholders}) ORDER BY ${INSERTION_ORDER}`,
      clubIds,
    );
    for (const row of rows) {
      const bucket = byClub.get(row.club_id) ?? [];
      bucket.push(toCourt(row));
      byClub.set(row.club_id, bucket);
    }
    return byClub;
  }

  async function requireClub(id: EntityId): Promise<Club> {
    const row = await db.selectOne<ClubRow>(`SELECT ${COLUMNS} FROM clubs WHERE id = ?`, [id]);
    if (row === null) throw notFound('Club', id);
    return toClub(row, (await courtsFor([id])).get(id) ?? []);
  }

  async function insertCourt(clubId: EntityId, court: CourtInput, now: string): Promise<void> {
    await db.run(
      `INSERT INTO courts (id, club_id, surface, environment, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [newId(), clubId, court.surface, court.environment, now, now],
    );
  }

  /**
   * Diffs `courts` against the club's stored courts: update by id, add the
   * new, drop the rest — a direct port of the API's `_apply_courts`.
   *
   * Deletes run before inserts so that freeing a `(surface, environment)` pair
   * and re-adding it in the same call cannot trip the unique constraint.
   */
  async function applyCourts(clubId: EntityId, courts: CourtInput[], now: string): Promise<void> {
    const existing = await db.select<CourtRow>(
      'SELECT id, club_id, surface, environment FROM courts WHERE club_id = ?',
      [clubId],
    );
    const existingIds = new Set(existing.map((row) => row.id));
    const keep = new Set<string>();

    for (const court of courts) {
      if (court.id !== undefined && existingIds.has(court.id)) keep.add(court.id);
    }

    for (const row of existing) {
      if (!keep.has(row.id)) {
        await db.run('DELETE FROM courts WHERE id = ?', [row.id]);
      }
    }

    for (const court of courts) {
      if (court.id !== undefined && keep.has(court.id)) {
        await db.run(
          'UPDATE courts SET surface = ?, environment = ?, updated_at = ? WHERE id = ?',
          [court.surface, court.environment, now, court.id],
        );
      } else {
        await insertCourt(clubId, court, now);
      }
    }
  }

  /** The unique constraint the API inherits from `uq_courts_club_surface_env`. */
  function assertCourtsDistinct(courts: CourtInput[]): void {
    const seen = new Set<string>();
    for (const court of courts) {
      const key = `${court.surface}|${court.environment}`;
      if (seen.has(key)) {
        throw unprocessable(`A club cannot have two ${court.environment} ${court.surface} courts.`);
      }
      seen.add(key);
    }
  }

  return {
    async listClubs(params: ClubListParams = {}, signal?: AbortSignal) {
      throwIfAborted(signal);
      const pagination = resolvePagination(params);
      const where = conditions(params);

      const total = await countRows(
        db,
        `SELECT COUNT(*) AS total FROM clubs ${where.where}`,
        where.params,
      );
      const rows = await db.select<ClubRow>(
        `SELECT ${COLUMNS} FROM clubs ${where.where} ORDER BY name LIMIT ? OFFSET ?`,
        [...where.params, pagination.limit, pagination.offset],
      );
      const courts = await courtsFor(rows.map((row) => row.id));
      return page(
        rows.map((row) => toClub(row, courts.get(row.id) ?? [])),
        total,
        pagination,
      );
    },

    async getClub(id: EntityId, signal?: AbortSignal) {
      throwIfAborted(signal);
      return requireClub(id);
    },

    async createClub(payload: ClubCreate) {
      const courts = payload.courts ?? [];
      assertCourtsDistinct(courts);
      const id = newId();
      const now = nowIso();
      await db.transaction(async () => {
        await db.run(`INSERT INTO clubs (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
          id,
          payload.name.trim(),
          toSqlNullable(payload.city),
          toSqlNullable(payload.country),
          toSqlNullable(payload.icon),
          now,
          now,
        ]);
        for (const court of courts) {
          await insertCourt(id, court, now);
        }
      });
      return requireClub(id);
    },

    async updateClub(id: EntityId, payload: ClubUpdate) {
      await requireClub(id);
      if (payload.courts !== undefined) assertCourtsDistinct(payload.courts);
      const now = nowIso();
      const { assignments, params } = buildUpdate(
        {
          name: 'name' in payload ? payload.name?.trim() : undefined,
          city: 'city' in payload ? toSqlNullable(payload.city) : undefined,
          country: 'country' in payload ? toSqlNullable(payload.country) : undefined,
          icon: 'icon' in payload ? toSqlNullable(payload.icon) : undefined,
        },
        now,
      );
      await db.transaction(async () => {
        await db.run(`UPDATE clubs SET ${assignments} WHERE id = ?`, [...params, id]);
        if (payload.courts !== undefined) {
          await applyCourts(id, payload.courts, now);
        }
      });
      return requireClub(id);
    },

    async deleteClub(id: EntityId) {
      await requireClub(id);
      // Courts cascade; matches and tournaments keep their rows with a null
      // club_id (ON DELETE SET NULL), exactly as in Postgres.
      await db.run('DELETE FROM clubs WHERE id = ?', [id]);
    },
  };
}
