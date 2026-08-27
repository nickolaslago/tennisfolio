/// <reference types="jest" />
import type { Club } from '@tennisfolio/core';

import type { Database } from '@/db/sqlite';
import type { Repositories } from '@/lib/repositories';
import { openTestRepositories } from '@/test-support/db';

describe('tournaments repository', () => {
  let db: Database;
  let repos: Repositories;
  let club: Club;

  beforeEach(async () => {
    ({ db, repos } = await openTestRepositories());
    club = await repos.createClub({ name: 'Stade Roland Garros' });
  });

  const wimbledon = {
    name: 'Wimbledon',
    season: '2026',
    tournament_type: 'Knockout Tournament',
    format: 'Best of 5',
    start_date: '2026-06-29',
    end_date: '2026-07-12',
  } as const;

  it('creates a tournament, including the organiser the CSV bundle omits', async () => {
    const created = await repos.createTournament({ ...wimbledon, organiser: 'AELTC' });

    expect(created).toMatchObject({ ...wimbledon, organiser: 'AELTC', club_id: null, notes: null });
    expect(created.created_at).toBe(created.updated_at);
  });

  it('links to a club', async () => {
    const created = await repos.createTournament({ ...wimbledon, club_id: club.id });
    expect(created.club_id).toBe(club.id);
  });

  it('404s on an unknown club before writing anything', async () => {
    await expect(repos.createTournament({ ...wimbledon, club_id: 'nope' })).rejects.toMatchObject({
      status: 404,
      message: 'Club nope not found',
    });
    expect(await db.selectValue('SELECT COUNT(*) FROM tournaments')).toBe(0);
  });

  it('404s on an unknown tournament id', async () => {
    await expect(repos.getTournament('nope')).rejects.toMatchObject({
      status: 404,
      message: 'Tournament nope not found',
    });
  });

  it('patches only what the payload carries', async () => {
    const created = await repos.createTournament({ ...wimbledon, club_id: club.id });
    const updated = await repos.updateTournament(created.id, { notes: 'grass season' });

    expect(updated.notes).toBe('grass season');
    expect(updated.club_id).toBe(club.id);
    expect(updated.updated_at >= created.updated_at).toBe(true);
  });

  it('unlinks the club when club_id is set to null', async () => {
    const created = await repos.createTournament({ ...wimbledon, club_id: club.id });
    expect((await repos.updateTournament(created.id, { club_id: null })).club_id).toBeNull();
  });

  it('deletes the tournament and turns its matches into friendlies', async () => {
    const tournament = await repos.createTournament({ ...wimbledon, club_id: club.id });
    const opponent = await repos.createOpponent({ last_name: 'NADAL' });
    const match = await repos.createMatch({
      match_date: '2026-06-30',
      opponent_id: opponent.id,
      tournament_id: tournament.id,
    });

    await repos.deleteTournament(tournament.id);

    const reread = await repos.getMatch(match.id);
    expect(reread.tournament_id).toBeNull();
    expect(reread.match_type).toBe('Friendly');
    expect(
      await db.selectValue('SELECT COUNT(*) FROM deletions WHERE entity_type = ?', ['tournaments']),
    ).toBe(1);
  });

  describe('list', () => {
    beforeEach(async () => {
      await repos.createTournament({ ...wimbledon, club_id: club.id });
      await repos.createTournament({
        name: 'ATP Finals',
        season: '2026',
        tournament_type: 'Ranking League',
      });
      await repos.createTournament({
        name: 'US Open',
        season: '2026',
        tournament_type: 'Knockout Tournament',
      });
    });

    it('orders by name', async () => {
      const page = await repos.listTournaments();
      expect(page.items.map((t) => t.name)).toEqual(['ATP Finals', 'US Open', 'Wimbledon']);
      expect(page.total).toBe(3);
    });

    it('searches on name', async () => {
      expect((await repos.listTournaments({ search: 'open' })).items.map((t) => t.name)).toEqual([
        'US Open',
      ]);
    });

    it('filters by type and by club', async () => {
      expect((await repos.listTournaments({ tournament_type: 'Ranking League' })).total).toBe(1);
      expect((await repos.listTournaments({ club_id: club.id })).total).toBe(1);
    });
  });

  describe('standings', () => {
    it('derives a table from the tournament’s played matches', async () => {
      const league = await repos.createTournament({
        name: 'ATP Finals',
        season: '2026',
        tournament_type: 'Ranking League',
      });
      const nadal = await repos.createOpponent({ last_name: 'NADAL', name: 'Rafael' });
      const alcaraz = await repos.createOpponent({ last_name: 'ALCARAZ' });

      // Two wins over Nadal, one loss to Alcaraz.
      await repos.createMatch({
        match_date: '2026-11-15',
        opponent_id: nadal.id,
        tournament_id: league.id,
        score: '6-4 6-3',
      });
      await repos.createMatch({
        match_date: '2026-11-16',
        opponent_id: nadal.id,
        tournament_id: league.id,
        score: '6-2 6-1',
      });
      await repos.createMatch({
        match_date: '2026-11-17',
        opponent_id: alcaraz.id,
        tournament_id: league.id,
        score: '4-6 3-6',
      });

      const standings = await repos.getTournamentStandings(league.id);

      expect(standings).toEqual([
        {
          opponent_id: nadal.id,
          opponent_name: 'Rafael NADAL',
          played: 2,
          wins: 2,
          losses: 0,
          win_rate: 1,
          sets_won: 4,
          sets_lost: 0,
          games_won: 24,
          games_lost: 10,
        },
        {
          opponent_id: alcaraz.id,
          opponent_name: 'ALCARAZ',
          played: 1,
          wins: 0,
          losses: 1,
          win_rate: 0,
          sets_won: 0,
          sets_lost: 2,
          games_won: 7,
          games_lost: 12,
        },
      ]);
    });

    it('ignores scheduled matches and matches from other tournaments', async () => {
      const league = await repos.createTournament({
        name: 'ATP Finals',
        season: '2026',
        tournament_type: 'Ranking League',
      });
      const other = await repos.createTournament({ ...wimbledon });
      const nadal = await repos.createOpponent({ last_name: 'NADAL' });

      await repos.createMatch({
        match_date: '2026-11-15',
        opponent_id: nadal.id,
        tournament_id: league.id,
      });
      await repos.createMatch({
        match_date: '2026-06-30',
        opponent_id: nadal.id,
        tournament_id: other.id,
        score: '6-4 6-3',
      });

      expect(await repos.getTournamentStandings(league.id)).toEqual([]);
    });

    it('404s for a tournament that does not exist', async () => {
      await expect(repos.getTournamentStandings('nope')).rejects.toMatchObject({ status: 404 });
    });
  });
});
