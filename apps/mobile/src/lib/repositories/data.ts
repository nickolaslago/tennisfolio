/**
 * Whole-database operations: the local-first counterparts of
 * `apps/web/src/lib/api/data-reset.ts`, `import.ts` and `export.ts`.
 *
 * The web client's import/export functions are wrappers around an HTTP upload
 * and a browser download. There is no browser here, so this layer stops at the
 * data: `exportCsvBundle` hands back the six CSVs as text and
 * `importCsvBundle` takes them the same way. Turning those into a zip on disk
 * and into a share sheet is a separate concern (and a later ticket) that should
 * not reach into SQLite.
 */
import type { ImportResult } from '@tennisfolio/core';

import type { Database } from '@/db/sqlite';
import { WIPE_ORDER } from '@/db/tables';
import { exportCsvBundle } from '@/lib/transfer/export';
import { importCsvBundle } from '@/lib/transfer/import';
import type { CsvBundle } from '@/lib/transfer/format';

export interface DataRepository {
  /** Wipes every user-data table. Deletions are tombstoned, as everywhere else. */
  deleteAllData(): Promise<void>;
  /** The six CSVs of `GET /export/csv`, as text. */
  exportCsvBundle(): Promise<CsvBundle>;
  /** Wipe + replace from a CSV bundle; mirrors `POST /import`. */
  importCsvBundle(bundle: Partial<CsvBundle>): Promise<ImportResult>;
}

export function createDataRepository(db: Database): DataRepository {
  return {
    async deleteAllData() {
      await db.transaction(async () => {
        for (const table of WIPE_ORDER) {
          await db.run(`DELETE FROM ${table}`);
        }
      });
    },

    exportCsvBundle: () => exportCsvBundle(db),

    importCsvBundle: (bundle: Partial<CsvBundle>) => importCsvBundle(db, bundle),
  };
}
