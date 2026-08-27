/// <reference types="jest" />
import type { ClubCreate } from '@tennisfolio/core';

import type { Database } from '@/db/sqlite';
import type { Repositories } from '@/lib/repositories';
import { openTestRepositories } from '@/test-support/db';

describe('clubs repository', () => {
  let db: Database;
  let repos: Repositories;

  beforeEach(async () => {
    ({ db, repos } = await openTestRepositories());
  });

  const rolandGarros: ClubCreate = {
    name: 'Stade Roland Garros',
    city: 'Paris',
    country: 'France',
    courts: [
      { surface: 'Clay', environment: 'Outdoor' },
      { surface: 'Hard', environment: 'Indoor' },
    ],
  };

  it('creates a club with its courts nested, in submission order', async () => {
    const club = await repos.createClub(rolandGarros);

    expect(club).toMatchObject({ name: 'Stade Roland Garros', city: 'Paris', country: 'France' });
    expect(club.courts.map((court) => `${court.surface}/${court.environment}`)).toEqual([
      'Clay/Outdoor',
      'Hard/Indoor',
    ]);
    for (const court of club.courts) expect(court.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('creates a club with no courts at all', async () => {
    const club = await repos.createClub({ name: 'Local Courts' });
    expect(club.courts).toEqual([]);
  });

  it('422s on two courts with the same surface and environment', async () => {
    await expect(
      repos.createClub({
        name: 'Dup',
        courts: [
          { surface: 'Clay', environment: 'Outdoor' },
          { surface: 'Clay', environment: 'Outdoor' },
        ],
      }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('404s on an unknown id', async () => {
    await expect(repos.getClub('nope')).rejects.toMatchObject({
      status: 404,
      message: 'Club nope not found',
    });
  });

  describe('update', () => {
    it('leaves the courts alone when the payload omits them', async () => {
      const club = await repos.createClub(rolandGarros);
      const updated = await repos.updateClub(club.id, { city: 'Paris 16e' });

      expect(updated.city).toBe('Paris 16e');
      expect(updated.courts.map((court) => court.id)).toEqual(club.courts.map((court) => court.id));
    });

    it('keeps a court by id, adds new ones and drops the rest', async () => {
      const club = await repos.createClub(rolandGarros);
      const [clay] = club.courts;

      const updated = await repos.updateClub(club.id, {
        courts: [
          { id: clay.id, surface: 'Clay', environment: 'Outdoor' },
          { surface: 'Grass', environment: 'Outdoor' },
        ],
      });

      expect(updated.courts).toHaveLength(2);
      expect(updated.courts[0].id).toBe(clay.id);
      expect(updated.courts[1].surface).toBe('Grass');
      expect(await db.selectValue('SELECT COUNT(*) FROM courts')).toBe(2);
    });

    it('changes a kept court’s surface in place', async () => {
      const club = await repos.createClub(rolandGarros);
      const [clay] = club.courts;

      const updated = await repos.updateClub(club.id, {
        courts: [{ id: clay.id, surface: 'Carpet', environment: 'Outdoor' }],
      });

      expect(updated.courts).toEqual([{ id: clay.id, surface: 'Carpet', environment: 'Outdoor' }]);
    });

    it('can swap a court for one with the same surface pair without tripping the unique index', async () => {
      const club = await repos.createClub(rolandGarros);
      // Drop the Clay/Outdoor court and add a fresh Clay/Outdoor one: deletes
      // have to run before inserts for this to be legal.
      const updated = await repos.updateClub(club.id, {
        courts: [{ surface: 'Clay', environment: 'Outdoor' }],
      });

      expect(updated.courts).toHaveLength(1);
      expect(updated.courts[0].id).not.toBe(club.courts[0].id);
    });

    it('removes every court when passed an empty list', async () => {
      const club = await repos.createClub(rolandGarros);
      const updated = await repos.updateClub(club.id, { courts: [] });

      expect(updated.courts).toEqual([]);
      expect(
        await db.selectValue('SELECT COUNT(*) FROM deletions WHERE entity_type = ?', ['courts']),
      ).toBe(2);
    });
  });

  describe('delete', () => {
    it('cascades to the club’s courts and tombstones all of them', async () => {
      const club = await repos.createClub(rolandGarros);
      await repos.deleteClub(club.id);

      expect(await db.selectValue('SELECT COUNT(*) FROM courts')).toBe(0);
      expect(await db.selectValue('SELECT COUNT(*) FROM deletions')).toBe(3);
    });

    it('leaves matches in place with a null club_id (ON DELETE SET NULL)', async () => {
      const club = await repos.createClub(rolandGarros);
      const opponent = await repos.createOpponent({ last_name: 'NADAL' });
      const match = await repos.createMatch({
        match_date: '2026-05-25',
        opponent_id: opponent.id,
        club_id: club.id,
        court_id: club.courts[0].id,
      });

      await repos.deleteClub(club.id);

      const reread = await repos.getMatch(match.id);
      expect(reread.club_id).toBeNull();
      expect(reread.court_id).toBeNull();
      expect(reread.surface).toBeNull();
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      await repos.createClub(rolandGarros);
      await repos.createClub({
        name: 'All England Lawn Tennis & Croquet Club',
        city: 'London',
        country: 'United Kingdom',
        courts: [{ surface: 'Grass', environment: 'Outdoor' }],
      });
      await repos.createClub({ name: 'La Defense Arena', city: 'Paris', country: 'France' });
    });

    it('orders by name and nests each club’s courts', async () => {
      const page = await repos.listClubs();

      expect(page.items.map((club) => club.name)).toEqual([
        'All England Lawn Tennis & Croquet Club',
        'La Defense Arena',
        'Stade Roland Garros',
      ]);
      expect(page.total).toBe(3);
      expect(page.items[2].courts).toHaveLength(2);
      expect(page.items[1].courts).toEqual([]);
    });

    it('searches on name', async () => {
      const page = await repos.listClubs({ search: 'defense' });
      expect(page.items.map((club) => club.name)).toEqual(['La Defense Arena']);
    });

    it('filters by country', async () => {
      const page = await repos.listClubs({ country: 'France' });
      expect(page.total).toBe(2);
    });

    it('filters by a court’s surface, without duplicating the club', async () => {
      const page = await repos.listClubs({ surface: 'Clay' });
      expect(page.items.map((club) => club.name)).toEqual(['Stade Roland Garros']);
      expect(page.total).toBe(1);
    });

    it('filters by surface and environment together', async () => {
      expect((await repos.listClubs({ surface: 'Hard', environment: 'Indoor' })).total).toBe(1);
      expect((await repos.listClubs({ surface: 'Hard', environment: 'Outdoor' })).total).toBe(0);
      expect((await repos.listClubs({ environment: 'Outdoor' })).total).toBe(2);
    });
  });
});
