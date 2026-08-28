/// <reference types="jest" />
/**
 * Import behaviour, including the API quirks this port deliberately keeps.
 */
import type { Database } from '@/db/sqlite';
import type { Repositories } from '@/lib/repositories';
import { validateSet } from '@/lib/transfer/import';
import type { CsvBundle } from '@/lib/transfer/format';
import { openTestRepositories } from '@/test-support/db';

import { EXPECTED_COUNTS, EXPORT_BUNDLE } from './__fixtures__/export-bundle';

/** The fixture with one or more files replaced. */
function bundleWith(overrides: Partial<CsvBundle>): CsvBundle {
  return { ...EXPORT_BUNDLE, ...overrides };
}

function csv(...lines: string[]): string {
  return lines.join('\r\n') + '\r\n';
}

const EMPTY_BUNDLE: CsvBundle = {
  'clubs.csv': csv('club_id,name,city,country'),
  'courts.csv': csv('court_id,club_id,surface,environment'),
  'opponents.csv': csv('opponent_id,last_name,name,nationality,handeness,age_range,level,notes'),
  'tournaments.csv': csv(
    'tournament_id,name,season,tournament_type,format,club_id,start_date,end_date,notes',
  ),
  'matches.csv': csv(
    'match_id,match_date,opponent_id,club_id,court_id,tournament_id,stage,duration_min,status,notes',
  ),
  'sets.csv': csv('set_id,match_id,set_no,games_won,games_lost,tiebreak'),
};

describe('importCsvBundle', () => {
  let db: Database;
  let repos: Repositories;

  beforeEach(async () => {
    ({ db, repos } = await openTestRepositories());
  });

  it('loads a real Docker-PoC export cleanly', async () => {
    const result = await repos.importCsvBundle(EXPORT_BUNDLE);

    expect(result).toEqual({ ...EXPECTED_COUNTS, skipped: [] });
    expect(await db.selectValue('SELECT COUNT(*) FROM matches')).toBe(11);
  });

  it('gives every imported row a UUID and both timestamps', async () => {
    await repos.importCsvBundle(EXPORT_BUNDLE);

    for (const table of ['clubs', 'courts', 'opponents', 'tournaments', 'matches', 'sets']) {
      const rows = await db.select<{ id: string; created_at: string; updated_at: string }>(
        `SELECT id, created_at, updated_at FROM ${table}`,
      );
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        );
        expect(row.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(row.updated_at).toBe(row.created_at);
      }
    }
  });

  it('resolves the bundle-local ids into real relations', async () => {
    await repos.importCsvBundle(EXPORT_BUNDLE);

    const page = await repos.listMatches({ date_from: '2026-05-25', date_to: '2026-05-25' });
    const [match] = page.items;
    const opponent = await repos.getOpponent(match.opponent_id);
    const club = await repos.getClub(match.club_id!);

    expect(opponent.last_name).toBe('FEDERER');
    expect(club.name).toBe('Stade Roland Garros');
    expect(match.surface).toBe('Clay');
    expect(match.match_type).toBe('Competitive');
  });

  it('recomputes results and scores rather than reading them from the bundle', async () => {
    await repos.importCsvBundle(EXPORT_BUNDLE);

    const page = await repos.listMatches({ date_from: '2026-05-28', date_to: '2026-05-28' });
    expect(page.items[0]).toMatchObject({ score: '7-6 4-6 6-4', result: 'Win' });
  });

  it('converts DD-MM-YYYY dates to ISO', async () => {
    await repos.importCsvBundle(EXPORT_BUNDLE);

    const tournaments = await repos.listTournaments({ search: 'Wimbledon' });
    expect(tournaments.items[0]).toMatchObject({
      start_date: '2026-06-29',
      end_date: '2026-07-12',
    });
  });

  it('maps the seed data’s colloquial "Fast" surface to Hard', async () => {
    const result = await repos.importCsvBundle(
      bundleWith({
        'courts.csv': csv(
          'court_id,club_id,surface,environment',
          'cou-1,clu-1,Fast,Outdoor',
          'cou-2,clu-2,Grass,Outdoor',
          'cou-3,clu-3,Hard,Outdoor',
          'cou-4,clu-4,Hard,Indoor',
        ),
      }),
    );

    expect(result.skipped).toEqual([]);
    const club = (await repos.listClubs({ search: 'Roland' })).items[0];
    expect(club.courts).toEqual([
      expect.objectContaining({ surface: 'Hard', environment: 'Outdoor' }),
    ]);
  });

  it('wipes existing data and tombstones it', async () => {
    const stale = await repos.createOpponent({ last_name: 'STALE' });
    await repos.importCsvBundle(EXPORT_BUNDLE);

    await expect(repos.getOpponent(stale.id)).rejects.toMatchObject({ status: 404 });
    expect(
      await db.selectValue('SELECT COUNT(*) FROM deletions WHERE entity_id = ?', [stale.id]),
    ).toBe(1);
    expect((await repos.listOpponents()).total).toBe(8);
  });

  it('imports an empty bundle as an empty database', async () => {
    const result = await repos.importCsvBundle(EMPTY_BUNDLE);
    expect(result).toEqual({
      clubs: 0,
      courts: 0,
      opponents: 0,
      tournaments: 0,
      matches: 0,
      sets: 0,
      skipped: [],
    });
  });

  it('422s and changes nothing when a file is missing', async () => {
    const opponent = await repos.createOpponent({ last_name: 'KEEP' });
    const { 'sets.csv': _omitted, ...incomplete } = EXPORT_BUNDLE;

    await expect(repos.importCsvBundle(incomplete)).rejects.toMatchObject({
      status: 422,
      message: expect.stringContaining('sets.csv'),
    });
    await expect(repos.getOpponent(opponent.id)).resolves.toBeDefined();
  });

  describe('skipped rows', () => {
    it('skips a court whose club is not in the bundle', async () => {
      const result = await repos.importCsvBundle(
        bundleWith({
          'courts.csv': csv('court_id,club_id,surface,environment', 'cou-9,clu-99,Clay,Outdoor'),
        }),
      );

      expect(result.courts).toBe(0);
      expect(result.skipped).toContain("[courts] cou-9: unknown club_id 'clu-99'");
    });

    it('skips a court with an unknown surface or a missing environment', async () => {
      const result = await repos.importCsvBundle(
        bundleWith({
          'courts.csv': csv(
            'court_id,club_id,surface,environment',
            'cou-1,clu-1,Sand,Outdoor',
            'cou-2,clu-1,Clay,',
          ),
        }),
      );

      expect(result.courts).toBe(0);
      expect(result.skipped).toEqual(
        expect.arrayContaining([
          "[courts] cou-1: unknown surface 'Sand'",
          '[courts] cou-2: missing environment',
        ]),
      );
    });

    it('keeps an opponent but nulls an enum it cannot read', async () => {
      const result = await repos.importCsvBundle(
        bundleWith({
          'opponents.csv': csv(
            'opponent_id,last_name,name,nationality,handeness,age_range,level,notes',
            'opp-1,FEDERER,Roger Federer,Switzerland,Z,Ancient,10,',
          ),
        }),
      );

      expect(result.opponents).toBe(1);
      expect(result.skipped.slice(0, 2)).toEqual([
        "[opponents] opp-1: unknown handedness 'Z'",
        "[opponents] opp-1: unknown age_range 'Ancient'",
      ]);
      const opponent = (await repos.listOpponents()).items[0];
      expect(opponent).toMatchObject({ handedness: null, age_range: null, last_name: 'FEDERER' });
    });

    it('skips a tournament with an unreadable type', async () => {
      const result = await repos.importCsvBundle(
        bundleWith({
          'tournaments.csv': csv(
            'tournament_id,name,season,tournament_type,format,club_id,start_date,end_date,notes',
            'tou-1,Wimbledon,2026,Exhibition,Best of 5,clu-2,29-06-2026,12-07-2026,',
          ),
        }),
      );

      expect(result.tournaments).toBe(0);
      expect(result.skipped).toContain("[tournaments] tou-1: unknown tournament_type 'Exhibition'");
    });

    it('skips a match with an unparseable date or an unknown opponent', async () => {
      const result = await repos.importCsvBundle(
        bundleWith({
          'matches.csv': csv(
            'match_id,match_date,opponent_id,club_id,court_id,tournament_id,stage,duration_min,status,notes',
            'mat-1,2026-05-25,opp-1,,,,,,played,',
            'mat-2,25-05-2026,opp-99,,,,,,played,',
          ),
          'sets.csv': csv('set_id,match_id,set_no,games_won,games_lost,tiebreak'),
        }),
      );

      expect(result.matches).toBe(0);
      expect(result.skipped).toEqual([
        "[matches] mat-1: unparseable match_date '2026-05-25'",
        "[matches] mat-2: unknown opponent_id 'opp-99'",
      ]);
    });

    it('skips a set whose score is not a legal set', async () => {
      const result = await repos.importCsvBundle(
        bundleWith({
          'sets.csv': csv(
            'set_id,match_id,set_no,games_won,games_lost,tiebreak',
            'set-1,mat-1,1,6,4,false',
            'set-2,mat-1,2,9,3,false',
          ),
        }),
      );

      expect(result.sets).toBe(1);
      expect(result.skipped).toEqual(['[sets] set-2: not a legal set score (9-3)']);
    });

    it('skips a set whose tiebreak flag contradicts its score', async () => {
      const result = await repos.importCsvBundle(
        bundleWith({
          'sets.csv': csv(
            'set_id,match_id,set_no,games_won,games_lost,tiebreak',
            'set-1,mat-1,1,7,6,false',
          ),
        }),
      );

      expect(result.skipped).toEqual([
        '[sets] set-1: tiebreak flag inconsistent with score (7-6, tiebreak=false)',
      ]);
    });

    it('keeps the first of two conflicting rows for the same set number', async () => {
      const result = await repos.importCsvBundle(
        bundleWith({
          'sets.csv': csv(
            'set_id,match_id,set_no,games_won,games_lost,tiebreak',
            'set-1,mat-1,1,6,4,false',
            'set-2,mat-1,1,6,2,false',
          ),
        }),
      );

      expect(result.sets).toBe(1);
      expect(result.skipped[0]).toContain('duplicate set_no 1 for mat-1');
      const match = (await repos.listMatches({ date_from: '2026-05-25', date_to: '2026-05-25' }))
        .items[0];
      expect(match.score).toBe('6-4');
    });

    it('de-duplicates rows that share a natural key within one bundle', async () => {
      const result = await repos.importCsvBundle(
        bundleWith({
          'clubs.csv': csv(
            'club_id,name,city,country',
            'clu-1,Stade Roland Garros,Paris,France',
            'clu-2,Stade Roland Garros,Paris 16e,France',
          ),
          'courts.csv': csv('court_id,club_id,surface,environment'),
          'tournaments.csv': csv(
            'tournament_id,name,season,tournament_type,format,club_id,start_date,end_date,notes',
          ),
          'matches.csv': csv(
            'match_id,match_date,opponent_id,club_id,court_id,tournament_id,stage,duration_min,status,notes',
          ),
          'sets.csv': csv('set_id,match_id,set_no,games_won,games_lost,tiebreak'),
        }),
      );

      // One row, updated by the second — the API's upsert-on-natural-key.
      expect(result.clubs).toBe(1);
      const clubs = await repos.listClubs();
      expect(clubs.items).toHaveLength(1);
      expect(clubs.items[0].city).toBe('Paris 16e');
    });
  });
});

describe('validateSet', () => {
  it.each([
    [6, 0, false],
    [6, 4, false],
    [7, 5, false],
    [7, 6, true],
    [0, 6, false],
    [6, 7, true],
  ])('accepts %i-%i (tiebreak %s)', (won, lost, tiebreak) => {
    expect(validateSet(won, lost, tiebreak)).toBeNull();
  });

  it.each([
    [6, 5],
    [8, 6],
    [5, 5],
  ])('rejects %i-%i as not a completed set', (won, lost) => {
    expect(validateSet(won, lost, false)).toMatch(/not a legal set score/);
  });

  it('rejects a super-tiebreak, exactly as the API importer does', () => {
    // The CSV bundle carries no super-tiebreaks on either side of the wire;
    // `parseScore` accepts them, this importer does not, and that asymmetry is
    // the API's (see app/seed_import.py::validate_set).
    expect(validateSet(10, 7, true)).toMatch(/not a legal set score \(10-7\)/);
  });
});
