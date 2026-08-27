import { initialSchema } from '@/db/migrations/001-initial-schema';
import type { Migration } from '@/db/migrations/types';

/**
 * Every migration, in application order.
 *
 * Adding a schema change means appending a new file here with the next
 * version number — never editing a released one, since devices that already
 * applied it will not re-run it.
 */
export const MIGRATIONS: Migration[] = [initialSchema];

export type { Migration };
