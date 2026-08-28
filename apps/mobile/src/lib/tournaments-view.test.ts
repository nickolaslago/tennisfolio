import {
  dateRange,
  EMPTY_TOURNAMENT_FORM,
  startsAsCustomFormat,
  tournamentFormToPayload,
  tournamentToFormState,
  validateTournamentForm,
} from './tournaments-view';

describe('dateRange', () => {
  it('renders an em dash with no dates', () => {
    expect(dateRange({ start_date: null, end_date: null })).toBe('—');
  });

  it('renders both dates, falling back to an em dash for a missing side', () => {
    expect(dateRange({ start_date: '2026-01-01', end_date: '2026-01-15' })).toBe(
      '2026-01-01 – 2026-01-15',
    );
    expect(dateRange({ start_date: '2026-01-01', end_date: null })).toBe('2026-01-01 – —');
  });
});

describe('validateTournamentForm', () => {
  it('requires a name and a tournament type', () => {
    const errors = validateTournamentForm(EMPTY_TOURNAMENT_FORM);
    expect(errors.name).toBe('Name is required.');
    expect(errors.tournament_type).toBe('Tournament type is required.');
  });

  it('rejects an end date before the start date', () => {
    const errors = validateTournamentForm({
      ...EMPTY_TOURNAMENT_FORM,
      name: 'Summer Open',
      tournament_type: 'Knockout Tournament',
      start_date: '2026-06-10',
      end_date: '2026-06-01',
    });
    expect(errors.end_date).toBe('End date must be on or after the start date.');
  });

  it('accepts a well-formed tournament', () => {
    const errors = validateTournamentForm({
      ...EMPTY_TOURNAMENT_FORM,
      name: 'Summer Open',
      tournament_type: 'Knockout Tournament',
    });
    expect(errors).toEqual({});
  });
});

describe('startsAsCustomFormat', () => {
  it('is false for a blank or preset format', () => {
    expect(startsAsCustomFormat('')).toBe(false);
    expect(startsAsCustomFormat('Best of 3')).toBe(false);
  });

  it('is true for a legacy free-text format', () => {
    expect(startsAsCustomFormat('Round robin, then knockout')).toBe(true);
  });
});

describe('tournamentFormToPayload / tournamentToFormState', () => {
  it('trims text fields, nulls blanks and clears the host club', () => {
    expect(
      tournamentFormToPayload({
        ...EMPTY_TOURNAMENT_FORM,
        name: '  Summer Open  ',
        tournament_type: 'Ranking League',
        club_id: '',
      }),
    ).toEqual({
      name: 'Summer Open',
      season: null,
      tournament_type: 'Ranking League',
      format: null,
      organiser: null,
      club_id: null,
      start_date: null,
      end_date: null,
      notes: null,
    });
  });

  it('round-trips through the payload mapper', () => {
    const tournament = {
      id: '1',
      name: 'Summer Open',
      season: '2026',
      tournament_type: 'Knockout Tournament' as const,
      format: 'Best of 3',
      organiser: 'Riverside Club',
      club_id: 'club-1',
      start_date: '2026-06-01',
      end_date: '2026-06-10',
      notes: 'Grass courts',
      icon: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    const form = tournamentToFormState(tournament);
    expect(tournamentFormToPayload(form)).toEqual({
      name: 'Summer Open',
      season: '2026',
      tournament_type: 'Knockout Tournament',
      format: 'Best of 3',
      organiser: 'Riverside Club',
      club_id: 'club-1',
      start_date: '2026-06-01',
      end_date: '2026-06-10',
      notes: 'Grass courts',
    });
  });
});
