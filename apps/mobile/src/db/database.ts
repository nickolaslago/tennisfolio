/**
 * The app's single database handle.
 *
 * Screens never call this — they go through `src/lib/repositories`. It exists
 * so that opening the file and running migrations happens exactly once per
 * launch, no matter how many components mount at the same time.
 */
import { DATABASE_NAME, openExpoDatabase } from '@/db/drivers/expo';
import { runMigrations, type MigrationOutcome } from '@/db/migrate';
import type { Database } from '@/db/sqlite';

let pending: Promise<Database> | null = null;

/**
 * Opens the database and brings it up to the latest schema version.
 *
 * The in-flight promise is memoised rather than the resolved value, so
 * concurrent first calls share one open + migrate rather than racing.
 */
export function getDatabase(): Promise<Database> {
  pending ??= (async () => {
    const db = await openExpoDatabase(DATABASE_NAME);
    await runMigrations(db);
    return db;
  })().catch((error: unknown) => {
    // A failed open must not poison every later call with the same rejection.
    pending = null;
    throw error;
  });
  return pending;
}

/** Closes the handle and forgets it; the next `getDatabase()` reopens. */
export async function closeDatabase(): Promise<void> {
  const current = pending;
  pending = null;
  if (current === null) return;
  const db = await current.catch(() => null);
  await db?.close();
}

/**
 * Runs migrations against an already-open database and reports what it did.
 * Exposed for a diagnostics screen; the normal path is {@link getDatabase}.
 */
export function migrate(db: Database): Promise<MigrationOutcome> {
  return runMigrations(db);
}
