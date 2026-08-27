/**
 * The test driver: `node:sqlite` behind the {@link SqliteConnection} contract.
 *
 * Only ever imported from tests and `src/test-support`. Metro never reaches it
 * from the app entry point, so `node:sqlite` is not part of the bundle.
 *
 * Using the real SQLite engine (rather than mocking `expo-sqlite`) is the whole
 * point: migrations, foreign keys, CHECK constraints, triggers and the CSV
 * round-trip are all exercised against the same engine that runs on device.
 */
/// <reference types="node" />
import { DatabaseSync } from 'node:sqlite';

import {
  applyConnectionPragmas,
  Database,
  type SqliteConnection,
  type SqlRow,
  type SqlValue,
} from '@/db/sqlite';

function toConnection(native: DatabaseSync): SqliteConnection {
  return {
    execute: async (sql: string) => {
      native.exec(sql);
    },
    run: async (sql: string, params: SqlValue[] = []) => {
      native.prepare(sql).run(...params);
    },
    select: async <T extends SqlRow>(sql: string, params: SqlValue[] = []) =>
      native.prepare(sql).all(...params) as T[],
    close: async () => {
      native.close();
    },
  };
}

/**
 * Opens an in-memory (or file-backed) database with the app's connection
 * pragmas applied. Migrations are run separately — see `src/test-support/db.ts`.
 */
export async function openNodeDatabase(location = ':memory:'): Promise<Database> {
  const db = new Database(toConnection(new DatabaseSync(location)));
  await applyConnectionPragmas(db);
  return db;
}
