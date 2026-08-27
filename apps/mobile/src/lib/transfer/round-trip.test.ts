/// <reference types="jest" />
/**
 * The acceptance criterion for DAT-97's import/export half: a real
 * Docker-PoC export imports cleanly, and exporting again round-trips without
 * data loss.
 *
 * The strongest form of that is a **byte-for-byte** comparison, which is what
 * the first test does — same columns, same order, same DD-MM-YYYY dates, same
 * CRLF line endings, same local ids. The rest check the parts a byte compare
 * could not distinguish from luck.
 */
import type { Database } from '@/db/sqlite';
import type { Repositories } from '@/lib/repositories';
import { CSV_FILENAMES, type CsvFilename } from '@/lib/transfer/format';
import { openTestRepositories } from '@/test-support/db';

import { EXPECTED_COUNTS, EXPORT_BUNDLE } from './__fixtures__/export-bundle';

describe('CSV bundle round-trip', () => {
  let db: Database;
  let repos: Repositories;

  beforeEach(async () => {
    ({ db, repos } = await openTestRepositories());
  });

  it.each(CSV_FILENAMES)('reproduces %s byte for byte', async (filename: CsvFilename) => {
    await repos.importCsvBundle(EXPORT_BUNDLE);
    const exported = await repos.exportCsvBundle();

    expect(exported[filename]).toBe(EXPORT_BUNDLE[filename]);
  });

  it('reproduces the whole bundle, and only the six files', async () => {
    await repos.importCsvBundle(EXPORT_BUNDLE);
    const exported = await repos.exportCsvBundle();

    expect(Object.keys(exported).sort()).toEqual([...CSV_FILENAMES].sort());
    expect(exported).toEqual(EXPORT_BUNDLE);
  });

  it('stays stable over a second round-trip', async () => {
    await repos.importCsvBundle(EXPORT_BUNDLE);
    const first = await repos.exportCsvBundle();
    await repos.importCsvBundle(first);
    const second = await repos.exportCsvBundle();

    expect(second).toEqual(first);
  });

  it('preserves every row, not just the text', async () => {
    await repos.importCsvBundle(EXPORT_BUNDLE);

    expect((await repos.listClubs({ limit: 200 })).total).toBe(EXPECTED_COUNTS.clubs);
    expect((await repos.listOpponents({ limit: 200 })).total).toBe(EXPECTED_COUNTS.opponents);
    expect((await repos.listTournaments({ limit: 200 })).total).toBe(EXPECTED_COUNTS.tournaments);
    expect((await repos.listMatches({ limit: 200 })).total).toBe(EXPECTED_COUNTS.matches);
    expect(await db.selectValue('SELECT COUNT(*) FROM courts')).toBe(EXPECTED_COUNTS.courts);
    expect(await db.selectValue('SELECT COUNT(*) FROM sets')).toBe(EXPECTED_COUNTS.sets);
  });

  it('preserves the relations behind the local ids', async () => {
    await repos.importCsvBundle(EXPORT_BUNDLE);

    const matches = await repos.listMatches({ limit: 200 });
    const wimbledon = (await repos.listTournaments({ search: 'Wimbledon' })).items[0];
    const aeltc = (await repos.listClubs({ search: 'All England' })).items[0];

    expect(wimbledon.club_id).toBe(aeltc.id);
    // Three Wimbledon matches, all at the AELTC's grass court.
    const atWimbledon = matches.items.filter((match) => match.tournament_id === wimbledon.id);
    expect(atWimbledon).toHaveLength(3);
    for (const match of atWimbledon) {
      expect(match.club_id).toBe(aeltc.id);
      expect(match.surface).toBe('Grass');
    }
  });

  it('recomputes results and scores from the sets rather than carrying them', async () => {
    await repos.importCsvBundle(EXPORT_BUNDLE);
    const matches = await repos.listMatches({ limit: 200, status: 'played' });

    const byDate = new Map(matches.items.map((match) => [match.match_date, match]));
    expect(byDate.get('2026-05-25')).toMatchObject({ score: '6-4 6-3', result: 'Win' });
    expect(byDate.get('2026-06-02')).toMatchObject({ score: '4-6 6-7', result: 'Loss' });
    expect(byDate.get('2026-07-05')).toMatchObject({ score: '3-6 6-3 7-6', result: 'Win' });

    // The bundle has no result/score columns to have copied them from.
    expect(EXPORT_BUNDLE['matches.csv']).not.toContain('result');
    expect(EXPORT_BUNDLE['matches.csv']).not.toContain('score');
  });

  it('keeps scheduled matches scheduled and set-less', async () => {
    await repos.importCsvBundle(EXPORT_BUNDLE);
    const scheduled = await repos.listMatches({ limit: 200, status: 'scheduled' });

    expect(scheduled.total).toBe(3);
    for (const match of scheduled.items) {
      expect(match.sets).toEqual([]);
      expect(match.result).toBeNull();
    }
  });

  it('round-trips a friendly (no tournament) and a club-less match', async () => {
    await repos.importCsvBundle(EXPORT_BUNDLE);
    const matches = await repos.listMatches({ limit: 200 });

    const friendly = matches.items.find((match) => match.match_date === '2026-06-15');
    expect(friendly).toMatchObject({
      tournament_id: null,
      match_type: 'Friendly',
      notes: 'practice match',
    });

    const clubless = matches.items.find((match) => match.match_date === '2026-11-15');
    expect(clubless).toMatchObject({ club_id: null, court_id: null, surface: null });
  });

  it('round-trips data the app itself created, not just an imported bundle', async () => {
    // Nothing here has ever been through the CSV format, so this exercises the
    // export path independently of the importer that would agree with it.
    const club = await repos.createClub({
      name: 'Club, with a comma',
      city: 'Paris',
      courts: [{ surface: 'Clay', environment: 'Outdoor' }],
    });
    const opponent = await repos.createOpponent({
      last_name: 'O"HARA',
      name: 'Quote "Nickname" Test',
      handedness: 'L',
      age_range: 'Over 65',
      notes: 'multi\nline note',
    });
    await repos.createMatch({
      match_date: '2026-03-09',
      opponent_id: opponent.id,
      club_id: club.id,
      court_id: club.courts[0].id,
      score: '7-6 6-4',
      notes: 'has, comma',
    });

    const exported = await repos.exportCsvBundle();
    const result = await repos.importCsvBundle(exported);
    expect(result.skipped).toEqual([]);

    expect(await repos.exportCsvBundle()).toEqual(exported);
    const reread = (await repos.listOpponents()).items[0];
    expect(reread).toMatchObject({
      last_name: 'O"HARA',
      name: 'Quote "Nickname" Test',
      notes: 'multi\nline note',
    });
    expect((await repos.listMatches()).items[0]).toMatchObject({
      score: '7-6 6-4',
      notes: 'has, comma',
      surface: 'Clay',
    });
  });

  it('drops the two columns the CSV format does not carry, as the API does', async () => {
    // organiser and icon are stored locally but absent from the bundle, on the
    // server too — see docs/data-export.md.
    const club = await repos.createClub({ name: 'Iconic', icon: 'emoji:🎾' });
    await repos.createTournament({
      name: 'Local League',
      tournament_type: 'Ranking League',
      organiser: 'The Committee',
      club_id: club.id,
      icon: 'icon:trophy:clay',
    });

    const exported = await repos.exportCsvBundle();
    expect(exported['tournaments.csv']).not.toContain('The Committee');
    expect(exported['clubs.csv']).not.toContain('emoji');

    await repos.importCsvBundle(exported);
    const tournament = (await repos.listTournaments()).items[0];
    expect(tournament).toMatchObject({ organiser: null, icon: null, name: 'Local League' });
  });

  it('exports an empty database as six header-only files', async () => {
    const exported = await repos.exportCsvBundle();

    expect(exported['clubs.csv']).toBe('club_id,name,city,country\r\n');
    expect(exported['sets.csv']).toBe('set_id,match_id,set_no,games_won,games_lost,tiebreak\r\n');

    const result = await repos.importCsvBundle(exported);
    expect(result).toMatchObject({ clubs: 0, matches: 0, sets: 0, skipped: [] });
  });
});
