/**
 * The six user-data tables, named once so callers cannot disagree about them.
 */

/** Every table holding user data, mirroring `apps/api/src/app/models/`. */
export const ENTITY_TABLES = [
  'opponents',
  'clubs',
  'courts',
  'tournaments',
  'matches',
  'sets',
] as const;

export type EntityTable = (typeof ENTITY_TABLES)[number];

/**
 * The order a full wipe has to delete in: children before parents, so no
 * statement trips a foreign key. Matches the API's `seed_import.wipe_all`.
 */
export const WIPE_ORDER: readonly EntityTable[] = [
  'sets',
  'matches',
  'courts',
  'tournaments',
  'clubs',
  'opponents',
];
