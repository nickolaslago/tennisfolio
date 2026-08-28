/**
 * The on-device driver: `expo-sqlite` behind the {@link SqliteConnection}
 * contract.
 *
 * This is the only module in the app that imports `expo-sqlite`. See
 * docs/mobile.md for why expo-sqlite was chosen over OP-SQLite.
 */
import * as SQLite from 'expo-sqlite';

import { applyConnectionPragmas, Database, type SqlRow, type SqlValue } from '@/db/sqlite';

/** Filename of the app's database inside the Expo SQLite directory. */
export const DATABASE_NAME = 'tennisfolio.db';

function toConnection(db: SQLite.SQLiteDatabase) {
  return {
    execute: (sql: string) => db.execAsync(sql),
    run: async (sql: string, params: SqlValue[] = []) => {
      await db.runAsync(sql, params);
    },
    select: <T extends SqlRow>(sql: string, params: SqlValue[] = []) =>
      db.getAllAsync<T>(sql, params),
    close: () => db.closeAsync(),
  };
}

/**
 * Opens (creating if needed) the app's database and applies the connection
 * pragmas. Migrations are run separately by `openTennisfolioDatabase`.
 */
export async function openExpoDatabase(name: string = DATABASE_NAME): Promise<Database> {
  const native = await SQLite.openDatabaseAsync(name);
  const db = new Database(toConnection(native));
  await applyConnectionPragmas(db);
  return db;
}
