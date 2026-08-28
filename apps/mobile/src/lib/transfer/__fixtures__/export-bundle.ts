/**
 * A realistic CSV bundle, shaped exactly as `GET /export/csv` emits one.
 *
 * The rows are the repo's own Docker-PoC seed data (`apps/api/seed/*.csv`) —
 * four clubs and their courts, eight opponents, four tournaments, eleven
 * matches (played and scheduled, competitive and friendly) and eighteen sets.
 *
 * Two differences from the seed files on disk, both because this is an
 * *export* rather than raw seed input:
 *
 * - Surfaces are canonical enum values. The seed CSVs say `Fast` for the two
 *   hard-court venues; the importer maps that to `Hard`, so an export writes
 *   `Hard` back out. (`import.test.ts` covers the alias itself.)
 * - Rows are CRLF-terminated, as Python's `csv.writer` produces them.
 *
 * Because the local ids are contiguous and in insertion order, importing this
 * bundle and exporting again has to reproduce it byte for byte — which is what
 * `round-trip.test.ts` asserts.
 */
import type { CsvBundle } from '@/lib/transfer/format';

/** Joins rows with CRLF and adds the trailing CRLF `csv.writer` leaves. */
function csv(...lines: string[]): string {
  return lines.join('\r\n') + '\r\n';
}

export const EXPORT_BUNDLE: CsvBundle = {
  'clubs.csv': csv(
    'club_id,name,city,country',
    'clu-1,Stade Roland Garros,Paris,France',
    'clu-2,All England Lawn Tennis & Croquet Club,London,United Kingdom',
    'clu-3,USTA Billie Jean King National Tennis Center,New York,Unite States',
    'clu-4,La Defense Arena,Paris,France',
  ),

  'courts.csv': csv(
    'court_id,club_id,surface,environment',
    'cou-1,clu-1,Clay,Outdoor',
    'cou-2,clu-2,Grass,Outdoor',
    'cou-3,clu-3,Hard,Outdoor',
    'cou-4,clu-4,Hard,Indoor',
  ),

  'opponents.csv': csv(
    'opponent_id,last_name,name,nationality,handeness,age_range,level,notes',
    'opp-1,FEDERER,Roger Federer,Switzerland,R,36-45,10,',
    'opp-2,NADAL,Rafael Nadal,Spain,L,36-45,10,',
    'opp-3,DJOKOVIC,Novak Djokovic,Serbia,R,36-45,10,',
    'opp-4,MURRAY,Andy Murray,United Kingdom,R,36-45,9,',
    'opp-5,ALCARAZ,Carlos Alcaraz,Spain,R,18-25,9.5,',
    'opp-6,SINNER,Jannik Sinner,Italy,R,18-25,9.5,',
    'opp-7,WAWRINKA,Stan Wawrinka,Switzerland,R,36-45,8.5,',
    'opp-8,ZVEREV,Alexander Zverev,Germany,R,26-35,9,',
  ),

  'tournaments.csv': csv(
    'tournament_id,name,season,tournament_type,format,club_id,start_date,end_date,notes',
    'tou-1,Wimbledon,2026,Knockout Tournament,Best of 5,clu-2,29-06-2026,12-07-2026,',
    'tou-2,Rolland Garros,2026,Knockout Tournament,Best of 5,clu-1,24-05-2026,07-06-2026,',
    'tou-3,US Open,2026,Knockout Tournament,Best of 5,clu-3,30-08-2026,13-09-2026,',
    'tou-4,ATP Finals,2026,Ranking League,Best of 3,,01-01-2026,30-11-2026,round robin standings',
  ),

  'matches.csv': csv(
    'match_id,match_date,opponent_id,club_id,court_id,tournament_id,stage,duration_min,status,notes',
    'mat-1,25-05-2026,opp-1,clu-1,cou-1,tou-2,R32,125,played,',
    'mat-2,28-05-2026,opp-6,clu-1,cou-1,tou-2,R16,145,played,',
    'mat-3,02-06-2026,opp-5,clu-1,cou-1,tou-2,Quarterfinal,160,played,',
    'mat-4,30-06-2026,opp-2,clu-2,cou-2,tou-1,R64,110,played,',
    'mat-5,05-07-2026,opp-4,clu-2,cou-2,tou-1,R32,95,played,',
    'mat-6,10-07-2026,opp-8,clu-2,cou-2,tou-1,R16,130,played,',
    'mat-7,15-06-2026,opp-7,clu-4,cou-4,,Friendly,90,played,practice match',
    'mat-8,01-07-2026,opp-3,clu-4,cou-4,,Friendly,100,played,',
    'mat-9,31-08-2026,opp-6,clu-3,cou-3,tou-3,R64,,scheduled,',
    'mat-10,05-09-2026,opp-5,clu-3,cou-3,tou-3,R16,,scheduled,',
    'mat-11,15-11-2026,opp-1,,,tou-4,Round Robin,,scheduled,',
  ),

  'sets.csv': csv(
    'set_id,match_id,set_no,games_won,games_lost,tiebreak',
    'set-1,mat-1,1,6,4,false',
    'set-2,mat-1,2,6,3,false',
    'set-3,mat-2,1,7,6,true',
    'set-4,mat-2,2,4,6,false',
    'set-5,mat-2,3,6,4,false',
    'set-6,mat-3,1,4,6,false',
    'set-7,mat-3,2,6,7,true',
    'set-8,mat-4,1,6,2,false',
    'set-9,mat-4,2,6,4,false',
    'set-10,mat-5,1,3,6,false',
    'set-11,mat-5,2,6,3,false',
    'set-12,mat-5,3,7,6,true',
    'set-13,mat-6,1,6,7,true',
    'set-14,mat-6,2,4,6,false',
    'set-15,mat-7,1,6,3,false',
    'set-16,mat-7,2,6,2,false',
    'set-17,mat-8,1,4,6,false',
    'set-18,mat-8,2,6,7,true',
  ),
};

/** Row counts a clean import of {@link EXPORT_BUNDLE} must report. */
export const EXPECTED_COUNTS = {
  clubs: 4,
  courts: 4,
  opponents: 8,
  tournaments: 4,
  matches: 11,
  sets: 18,
} as const;
