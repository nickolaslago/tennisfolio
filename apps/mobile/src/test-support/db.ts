/**
 * Test helpers for opening a migrated, in-memory database.
 *
 * Not reachable from the app entry point, so `node:sqlite` never enters the
 * Metro bundle.
 */
import { openNodeDatabase } from '@/db/drivers/node';
import { runMigrations } from '@/db/migrate';
import type { Database } from '@/db/sqlite';
import { createRepositories, type Repositories } from '@/lib/repositories';

/** A fresh in-memory database with every migration applied. */
export async function openTestDatabase(): Promise<Database> {
  const db = await openNodeDatabase();
  await runMigrations(db);
  return db;
}

/** A fresh in-memory database plus the repositories bound to it. */
export async function openTestRepositories(): Promise<{ db: Database; repos: Repositories }> {
  const db = await openTestDatabase();
  return { db, repos: createRepositories(db) };
}
