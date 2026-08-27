import type { Migration } from '@/db/migrations/types';

/**
 * The initial local schema — a faithful mirror of
 * `apps/api/src/app/models/` (opponents, clubs, courts, tournaments, matches,
 * sets) and the enums in `enums.py`.
 *
 * Column names, nullability, string lengths, indexes, unique constraints and
 * foreign-key actions all match the Postgres schema. Four things differ, each
 * because this database lives on a device rather than behind the API:
 *
 * 1. **Text UUID primary keys** instead of Postgres sequences. There is no
 *    server to hand out ids, so every row is identified by a v4 UUID minted on
 *    device (`src/db/ids.ts`). This is also what makes a future Cloud Connect
 *    sync possible without renumbering anything.
 * 2. **`created_at` / `updated_at` on `sets` too.** The API's `Set` model has no
 *    timestamps because sets only ever change as part of their match. A sync
 *    engine reconciles rows, not aggregates, so every table here carries both.
 * 3. **Enums as `TEXT` + `CHECK`.** SQLite has no enum type; the CHECK lists
 *    hold exactly the values `enums.py` persists, so an illegal value fails at
 *    the same boundary Postgres would fail it.
 * 4. **A `deletions` tombstone table.** Postgres can afford to forget a deleted
 *    row; a replica cannot, or the row would come back on the next sync. Every
 *    table gets an `AFTER DELETE` trigger that records the tombstone, so
 *    deletions are captured however they happen — a repository call, a wipe, or
 *    a foreign-key cascade (the reason the connection sets
 *    `PRAGMA recursive_triggers = ON`).
 *
 * Dates are ISO `YYYY-MM-DD` strings and timestamps ISO-8601 UTC
 * (`YYYY-MM-DDTHH:MM:SS.sssZ`) — both sort lexicographically, which is what
 * lets the repositories order and range-filter on them directly.
 */

/** Recorded by every table's AFTER DELETE trigger. */
const tombstoneTrigger = (table: string) => `
  CREATE TRIGGER trg_${table}_tombstone AFTER DELETE ON ${table}
  BEGIN
    INSERT OR REPLACE INTO deletions (entity_type, entity_id, deleted_at)
    VALUES ('${table}', OLD.id, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
  END
`;

export const initialSchema: Migration = {
  version: 1,
  name: 'initial-schema',
  statements: [
    // -----------------------------------------------------------------------
    // Tombstones. Created first so the triggers below have somewhere to write.
    // -----------------------------------------------------------------------
    `CREATE TABLE deletions (
       entity_type TEXT NOT NULL CHECK (
         entity_type IN ('opponents', 'clubs', 'courts', 'tournaments', 'matches', 'sets')
       ),
       entity_id   TEXT NOT NULL,
       deleted_at  TEXT NOT NULL,
       PRIMARY KEY (entity_type, entity_id)
     )`,
    `CREATE INDEX ix_deletions_deleted_at ON deletions (deleted_at)`,

    // -----------------------------------------------------------------------
    // opponents — app/models/opponent.py
    // -----------------------------------------------------------------------
    `CREATE TABLE opponents (
       id          TEXT PRIMARY KEY,
       last_name   TEXT NOT NULL,
       name        TEXT,
       nationality TEXT,
       handedness  TEXT CHECK (handedness IN ('R', 'L')),
       age_range   TEXT CHECK (
         age_range IN ('Under 18', '18-25', '26-35', '36-45', '46-55', '56-65', 'Over 65')
       ),
       level       TEXT,
       notes       TEXT,
       icon        TEXT,
       created_at  TEXT NOT NULL,
       updated_at  TEXT NOT NULL
     )`,
    `CREATE INDEX ix_opponents_last_name ON opponents (last_name)`,
    tombstoneTrigger('opponents'),

    // -----------------------------------------------------------------------
    // clubs — app/models/club.py
    // -----------------------------------------------------------------------
    `CREATE TABLE clubs (
       id         TEXT PRIMARY KEY,
       name       TEXT NOT NULL,
       city       TEXT,
       country    TEXT,
       icon       TEXT,
       created_at TEXT NOT NULL,
       updated_at TEXT NOT NULL
     )`,
    `CREATE INDEX ix_clubs_name ON clubs (name)`,
    tombstoneTrigger('clubs'),

    // -----------------------------------------------------------------------
    // courts — app/models/court.py
    // -----------------------------------------------------------------------
    `CREATE TABLE courts (
       id          TEXT PRIMARY KEY,
       club_id     TEXT NOT NULL REFERENCES clubs (id) ON DELETE CASCADE,
       surface     TEXT NOT NULL CHECK (surface IN ('Hard', 'Clay', 'Grass', 'Carpet')),
       environment TEXT NOT NULL CHECK (environment IN ('Indoor', 'Outdoor')),
       created_at  TEXT NOT NULL,
       updated_at  TEXT NOT NULL,
       CONSTRAINT uq_courts_club_surface_env UNIQUE (club_id, surface, environment)
     )`,
    `CREATE INDEX ix_courts_club_id ON courts (club_id)`,
    tombstoneTrigger('courts'),

    // -----------------------------------------------------------------------
    // tournaments — app/models/tournament.py
    // -----------------------------------------------------------------------
    `CREATE TABLE tournaments (
       id              TEXT PRIMARY KEY,
       name            TEXT NOT NULL,
       season          TEXT,
       tournament_type TEXT NOT NULL CHECK (
         tournament_type IN ('Knockout Tournament', 'Ranking League')
       ),
       format          TEXT,
       organiser       TEXT,
       club_id         TEXT REFERENCES clubs (id) ON DELETE SET NULL,
       start_date      TEXT,
       end_date        TEXT,
       notes           TEXT,
       icon            TEXT,
       created_at      TEXT NOT NULL,
       updated_at      TEXT NOT NULL
     )`,
    `CREATE INDEX ix_tournaments_name ON tournaments (name)`,
    `CREATE INDEX ix_tournaments_club_id ON tournaments (club_id)`,
    tombstoneTrigger('tournaments'),

    // -----------------------------------------------------------------------
    // matches — app/models/match.py. Result, score and match_type are derived
    // on read from the set rows, never stored (see docs/schema.md).
    // -----------------------------------------------------------------------
    `CREATE TABLE matches (
       id            TEXT PRIMARY KEY,
       match_date    TEXT NOT NULL,
       opponent_id   TEXT NOT NULL REFERENCES opponents (id) ON DELETE RESTRICT,
       club_id       TEXT REFERENCES clubs (id) ON DELETE SET NULL,
       tournament_id TEXT REFERENCES tournaments (id) ON DELETE SET NULL,
       court_id      TEXT REFERENCES courts (id) ON DELETE SET NULL,
       stage         TEXT,
       duration_min  INTEGER,
       notes         TEXT,
       status        TEXT NOT NULL DEFAULT 'played' CHECK (status IN ('played', 'scheduled')),
       created_at    TEXT NOT NULL,
       updated_at    TEXT NOT NULL
     )`,
    `CREATE INDEX ix_matches_match_date ON matches (match_date)`,
    `CREATE INDEX ix_matches_opponent_id ON matches (opponent_id)`,
    `CREATE INDEX ix_matches_club_id ON matches (club_id)`,
    `CREATE INDEX ix_matches_tournament_id ON matches (tournament_id)`,
    `CREATE INDEX ix_matches_court_id ON matches (court_id)`,
    tombstoneTrigger('matches'),

    // -----------------------------------------------------------------------
    // sets — app/models/set.py
    // -----------------------------------------------------------------------
    `CREATE TABLE sets (
       id         TEXT PRIMARY KEY,
       match_id   TEXT NOT NULL REFERENCES matches (id) ON DELETE CASCADE,
       set_no     INTEGER NOT NULL,
       games_won  INTEGER NOT NULL,
       games_lost INTEGER NOT NULL,
       tiebreak   INTEGER NOT NULL DEFAULT 0 CHECK (tiebreak IN (0, 1)),
       created_at TEXT NOT NULL,
       updated_at TEXT NOT NULL,
       CONSTRAINT uq_sets_match_id_set_no UNIQUE (match_id, set_no)
     )`,
    `CREATE INDEX ix_sets_match_id ON sets (match_id)`,
    tombstoneTrigger('sets'),
  ],
};
