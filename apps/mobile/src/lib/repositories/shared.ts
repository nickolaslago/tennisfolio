/**
 * Plumbing shared by the four repositories: pagination, WHERE-clause assembly,
 * the `updated_at` discipline, and the row ordering the export relies on.
 */
import type { ListParams, Page } from '@tennisfolio/core';

import { nowIso } from '@/db/time';
import type { Database, SqlValue } from '@/db/sqlite';

/** Matches the API's `Query(default=50, ge=1, le=200)` / `ge=0`. */
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;

export interface Pagination {
  limit: number;
  offset: number;
}

export function resolvePagination(params: ListParams): Pagination {
  const limit = Math.min(Math.max(Math.trunc(params.limit ?? DEFAULT_LIMIT), 1), MAX_LIMIT);
  const offset = Math.max(Math.trunc(params.offset ?? 0), 0);
  return { limit, offset };
}

/** Accumulates `WHERE` fragments and their bound parameters together. */
export class Conditions {
  readonly clauses: string[] = [];
  readonly params: SqlValue[] = [];

  add(clause: string, ...params: SqlValue[]): this {
    this.clauses.push(clause);
    this.params.push(...params);
    return this;
  }

  /** Adds `clause` only when `value` was actually supplied. */
  addIf(value: SqlValue | undefined, clause: string, param?: SqlValue): this {
    if (value === undefined) return this;
    return this.add(clause, param === undefined ? value : param);
  }

  get where(): string {
    return this.clauses.length > 0 ? `WHERE ${this.clauses.join(' AND ')}` : '';
  }
}

/**
 * `%term%` for a case-insensitive `LIKE`, with LIKE's own wildcards escaped so
 * a user searching for "50%" does not match everything.
 *
 * SQLite's `LIKE` is case-insensitive for ASCII by default, which is what the
 * API's Postgres `ILIKE` gives for the same input; neither folds case beyond
 * ASCII without a collation.
 */
export function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/** `LIKE ... ESCAPE` — pairs with {@link likePattern}. */
export const LIKE_ESCAPE = "ESCAPE '\\'";

export function page<T>(items: T[], total: number, pagination: Pagination): Page<T> {
  return { items, total, limit: pagination.limit, offset: pagination.offset };
}

export async function countRows(
  db: Database,
  sql: string,
  params: SqlValue[] = [],
): Promise<number> {
  const value = await db.selectValue(sql, params);
  return typeof value === 'number' ? value : 0;
}

/**
 * Export and list ordering fall back to SQLite's implicit `rowid`, which is
 * insertion order.
 *
 * The API orders by its integer primary key. UUIDs carry no order, so `rowid`
 * is the closest equivalent: it is what makes a CSV export come back in the
 * order it was imported, and it keeps `ORDER BY match_date DESC, ...` stable
 * for matches played on the same day.
 */
export const INSERTION_ORDER = 'rowid';

/** SQLite has no boolean type; the schema stores 0/1. */
export function toSqlBoolean(value: boolean): number {
  return value ? 1 : 0;
}

export function fromSqlBoolean(value: SqlValue): boolean {
  return value === 1;
}

/** Normalises an optional payload field to what the schema stores. */
export function toSqlNullable(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Builds the `SET` clause of an UPDATE from the fields a `*Update` payload
 * actually carries, mirroring Pydantic's `exclude_unset=True`, and always
 * stamps `updated_at`.
 *
 * Every write in this layer goes through here or through an INSERT that sets
 * `updated_at` explicitly — the invariant a future sync engine depends on.
 */
export function buildUpdate(
  values: Record<string, SqlValue | undefined>,
  timestamp: string = nowIso(),
): { assignments: string; params: SqlValue[] } {
  const columns: string[] = [];
  const params: SqlValue[] = [];
  for (const [column, value] of Object.entries(values)) {
    if (value === undefined) continue;
    columns.push(`${column} = ?`);
    params.push(value);
  }
  columns.push('updated_at = ?');
  params.push(timestamp);
  return { assignments: columns.join(', '), params };
}
