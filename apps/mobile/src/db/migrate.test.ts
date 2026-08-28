/// <reference types="jest" />
/**
 * Migration-runner and schema tests.
 *
 * The schema half is the important one: it pins the local tables against
 * `apps/api/src/app/models/`, so a change on the server that this app does not
 * follow fails here rather than at import time on someone's phone.
 */
import { openNodeDatabase } from '@/db/drivers/node';
import { newId, UUID_PATTERN } from '@/db/ids';
import {
  assertMigrationsWellFormed,
  LATEST_VERSION,
  MigrationError,
  runMigrations,
} from '@/db/migrate';
import { MIGRATIONS } from '@/db/migrations';
import type { Database } from '@/db/sqlite';
import { ENTITY_TABLES } from '@/db/tables';
import { openTestDatabase } from '@/test-support/db';

async function tableNames(db: Database): Promise<string[]> {
  const rows = await db.select<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  return rows.map((row) => row.name);
}

async function columnNames(db: Database, table: string): Promise<string[]> {
  const rows = await db.select<{ name: string }>(`PRAGMA table_info(${table})`);
  return rows.map((row) => row.name);
}

async function indexNames(db: Database, table: string): Promise<string[]> {
  const rows = await db.select<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = ? AND name LIKE 'ix_%'",
    [table],
  );
  return rows.map((row) => row.name).sort();
}

describe('migration runner', () => {
  it('takes a fresh database to the latest version', async () => {
    const db = await openNodeDatabase();
    const outcome = await runMigrations(db);

    expect(outcome.fromVersion).toBe(0);
    expect(outcome.toVersion).toBe(LATEST_VERSION);
    expect(outcome.applied).toEqual(MIGRATIONS.map((migration) => migration.name));
    expect(await db.selectValue('PRAGMA user_version')).toBe(LATEST_VERSION);
  });

  it('is a no-op on an already-migrated database', async () => {
    const db = await openTestDatabase();
    const outcome = await runMigrations(db);

    expect(outcome.applied).toEqual([]);
    expect(outcome.fromVersion).toBe(LATEST_VERSION);
    expect(outcome.toVersion).toBe(LATEST_VERSION);
  });

  it('records every applied migration in schema_migrations', async () => {
    const db = await openTestDatabase();
    const rows = await db.select<{ version: number; name: string; applied_at: string }>(
      'SELECT version, name, applied_at FROM schema_migrations ORDER BY version',
    );

    expect(rows.map((row) => row.version)).toEqual(MIGRATIONS.map((m) => m.version));
    expect(rows.map((row) => row.name)).toEqual(MIGRATIONS.map((m) => m.name));
    for (const row of rows) {
      expect(row.applied_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it('applies only the migrations a partially-migrated database is missing', async () => {
    const db = await openNodeDatabase();
    const first = { version: 1, name: 'first', statements: ['CREATE TABLE a (id TEXT)'] };
    const second = { version: 2, name: 'second', statements: ['CREATE TABLE b (id TEXT)'] };

    await runMigrations(db, [first]);
    const outcome = await runMigrations(db, [first, second]);

    expect(outcome).toEqual({ fromVersion: 1, toVersion: 2, applied: ['second'] });
    expect(await tableNames(db)).toEqual(expect.arrayContaining(['a', 'b']));
  });

  it('rolls a failing migration back and leaves the previous version in force', async () => {
    const db = await openNodeDatabase();
    const good = { version: 1, name: 'good', statements: ['CREATE TABLE a (id TEXT)'] };
    const bad = {
      version: 2,
      name: 'bad',
      statements: ['CREATE TABLE b (id TEXT)', 'THIS IS NOT SQL'],
    };

    await expect(runMigrations(db, [good, bad])).rejects.toThrow(MigrationError);

    expect(await db.selectValue('PRAGMA user_version')).toBe(1);
    expect(await tableNames(db)).not.toContain('b');
  });

  it('rejects a migration list with a gap or a repeat', () => {
    const one = { version: 1, name: 'one', statements: [] };
    expect(() =>
      assertMigrationsWellFormed([one, { version: 3, name: 'three', statements: [] }]),
    ).toThrow(/contiguous/);
    expect(() =>
      assertMigrationsWellFormed([one, { version: 1, name: 'again', statements: [] }]),
    ).toThrow(/contiguous/);
  });

  it('ships a well-formed migration list', () => {
    expect(() => assertMigrationsWellFormed(MIGRATIONS)).not.toThrow();
    expect(LATEST_VERSION).toBe(MIGRATIONS.length);
  });
});

describe('schema mirrors apps/api/src/app/models', () => {
  let db: Database;

  beforeEach(async () => {
    db = await openTestDatabase();
  });

  it('creates every table the API has, plus the tombstone ledger', async () => {
    expect(await tableNames(db)).toEqual([
      'clubs',
      'courts',
      'deletions',
      'matches',
      'opponents',
      'schema_migrations',
      'sets',
      'tournaments',
    ]);
  });

  it.each([
    [
      'opponents',
      [
        'id',
        'last_name',
        'name',
        'nationality',
        'handedness',
        'age_range',
        'level',
        'notes',
        'icon',
        'created_at',
        'updated_at',
      ],
    ],
    ['clubs', ['id', 'name', 'city', 'country', 'icon', 'created_at', 'updated_at']],
    ['courts', ['id', 'club_id', 'surface', 'environment', 'created_at', 'updated_at']],
    [
      'tournaments',
      [
        'id',
        'name',
        'season',
        'tournament_type',
        'format',
        'organiser',
        'club_id',
        'start_date',
        'end_date',
        'notes',
        'icon',
        'created_at',
        'updated_at',
      ],
    ],
    [
      'matches',
      [
        'id',
        'match_date',
        'opponent_id',
        'club_id',
        'tournament_id',
        'court_id',
        'stage',
        'duration_min',
        'notes',
        'status',
        'created_at',
        'updated_at',
      ],
    ],
    [
      'sets',
      [
        'id',
        'match_id',
        'set_no',
        'games_won',
        'games_lost',
        'tiebreak',
        'created_at',
        'updated_at',
      ],
    ],
  ])('gives %s exactly the API model’s columns', async (table, expected) => {
    expect(await columnNames(db, table)).toEqual(expected);
  });

  it('stores no derived columns on matches', async () => {
    // result / score / match_type / surface are computed from sets and the
    // court on every read — see docs/schema.md.
    const columns = await columnNames(db, 'matches');
    expect(columns).not.toContain('result');
    expect(columns).not.toContain('score');
    expect(columns).not.toContain('match_type');
    expect(columns).not.toContain('surface');
  });

  it('indexes the same columns the API marks index=True', async () => {
    expect(await indexNames(db, 'opponents')).toEqual(['ix_opponents_last_name']);
    expect(await indexNames(db, 'clubs')).toEqual(['ix_clubs_name']);
    expect(await indexNames(db, 'courts')).toEqual(['ix_courts_club_id']);
    expect(await indexNames(db, 'tournaments')).toEqual([
      'ix_tournaments_club_id',
      'ix_tournaments_name',
    ]);
    expect(await indexNames(db, 'matches')).toEqual([
      'ix_matches_club_id',
      'ix_matches_court_id',
      'ix_matches_match_date',
      'ix_matches_opponent_id',
      'ix_matches_tournament_id',
    ]);
    expect(await indexNames(db, 'sets')).toEqual(['ix_sets_match_id']);
  });

  it('gives every table a text primary key and both timestamps', async () => {
    for (const table of ENTITY_TABLES) {
      const info = await db.select<{ name: string; type: string; pk: number; notnull: number }>(
        `PRAGMA table_info(${table})`,
      );
      const byName = new Map(info.map((column) => [column.name, column]));

      expect(byName.get('id')).toMatchObject({ type: 'TEXT', pk: 1 });
      // Sync-ready: updated_at exists and is mandatory on every table, sets
      // included (the API's Set model has no timestamps).
      expect(byName.get('created_at')).toMatchObject({ type: 'TEXT', notnull: 1 });
      expect(byName.get('updated_at')).toMatchObject({ type: 'TEXT', notnull: 1 });
    }
  });

  it('enforces the enums from enums.py as CHECK constraints', async () => {
    const now = new Date().toISOString();
    await db.run(`INSERT INTO clubs (id, name, created_at, updated_at) VALUES (?, 'Club', ?, ?)`, [
      newId(),
      now,
      now,
    ]);
    const clubId = await db.selectValue('SELECT id FROM clubs');

    await expect(
      db.run(
        `INSERT INTO courts (id, club_id, surface, environment, created_at, updated_at)
         VALUES (?, ?, 'Sand', 'Outdoor', ?, ?)`,
        [newId(), clubId, now, now],
      ),
    ).rejects.toThrow(/CHECK constraint failed/);

    await expect(
      db.run(
        `INSERT INTO opponents (id, last_name, handedness, created_at, updated_at)
         VALUES (?, 'X', 'B', ?, ?)`,
        [newId(), now, now],
      ),
    ).rejects.toThrow(/CHECK constraint failed/);
  });

  it('enforces the unique constraints the API declares', async () => {
    const now = new Date().toISOString();
    const clubId = newId();
    await db.run('INSERT INTO clubs (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)', [
      clubId,
      'Club',
      now,
      now,
    ]);
    const insertCourt = () =>
      db.run(
        `INSERT INTO courts (id, club_id, surface, environment, created_at, updated_at)
         VALUES (?, ?, 'Clay', 'Outdoor', ?, ?)`,
        [newId(), clubId, now, now],
      );

    await insertCourt();
    await expect(insertCourt()).rejects.toThrow(/UNIQUE constraint failed/);
  });

  it('generates v4 UUID primary keys on device', () => {
    const ids = new Set(Array.from({ length: 256 }, () => newId()));
    expect(ids.size).toBe(256);
    for (const id of ids) expect(id).toMatch(UUID_PATTERN);
  });
});

describe('deletion tombstones', () => {
  let db: Database;
  const now = new Date().toISOString();

  beforeEach(async () => {
    db = await openTestDatabase();
  });

  async function seedClubWithCourt(): Promise<{ clubId: string; courtId: string }> {
    const clubId = newId();
    const courtId = newId();
    await db.run('INSERT INTO clubs (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)', [
      clubId,
      'Club',
      now,
      now,
    ]);
    await db.run(
      `INSERT INTO courts (id, club_id, surface, environment, created_at, updated_at)
       VALUES (?, ?, 'Clay', 'Outdoor', ?, ?)`,
      [courtId, clubId, now, now],
    );
    return { clubId, courtId };
  }

  it('records a tombstone for a directly deleted row', async () => {
    const { clubId } = await seedClubWithCourt();
    await db.run('DELETE FROM clubs WHERE id = ?', [clubId]);

    const row = await db.selectOne<{ entity_type: string; deleted_at: string }>(
      'SELECT entity_type, deleted_at FROM deletions WHERE entity_id = ?',
      [clubId],
    );
    expect(row?.entity_type).toBe('clubs');
    expect(row?.deleted_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('records tombstones for rows removed by a foreign-key cascade', async () => {
    const { clubId, courtId } = await seedClubWithCourt();
    await db.run('DELETE FROM clubs WHERE id = ?', [clubId]);

    // The court is gone via ON DELETE CASCADE — a sync engine must still learn
    // about it, which is what PRAGMA recursive_triggers buys us.
    expect(await db.selectValue('SELECT COUNT(*) FROM courts')).toBe(0);
    const tombstoned = await db.select<{ entity_type: string; entity_id: string }>(
      'SELECT entity_type, entity_id FROM deletions ORDER BY entity_type',
    );
    expect(tombstoned).toEqual([
      { entity_type: 'clubs', entity_id: clubId },
      { entity_type: 'courts', entity_id: courtId },
    ]);
  });
});
