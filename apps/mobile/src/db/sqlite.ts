/**
 * The narrow SQLite contract everything above the storage layer is written
 * against.
 *
 * Nothing in `src/db` or `src/lib` imports `expo-sqlite` directly — they take a
 * {@link Database}. That buys two things:
 *
 * 1. **Tests run on Node.** `drivers/node.ts` backs the same contract with
 *    `node:sqlite`, so migrations, repositories and the CSV round-trip are
 *    exercised on a real SQLite engine without a simulator.
 * 2. **The engine stays swappable.** If `expo-sqlite` ever has to give way to
 *    OP-SQLite (see docs/mobile.md), only `drivers/expo.ts` changes.
 *
 * Transaction handling lives here rather than in the drivers so that both
 * back-ends get identical semantics, including nesting via SAVEPOINT.
 */

/** Everything SQLite can hold in a bound parameter. */
export type SqlValue = string | number | null;

/** A result row; column names come straight from the query. */
export type SqlRow = Record<string, SqlValue>;

/** What a driver has to implement. Everything else is built on top of it. */
export interface SqliteConnection {
  /** Run one or more statements with no parameters (DDL, PRAGMAs, BEGIN/COMMIT). */
  execute(sql: string): Promise<void>;
  /** Run a single writing statement. */
  run(sql: string, params?: SqlValue[]): Promise<void>;
  /** Run a single query and materialise every row. */
  select<T extends SqlRow>(sql: string, params?: SqlValue[]): Promise<T[]>;
  close(): Promise<void>;
}

/**
 * A connection plus transaction handling.
 *
 * `transaction` nests: the outermost call is a real BEGIN/COMMIT, inner calls
 * become SAVEPOINTs, so a repository method that already runs inside a
 * transaction still rolls back cleanly on its own.
 */
export class Database implements SqliteConnection {
  readonly #connection: SqliteConnection;
  #depth = 0;

  constructor(connection: SqliteConnection) {
    this.#connection = connection;
  }

  execute(sql: string): Promise<void> {
    return this.#connection.execute(sql);
  }

  run(sql: string, params: SqlValue[] = []): Promise<void> {
    return this.#connection.run(sql, params);
  }

  select<T extends SqlRow>(sql: string, params: SqlValue[] = []): Promise<T[]> {
    return this.#connection.select<T>(sql, params);
  }

  /** The first row of a query, or `null` when it returns nothing. */
  async selectOne<T extends SqlRow>(sql: string, params: SqlValue[] = []): Promise<T | null> {
    const rows = await this.select<T>(sql, params);
    return rows[0] ?? null;
  }

  /** A single scalar (first column of the first row), or `null`. */
  async selectValue(sql: string, params: SqlValue[] = []): Promise<SqlValue> {
    const row = await this.selectOne(sql, params);
    if (row === null) return null;
    const values = Object.values(row);
    return values.length > 0 ? values[0] : null;
  }

  async transaction<T>(task: () => Promise<T>): Promise<T> {
    const depth = this.#depth;
    const savepoint = `sp_${depth}`;
    await this.execute(depth === 0 ? 'BEGIN' : `SAVEPOINT ${savepoint}`);
    this.#depth = depth + 1;
    try {
      const result = await task();
      await this.execute(depth === 0 ? 'COMMIT' : `RELEASE SAVEPOINT ${savepoint}`);
      return result;
    } catch (error) {
      await this.execute(
        depth === 0
          ? 'ROLLBACK'
          : `ROLLBACK TO SAVEPOINT ${savepoint}; RELEASE SAVEPOINT ${savepoint}`,
      );
      throw error;
    } finally {
      this.#depth = depth;
    }
  }

  close(): Promise<void> {
    return this.#connection.close();
  }
}

/**
 * Connection-level pragmas every Tennisfolio database needs, whichever driver
 * opened it.
 *
 * - `foreign_keys` enforces the ON DELETE CASCADE / SET NULL / RESTRICT rules
 *   that mirror the API's schema; SQLite leaves it off by default.
 * - `recursive_triggers` is what makes cascade deletes fire the tombstone
 *   triggers (see `migrations/001-initial-schema.ts`). Without it, deleting a
 *   club would record a tombstone for the club but none for the courts SQLite
 *   cascades away — exactly the hole a future sync engine would fall into.
 */
export const CONNECTION_PRAGMAS = ['PRAGMA foreign_keys = ON', 'PRAGMA recursive_triggers = ON'];

export async function applyConnectionPragmas(db: SqliteConnection): Promise<void> {
  for (const pragma of CONNECTION_PRAGMAS) {
    await db.execute(pragma);
  }
}
