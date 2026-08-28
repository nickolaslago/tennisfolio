import {
  fullName,
  opponentFormToPayload,
  opponentToFormState,
  validateOpponentForm,
  EMPTY_OPPONENT_FORM,
} from './opponents-view';

describe('fullName', () => {
  it('joins first and last name when both are set', () => {
    expect(fullName({ name: 'Alex', last_name: 'Rivera' })).toBe('Alex Rivera');
  });

  it('falls back to just the last name', () => {
    expect(fullName({ name: null, last_name: 'Rivera' })).toBe('Rivera');
  });
});

describe('validateOpponentForm', () => {
  it('requires a last name', () => {
    const errors = validateOpponentForm(EMPTY_OPPONENT_FORM);
    expect(errors.last_name).toBe('Last name is required.');
  });

  it('accepts a blank first name and other optional fields', () => {
    const errors = validateOpponentForm({ ...EMPTY_OPPONENT_FORM, last_name: 'Rivera' });
    expect(errors).toEqual({});
  });
});

describe('opponentFormToPayload', () => {
  it('trims text fields and nulls out blanks', () => {
    expect(
      opponentFormToPayload({
        ...EMPTY_OPPONENT_FORM,
        last_name: '  Rivera  ',
        name: '  ',
        level: ' 4.5 ',
      }),
    ).toEqual({
      last_name: 'Rivera',
      name: null,
      nationality: null,
      handedness: null,
      age_range: null,
      level: '4.5',
      notes: null,
    });
  });
});

describe('opponentToFormState', () => {
  it('round-trips through the payload mapper', () => {
    const opponent = {
      id: '1',
      last_name: 'Rivera',
      name: 'Alex',
      nationality: 'Spain',
      handedness: 'R' as const,
      age_range: '26-35' as const,
      level: '4.5',
      notes: 'Strong forehand',
      icon: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    const form = opponentToFormState(opponent);
    expect(opponentFormToPayload(form)).toEqual({
      last_name: 'Rivera',
      name: 'Alex',
      nationality: 'Spain',
      handedness: 'R',
      age_range: '26-35',
      level: '4.5',
      notes: 'Strong forehand',
    });
  });
});
