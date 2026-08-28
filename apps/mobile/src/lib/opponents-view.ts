/**
 * Pure view-layer helpers for the opponent screens — form state, payload
 * mapping and validation — mirroring the corresponding functions in
 * `apps/web/src/pages/opponents.tsx`. Kept separate from the screens so they
 * can be unit tested without rendering React Native.
 */
import {
  AGE_RANGE_VALUES,
  HANDEDNESS_VALUES,
  type AgeRange,
  type Handedness,
  type Opponent,
  type OpponentCreate,
} from '@tennisfolio/core';

import type { SelectOption } from '@/components/form';

export const HANDEDNESS_OPTIONS: SelectOption[] = [
  { value: 'R', label: 'Right' },
  { value: 'L', label: 'Left' },
];

export const AGE_RANGE_OPTIONS: SelectOption[] = AGE_RANGE_VALUES.map((range) => ({
  value: range,
  label: range,
}));

export function isHandedness(value: string): value is Handedness {
  return (HANDEDNESS_VALUES as readonly string[]).includes(value);
}

export function isAgeRange(value: string): value is AgeRange {
  return (AGE_RANGE_VALUES as readonly string[]).includes(value);
}

/** `"First Last"`, falling back to just the (required) last name. */
export function fullName(opponent: Pick<Opponent, 'name' | 'last_name'>): string {
  return opponent.name ? `${opponent.name} ${opponent.last_name}` : opponent.last_name;
}

export interface OpponentFormState {
  last_name: string;
  name: string;
  nationality: string;
  handedness: Handedness | '';
  age_range: AgeRange | '';
  level: string;
  notes: string;
}

export const EMPTY_OPPONENT_FORM: OpponentFormState = {
  last_name: '',
  name: '',
  nationality: '',
  handedness: '',
  age_range: '',
  level: '',
  notes: '',
};

export function opponentToFormState(opponent: Opponent): OpponentFormState {
  return {
    last_name: opponent.last_name,
    name: opponent.name ?? '',
    nationality: opponent.nationality ?? '',
    handedness: opponent.handedness ?? '',
    age_range: opponent.age_range ?? '',
    level: opponent.level ?? '',
    notes: opponent.notes ?? '',
  };
}

export function opponentFormToPayload(form: OpponentFormState): OpponentCreate {
  return {
    last_name: form.last_name.trim(),
    name: form.name.trim() || null,
    nationality: form.nationality.trim() || null,
    handedness: form.handedness || null,
    age_range: form.age_range || null,
    level: form.level.trim() || null,
    notes: form.notes.trim() || null,
  };
}

export function validateOpponentForm(form: OpponentFormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.last_name.trim()) errors.last_name = 'Last name is required.';
  return errors;
}
