/// <reference types="jest" />
import type { Database } from '@/db/sqlite';
import type { Repositories } from '@/lib/repositories';
import { openTestRepositories } from '@/test-support/db';

describe('data repository', () => {
  let db: Database;
  let repos: Repositories;

  beforeEach(async () => {
    ({ db, repos } = await openTestRepositories());
  });

  async function seed(): Promise<void> {
    const club = await repos.createClub({
      name: 'Stade Roland Garros',
      courts: [{ surface: 'Clay', environment: 'Outdoor' }],
    });
    const opponent = await repos.createOpponent({ last_name: 'NADAL' });
    const tournament = await repos.createTournament({
      name: 'Rolland Garros',
      tournament_type: 'Knockout Tournament',
      club_id: club.id,
    });
    await repos.createMatch({
      match_date: '2026-05-25',
      opponent_id: opponent.id,
      club_id: club.id,
      court_id: club.courts[0].id,
      tournament_id: tournament.id,
      score: '6-4 6-3',
    });
  }

  it('empties every user-data table', async () => {
    await seed();
    await repos.deleteAllData();

    for (const table of ['sets', 'matches', 'courts', 'tournaments', 'clubs', 'opponents']) {
      expect(await db.selectValue(`SELECT COUNT(*) FROM ${table}`)).toBe(0);
    }
  });

  it('tombstones everything it deletes, so a sync engine can reconcile', async () => {
    await seed();
    await repos.deleteAllData();

    const byType = await db.select<{ entity_type: string; n: number }>(
      'SELECT entity_type, COUNT(*) AS n FROM deletions GROUP BY entity_type ORDER BY entity_type',
    );
    expect(byType).toEqual([
      { entity_type: 'clubs', n: 1 },
      { entity_type: 'courts', n: 1 },
      { entity_type: 'matches', n: 1 },
      { entity_type: 'opponents', n: 1 },
      { entity_type: 'sets', n: 2 },
      { entity_type: 'tournaments', n: 1 },
    ]);
  });

  it('leaves the schema and its version alone', async () => {
    await seed();
    await repos.deleteAllData();

    expect(await db.selectValue('PRAGMA user_version')).toBeGreaterThan(0);
    await expect(repos.createOpponent({ last_name: 'AFTER' })).resolves.toBeDefined();
  });

  it('is a no-op on an already-empty database', async () => {
    await expect(repos.deleteAllData()).resolves.toBeUndefined();
    expect(await db.selectValue('SELECT COUNT(*) FROM deletions')).toBe(0);
  });
});

describe('transactions', () => {
  it('rolls back everything a failed write touched', async () => {
    const { db, repos } = await openTestRepositories();
    await repos.createOpponent({ last_name: 'KEEP' });

    await expect(
      db.transaction(async () => {
        await repos.createOpponent({ last_name: 'DISCARD' });
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect((await repos.listOpponents()).items.map((o) => o.last_name)).toEqual(['KEEP']);
  });

  it('nests, so an inner failure does not abort the outer transaction', async () => {
    const { db, repos } = await openTestRepositories();

    await db.transaction(async () => {
      await repos.createOpponent({ last_name: 'OUTER' });
      await db
        .transaction(async () => {
          await repos.createOpponent({ last_name: 'INNER' });
          throw new Error('inner failed');
        })
        .catch(() => undefined);
    });

    expect((await repos.listOpponents()).items.map((o) => o.last_name)).toEqual(['OUTER']);
  });
});
