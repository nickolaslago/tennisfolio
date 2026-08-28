/// <reference types="jest" />
import type { Club, Opponent, Tournament } from '@tennisfolio/core';

import type { Database } from '@/db/sqlite';
import type { Repositories } from '@/lib/repositories';
import { openTestRepositories } from '@/test-support/db';

describe('matches repository', () => {
  let db: Database;
  let repos: Repositories;
  let opponent: Opponent;
  let club: Club;
  let tournament: Tournament;

  beforeEach(async () => {
    ({ db, repos } = await openTestRepositories());
    opponent = await repos.createOpponent({ last_name: 'NADAL', name: 'Rafael Nadal' });
    club = await repos.createClub({
      name: 'Stade Roland Garros',
      courts: [
        { surface: 'Clay', environment: 'Outdoor' },
        { surface: 'Hard', environment: 'Indoor' },
      ],
    });
    tournament = await repos.createTournament({
      name: 'Rolland Garros',
      season: '2026',
      tournament_type: 'Knockout Tournament',
      club_id: club.id,
    });
  });

  const base = () => ({ match_date: '2026-05-25', opponent_id: opponent.id });

  describe('derived data', () => {
    it('computes result, score and per-set results from the stored sets', async () => {
      const match = await repos.createMatch({ ...base(), score: '6-4 3-6 10-7' });

      expect(match.result).toBe('Win');
      expect(match.score).toBe('6-4 3-6 10-7');
      expect(match.sets).toEqual([
        { set_no: 1, games_won: 6, games_lost: 4, tiebreak: false, result: 'Win' },
        { set_no: 2, games_won: 3, games_lost: 6, tiebreak: false, result: 'Loss' },
        { set_no: 3, games_won: 10, games_lost: 7, tiebreak: true, result: 'Win' },
      ]);
    });

    it('stores none of it — only the set rows are persisted', async () => {
      await repos.createMatch({ ...base(), score: '6-4 6-3' });

      const columns = await db.select<{ name: string }>('PRAGMA table_info(matches)');
      expect(columns.map((column) => column.name)).not.toContain('score');
      expect(await db.selectValue('SELECT COUNT(*) FROM sets')).toBe(2);
    });

    it('accepts nested sets and derives exactly what the score string would', async () => {
      const fromSets = await repos.createMatch({
        ...base(),
        sets: [
          { games_won: 6, games_lost: 4 },
          { games_won: 6, games_lost: 3 },
        ],
      });

      expect(fromSets.score).toBe('6-4 6-3');
      expect(fromSets.result).toBe('Win');
      expect(fromSets.sets.map((set) => set.tiebreak)).toEqual([false, false]);
    });

    it('flags a 7-6 set as a tiebreak without being told', async () => {
      const match = await repos.createMatch({ ...base(), score: '7-6 6-4' });
      expect(match.sets[0].tiebreak).toBe(true);
      expect(match.sets[1].tiebreak).toBe(false);
    });

    it('derives surface through the match’s court', async () => {
      const match = await repos.createMatch({
        ...base(),
        club_id: club.id,
        court_id: club.courts[0].id,
      });
      expect(match.surface).toBe('Clay');
    });

    it('derives match_type from whether there is a tournament', async () => {
      const friendly = await repos.createMatch(base());
      const competitive = await repos.createMatch({
        ...base(),
        club_id: club.id,
        tournament_id: tournament.id,
      });

      expect(friendly.match_type).toBe('Friendly');
      expect(competitive.match_type).toBe('Competitive');
    });

    it('leaves result and score null for a match with no sets', async () => {
      const match = await repos.createMatch(base());
      expect(match).toMatchObject({ result: null, score: null, sets: [], status: 'scheduled' });
    });
  });

  describe('validation', () => {
    it('422s on a score the shared parser rejects, writing nothing', async () => {
      await expect(repos.createMatch({ ...base(), score: '6-6' })).rejects.toMatchObject({
        status: 422,
        message: expect.stringContaining('cannot end level'),
      });
      expect(await db.selectValue('SELECT COUNT(*) FROM matches')).toBe(0);
    });

    it('422s on a set count no best-of format could produce', async () => {
      await expect(
        repos.createMatch({ ...base(), score: '6-4 6-4 6-4 6-4 6-4 6-4' }),
      ).rejects.toMatchObject({ status: 422 });
    });

    it('404s on an unknown opponent, club or tournament', async () => {
      await expect(
        repos.createMatch({ match_date: '2026-05-25', opponent_id: 'nope' }),
      ).rejects.toMatchObject({ status: 404, message: 'Opponent nope not found' });
      await expect(repos.createMatch({ ...base(), club_id: 'nope' })).rejects.toMatchObject({
        status: 404,
        message: 'Club nope not found',
      });
      await expect(repos.createMatch({ ...base(), tournament_id: 'nope' })).rejects.toMatchObject({
        status: 404,
        message: 'Tournament nope not found',
      });
    });

    it('422s when the court does not belong to the match’s club', async () => {
      const other = await repos.createClub({
        name: 'Elsewhere',
        courts: [{ surface: 'Grass', environment: 'Outdoor' }],
      });

      await expect(
        repos.createMatch({ ...base(), club_id: club.id, court_id: other.courts[0].id }),
      ).rejects.toMatchObject({
        status: 422,
        message: "Court does not belong to the match's club.",
      });
    });

    it('422s on a court with no club at all', async () => {
      await expect(
        repos.createMatch({ ...base(), court_id: club.courts[0].id }),
      ).rejects.toMatchObject({ status: 422 });
    });
  });

  describe('update', () => {
    it('replaces the sets when a new score is supplied', async () => {
      const match = await repos.createMatch({ ...base(), score: '6-4 6-3' });
      const updated = await repos.updateMatch(match.id, { score: '6-4 3-6 6-2' });

      expect(updated.score).toBe('6-4 3-6 6-2');
      expect(updated.sets).toHaveLength(3);
      expect(await db.selectValue('SELECT COUNT(*) FROM sets')).toBe(3);
    });

    it('keeps a set’s row id when only a later set changed', async () => {
      const match = await repos.createMatch({ ...base(), score: '6-4 6-3' });
      const before = await db.select<{ id: string; set_no: number }>(
        'SELECT id, set_no FROM sets ORDER BY set_no',
      );

      await repos.updateMatch(match.id, { score: '6-4 3-6 6-2' });
      const after = await db.select<{ id: string; set_no: number }>(
        'SELECT id, set_no FROM sets ORDER BY set_no',
      );

      // Set 1 is untouched, so a future sync engine sees one edit, not a
      // wholesale delete-and-recreate.
      expect(after[0].id).toBe(before[0].id);
      expect(after[1].id).toBe(before[1].id);
    });

    it('shrinks the set list and tombstones the sets it drops', async () => {
      const match = await repos.createMatch({ ...base(), score: '6-4 3-6 6-2' });
      const updated = await repos.updateMatch(match.id, { score: '6-4 6-3' });

      expect(updated.sets).toHaveLength(2);
      expect(
        await db.selectValue('SELECT COUNT(*) FROM deletions WHERE entity_type = ?', ['sets']),
      ).toBe(1);
    });

    it('clears the result and reverts to scheduled on an explicit null score', async () => {
      const match = await repos.createMatch({ ...base(), score: '6-4 6-3' });
      const updated = await repos.updateMatch(match.id, { score: null, sets: null });

      expect(updated).toMatchObject({ status: 'scheduled', result: null, score: null, sets: [] });
      expect(await db.selectValue('SELECT COUNT(*) FROM sets')).toBe(0);
    });

    it('flips a scheduled match to played when a score arrives', async () => {
      const match = await repos.createMatch(base());
      expect(match.status).toBe('scheduled');

      const updated = await repos.updateMatch(match.id, { score: '6-4 6-3' });
      expect(updated.status).toBe('played');
    });

    it('leaves the sets alone when the payload does not mention them', async () => {
      const match = await repos.createMatch({ ...base(), score: '6-4 6-3' });
      const updated = await repos.updateMatch(match.id, { notes: 'windy' });

      expect(updated.notes).toBe('windy');
      expect(updated.score).toBe('6-4 6-3');
      expect(updated.status).toBe('played');
    });

    it('moves updated_at and leaves created_at alone', async () => {
      const match = await repos.createMatch(base());
      const updated = await repos.updateMatch(match.id, { stage: 'Final' });

      expect(updated.created_at).toBe(match.created_at);
      expect(updated.updated_at >= match.updated_at).toBe(true);
    });

    it('re-checks the court against the club being set in the same call', async () => {
      const match = await repos.createMatch(base());
      await expect(
        repos.updateMatch(match.id, { court_id: club.courts[0].id }),
      ).rejects.toMatchObject({ status: 422 });

      const updated = await repos.updateMatch(match.id, {
        club_id: club.id,
        court_id: club.courts[0].id,
      });
      expect(updated.surface).toBe('Clay');
    });

    it('rejects an invalid score without touching the stored sets', async () => {
      const match = await repos.createMatch({ ...base(), score: '6-4 6-3' });
      await expect(repos.updateMatch(match.id, { score: '5-5' })).rejects.toMatchObject({
        status: 422,
      });
      expect((await repos.getMatch(match.id)).score).toBe('6-4 6-3');
    });
  });

  describe('delete', () => {
    it('cascades to the match’s sets and tombstones every row', async () => {
      const match = await repos.createMatch({ ...base(), score: '6-4 6-3' });
      await repos.deleteMatch(match.id);

      await expect(repos.getMatch(match.id)).rejects.toMatchObject({ status: 404 });
      expect(await db.selectValue('SELECT COUNT(*) FROM sets')).toBe(0);
      expect(
        await db.selectValue('SELECT COUNT(*) FROM deletions WHERE entity_type = ?', ['sets']),
      ).toBe(2);
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      await repos.createMatch({
        match_date: '2026-05-25',
        opponent_id: opponent.id,
        club_id: club.id,
        court_id: club.courts[0].id,
        tournament_id: tournament.id,
        score: '6-4 6-3',
      });
      await repos.createMatch({
        match_date: '2026-06-02',
        opponent_id: opponent.id,
        club_id: club.id,
        court_id: club.courts[1].id,
        score: '4-6 3-6',
      });
      const other = await repos.createOpponent({ last_name: 'ALCARAZ' });
      await repos.createMatch({ match_date: '2026-07-01', opponent_id: other.id });
    });

    it('orders by match date, newest first', async () => {
      const page = await repos.listMatches();
      expect(page.items.map((match) => match.match_date)).toEqual([
        '2026-07-01',
        '2026-06-02',
        '2026-05-25',
      ]);
      expect(page.total).toBe(3);
    });

    it('breaks a same-day tie by insertion order, newest first', async () => {
      const first = await repos.createMatch({ match_date: '2026-08-01', opponent_id: opponent.id });
      const second = await repos.createMatch({
        match_date: '2026-08-01',
        opponent_id: opponent.id,
      });

      const page = await repos.listMatches({ date_from: '2026-08-01' });
      expect(page.items.map((match) => match.id)).toEqual([second.id, first.id]);
    });

    it('filters by opponent, club and tournament', async () => {
      expect((await repos.listMatches({ opponent_id: opponent.id })).total).toBe(2);
      expect((await repos.listMatches({ club_id: club.id })).total).toBe(2);
      expect((await repos.listMatches({ tournament_id: tournament.id })).total).toBe(1);
    });

    it('filters by surface through the court, excluding matches with no court', async () => {
      const page = await repos.listMatches({ surface: 'Clay' });
      expect(page.items.map((match) => match.match_date)).toEqual(['2026-05-25']);
      expect((await repos.listMatches({ surface: 'Grass' })).total).toBe(0);
    });

    it('filters by status', async () => {
      expect((await repos.listMatches({ status: 'played' })).total).toBe(2);
      expect((await repos.listMatches({ status: 'scheduled' })).total).toBe(1);
    });

    it('filters by an inclusive date range', async () => {
      expect((await repos.listMatches({ date_from: '2026-06-02' })).total).toBe(2);
      expect((await repos.listMatches({ date_to: '2026-06-02' })).total).toBe(2);
      expect(
        (await repos.listMatches({ date_from: '2026-06-01', date_to: '2026-06-30' })).total,
      ).toBe(1);
    });

    it('derives result and score for every row in the page', async () => {
      const page = await repos.listMatches({ status: 'played' });
      expect(page.items.map((match) => match.result)).toEqual(['Loss', 'Win']);
      expect(page.items.map((match) => match.score)).toEqual(['4-6 3-6', '6-4 6-3']);
    });

    it('paginates', async () => {
      const page = await repos.listMatches({ limit: 1, offset: 1 });
      expect(page.items.map((match) => match.match_date)).toEqual(['2026-06-02']);
      expect(page).toMatchObject({ total: 3, limit: 1, offset: 1 });
    });
  });
});
