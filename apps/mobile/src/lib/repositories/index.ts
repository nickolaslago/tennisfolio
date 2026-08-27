/**
 * The storage-agnostic boundary screens are written against.
 *
 * Everything below this line — SQL, migrations, UUIDs, `updated_at` stamping,
 * tombstones — is an implementation detail. Screens import from here (or the
 * `useRepositories` hook) and get functions with the same names, arguments and
 * result shapes as `apps/web/src/lib/api/*.ts`, returning types from
 * `@tennisfolio/core`. **No screen should ever import from `@/db`.**
 *
 * That is what makes the Cloud Connect milestone a matter of adding a sync
 * engine underneath rather than rewriting the UI: an HTTP-backed
 * implementation of these same signatures would be a drop-in.
 */
import type { Database } from '@/db/sqlite';
import { createClubsRepository, type ClubsRepository } from '@/lib/repositories/clubs';
import { createDataRepository, type DataRepository } from '@/lib/repositories/data';
import { createMatchesRepository, type MatchesRepository } from '@/lib/repositories/matches';
import { createOpponentsRepository, type OpponentsRepository } from '@/lib/repositories/opponents';
import {
  createTournamentsRepository,
  type TournamentsRepository,
} from '@/lib/repositories/tournaments';

export type Repositories = ClubsRepository &
  OpponentsRepository &
  TournamentsRepository &
  MatchesRepository &
  DataRepository;

/**
 * Binds every repository to one database handle.
 *
 * The operations are merged into a single flat namespace so a call reads the
 * same as its web counterpart (`repos.listClubs(...)` against
 * `api.listClubs(...)`); the per-entity modules stay separate behind it.
 */
export function createRepositories(db: Database): Repositories {
  return {
    ...createClubsRepository(db),
    ...createOpponentsRepository(db),
    ...createTournamentsRepository(db),
    ...createMatchesRepository(db),
    ...createDataRepository(db),
  };
}

export type { ClubsRepository, DataRepository, MatchesRepository, OpponentsRepository };
export type { TournamentsRepository };
export { RepositoryError } from '@/lib/repositories/errors';
export type { CsvBundle, CsvFilename } from '@/lib/transfer/format';
