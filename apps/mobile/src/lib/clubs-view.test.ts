import {
  clubFormToPayload,
  clubToFormState,
  courtsSummary,
  EMPTY_CLUB_FORM,
  formatCourt,
  validateClubForm,
} from './clubs-view';

describe('formatCourt / courtsSummary', () => {
  it('formats a single court as "Surface · Environment"', () => {
    expect(formatCourt({ surface: 'Clay', environment: 'Outdoor' })).toBe('Clay · Outdoor');
  });

  it('joins multiple courts and falls back to an em dash', () => {
    expect(
      courtsSummary([
        { id: '1', surface: 'Hard', environment: 'Indoor' },
        { id: '2', surface: 'Clay', environment: 'Outdoor' },
      ]),
    ).toBe('Hard · Indoor, Clay · Outdoor');
    expect(courtsSummary([])).toBe('—');
  });
});

describe('validateClubForm', () => {
  it('requires a name and at least one complete court', () => {
    const errors = validateClubForm(EMPTY_CLUB_FORM);
    expect(errors.name).toBe('Name is required.');
    expect(errors.courts).toBe('Add at least one court.');
  });

  it('rejects a court missing one half of the pair, alongside a complete one', () => {
    const errors = validateClubForm({
      ...EMPTY_CLUB_FORM,
      name: 'Riverside',
      courts: [
        { surface: 'Hard', environment: 'Indoor' },
        { surface: 'Clay', environment: '' },
      ],
    });
    expect(errors.courts).toBe('Each court needs both a surface and an environment.');
  });

  it('rejects duplicate surface/environment pairs', () => {
    const errors = validateClubForm({
      ...EMPTY_CLUB_FORM,
      name: 'Riverside',
      courts: [
        { surface: 'Hard', environment: 'Indoor' },
        { surface: 'Hard', environment: 'Indoor' },
      ],
    });
    expect(errors.courts).toBe('Each court must be a unique surface and environment combination.');
  });

  it('accepts a well-formed club', () => {
    const errors = validateClubForm({
      ...EMPTY_CLUB_FORM,
      name: 'Riverside',
      courts: [{ surface: 'Hard', environment: 'Indoor' }],
    });
    expect(errors).toEqual({});
  });
});

describe('clubFormToPayload', () => {
  it('drops incomplete courts and trims text fields', () => {
    expect(
      clubFormToPayload({
        name: '  Riverside  ',
        city: '  ',
        country: 'Spain',
        courts: [
          { surface: 'Hard', environment: 'Indoor' },
          { surface: 'Clay', environment: '' },
        ],
      }),
    ).toEqual({
      name: 'Riverside',
      city: null,
      country: 'Spain',
      courts: [{ id: undefined, surface: 'Hard', environment: 'Indoor' }],
    });
  });
});

describe('clubToFormState', () => {
  it('round-trips through the payload mapper', () => {
    const club = {
      id: '1',
      name: 'Riverside',
      city: 'Valencia',
      country: 'Spain',
      icon: null,
      courts: [{ id: 'court-1', surface: 'Clay' as const, environment: 'Outdoor' as const }],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    const form = clubToFormState(club);
    expect(clubFormToPayload(form)).toEqual({
      name: 'Riverside',
      city: 'Valencia',
      country: 'Spain',
      courts: [{ id: 'court-1', surface: 'Clay', environment: 'Outdoor' }],
    });
  });
});
