/**
 * A versioned, forward-only migration runner — the on-device equivalent of the
 * API's Alembic setup.
 *
 * The applied version is tracked twice, on purpose:
 *
 * - `PRAGMA user_version` is the authority. It is a single integer in the
 *   database header, readable without a table lookup, and it is updated inside
 *   the same transaction as the migration's own statements. That makes "is this
 *   database up to date?" a constant-time question on every app launch.
 * - `schema_migrations` is the audit trail (which name, applied when). Nothing
 *   branches on it; it exists so a support log can say *what* a device ran.
 *
 * Each migration runs in its own transaction, so a failure leaves the database
 * on the last version that fully applied rather than half-migrated.
 */
import { MIGRATIONS, type Migration } from '@/db/migrations';
import { nowIso } from '@/db/time';
import type { Database } from '@/db/sqlite';

/** The version a freshly-shipped binary expects to find. */
export const LATEST_VERSION = MIGRATIONS.reduce((max, m) => Math.max(max, m.version), 0);

export interface MigrationOutcome {
  /** The `user_version` found before anything ran. */
  fromVersion: number;
  /** The `user_version` in force afterwards. */
  toVersion: number;
  /** Names of the migrations applied by this call, in order. */
  applied: string[];
}

export class MigrationError extends Error {
  readonly version: number;

  constructor(version: number, name: string, cause: unknown) {
    super(`Migration ${version} (${name}) failed: ${String(cause)}`);
    this.name = 'MigrationError';
    this.version = version;
    this.cause = cause;
  }
}

async function readUserVersion(db: Database): Promise<number> {
  const value = await db.selectValue('PRAGMA user_version');
  return typeof value === 'number' ? value : 0;
}

/**
 * Guards the one place a value is interpolated into SQL rather than bound:
 * `PRAGMA user_version = ?` is not a thing SQLite accepts.
 */
function assertSafeVersion(version: number): void {
  if (!Number.isInteger(version) || version < 0) {
    throw new Error(`Migration version must be a non-negative integer, got ${version}`);
  }
}

/** Rejects a migration list that could silently skip or re-run a step. */
export function assertMigrationsWellFormed(migrations: Migration[]): void {
  migrations.forEach((migration, index) => {
    const expected = index + 1;
    if (migration.version !== expected) {
      throw new Error(
        `Migrations must be contiguous and start at 1: expected version ${expected} at ` +
          `position ${index}, got ${migration.version} (${migration.name}).`,
      );
    }
  });
}

/**
 * Brings `db` up to the latest schema version, applying only what is missing.
 *
 * Safe to call on every launch: an already-current database does no work beyond
 * reading `user_version`.
 */
export async function runMigrations(
  db: Database,
  migrations: Migration[] = MIGRATIONS,
): Promise<MigrationOutcome> {
  assertMigrationsWellFormed(migrations);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);

  const fromVersion = await readUserVersion(db);
  const pending = migrations.filter((migration) => migration.version > fromVersion);
  const applied: string[] = [];

  for (const migration of pending) {
    assertSafeVersion(migration.version);
    try {
      await db.transaction(async () => {
        for (const statement of migration.statements) {
          await db.execute(statement);
        }
        await db.run('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)', [
          migration.version,
          migration.name,
          nowIso(),
        ]);
        await db.execute(`PRAGMA user_version = ${migration.version}`);
      });
    } catch (error) {
      throw new MigrationError(migration.version, migration.name, error);
    }
    applied.push(migration.name);
  }

  return { fromVersion, toVersion: await readUserVersion(db), applied };
}
