/// <reference types="jest" />
import type { Repositories } from '@/lib/repositories';
import { RepositoryError } from '@/lib/repositories/errors';
import { openTestRepositories } from '@/test-support/db';

describe('opponents repository', () => {
  let repos: Repositories;

  beforeEach(async () => {
    ({ repos } = await openTestRepositories());
  });

  const federer = {
    last_name: 'FEDERER',
    name: 'Roger Federer',
    nationality: 'Switzerland',
    handedness: 'R',
    age_range: '36-45',
    level: '10',
  } as const;

  it('creates an opponent with a device-generated id and both timestamps', async () => {
    const created = await repos.createOpponent(federer);

    expect(created).toMatchObject({ ...federer, notes: null, icon: null });
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.created_at).toBe(created.updated_at);
  });

  it('reads an opponent back by id', async () => {
    const created = await repos.createOpponent(federer);
    expect(await repos.getOpponent(created.id)).toEqual(created);
  });

  it('404s on an unknown id, with the API’s message', async () => {
    await expect(repos.getOpponent('nope')).rejects.toMatchObject({
      status: 404,
      message: 'Opponent nope not found',
    });
    await expect(repos.getOpponent('nope')).rejects.toBeInstanceOf(RepositoryError);
  });

  it('normalises blank optional fields to null', async () => {
    const created = await repos.createOpponent({ last_name: 'X', name: '   ', notes: '' });
    expect(created.name).toBeNull();
    expect(created.notes).toBeNull();
  });

  it('patches only the fields the payload carries and moves updated_at', async () => {
    const created = await repos.createOpponent(federer);
    const updated = await repos.updateOpponent(created.id, { level: '9.5' });

    expect(updated.level).toBe('9.5');
    expect(updated.name).toBe('Roger Federer');
    expect(updated.created_at).toBe(created.created_at);
    expect(updated.updated_at >= created.updated_at).toBe(true);
  });

  it('clears a field when the payload sets it to null', async () => {
    const created = await repos.createOpponent(federer);
    const updated = await repos.updateOpponent(created.id, { handedness: null });
    expect(updated.handedness).toBeNull();
  });

  it('deletes an opponent and tombstones it', async () => {
    const { db, repos: bound } = await openTestRepositories();
    const created = await bound.createOpponent(federer);

    await bound.deleteOpponent(created.id);

    await expect(bound.getOpponent(created.id)).rejects.toMatchObject({ status: 404 });
    expect(
      await db.selectValue(
        'SELECT COUNT(*) FROM deletions WHERE entity_type = ? AND entity_id = ?',
        ['opponents', created.id],
      ),
    ).toBe(1);
  });

  it('409s rather than orphaning matches, mirroring ON DELETE RESTRICT', async () => {
    const opponent = await repos.createOpponent(federer);
    await repos.createMatch({ match_date: '2026-05-25', opponent_id: opponent.id });

    await expect(repos.deleteOpponent(opponent.id)).rejects.toMatchObject({
      status: 409,
      message: `Opponent ${opponent.id} has matches and cannot be deleted`,
    });
    await expect(repos.getOpponent(opponent.id)).resolves.toBeDefined();
  });

  describe('list', () => {
    beforeEach(async () => {
      await repos.createOpponent(federer);
      await repos.createOpponent({
        last_name: 'NADAL',
        name: 'Rafael Nadal',
        handedness: 'L',
        age_range: '36-45',
      });
      await repos.createOpponent({
        last_name: 'ALCARAZ',
        name: 'Carlos Alcaraz',
        handedness: 'R',
        age_range: '18-25',
      });
    });

    it('orders by last name and reports the page envelope', async () => {
      const page = await repos.listOpponents();

      expect(page.items.map((o) => o.last_name)).toEqual(['ALCARAZ', 'FEDERER', 'NADAL']);
      expect(page).toMatchObject({ total: 3, limit: 50, offset: 0 });
    });

    it('paginates without changing the total', async () => {
      const page = await repos.listOpponents({ limit: 2, offset: 2 });

      expect(page.items.map((o) => o.last_name)).toEqual(['NADAL']);
      expect(page).toMatchObject({ total: 3, limit: 2, offset: 2 });
    });

    it('clamps limit to the API’s 1..200 range', async () => {
      expect((await repos.listOpponents({ limit: 5000 })).limit).toBe(200);
      expect((await repos.listOpponents({ limit: 0 })).limit).toBe(1);
      expect((await repos.listOpponents({ offset: -10 })).offset).toBe(0);
    });

    it('searches case-insensitively across last name and name', async () => {
      expect((await repos.listOpponents({ search: 'nadal' })).items).toHaveLength(1);
      expect((await repos.listOpponents({ search: 'Carlos' })).items).toHaveLength(1);
      expect((await repos.listOpponents({ search: 'zzz' })).total).toBe(0);
    });

    it('treats LIKE wildcards in a search term as literal characters', async () => {
      await repos.createOpponent({ last_name: '100%', name: 'Percent' });
      const page = await repos.listOpponents({ search: '100%' });
      expect(page.items.map((o) => o.last_name)).toEqual(['100%']);
    });

    it('filters by handedness and age range', async () => {
      expect(
        (await repos.listOpponents({ handedness: 'L' })).items.map((o) => o.last_name),
      ).toEqual(['NADAL']);
      expect(
        (await repos.listOpponents({ age_range: '18-25' })).items.map((o) => o.last_name),
      ).toEqual(['ALCARAZ']);
      expect((await repos.listOpponents({ handedness: 'R', age_range: '18-25' })).total).toBe(1);
    });
  });
});
