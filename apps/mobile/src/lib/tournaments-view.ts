/**
 * Pure view-layer helpers for the tournament screens — form state, payload
 * mapping and validation — mirroring `apps/web/src/pages/tournaments.tsx`.
 * Kept separate from the screens so they can be unit tested without
 * rendering React Native.
 */
import {
  isTournamentFormat,
  TOURNAMENT_FORMAT_OPTIONS,
  TOURNAMENT_TYPE_VALUES,
  type Tournament,
  type TournamentCreate,
  type TournamentType,
} from '@tennisfolio/core';

import type { SelectOption } from '@/components/form';

export const TOURNAMENT_TYPE_OPTIONS: SelectOption[] = TOURNAMENT_TYPE_VALUES.map((type) => ({
  value: type,
  label: type,
}));

export function isTournamentType(value: string): value is TournamentType {
  return (TOURNAMENT_TYPE_VALUES as readonly string[]).includes(value);
}

/** Sentinel select value for the "Custom" format option that reveals a free-text field. */
export const CUSTOM_FORMAT_VALUE = '__custom__';

export const FORMAT_OPTIONS: SelectOption[] = [
  ...TOURNAMENT_FORMAT_OPTIONS.map((option) => ({ value: option, label: option })),
  { value: CUSTOM_FORMAT_VALUE, label: 'Custom' },
];

export function dateRange(tournament: Pick<Tournament, 'start_date' | 'end_date'>): string {
  if (!tournament.start_date && !tournament.end_date) return '—';
  return `${tournament.start_date ?? '—'} – ${tournament.end_date ?? '—'}`;
}

export interface TournamentFormState {
  name: string;
  season: string;
  tournament_type: TournamentType | '';
  format: string;
  organiser: string;
  club_id: string;
  start_date: string;
  end_date: string;
  notes: string;
}

export const EMPTY_TOURNAMENT_FORM: TournamentFormState = {
  name: '',
  season: '',
  tournament_type: '',
  format: '',
  organiser: '',
  club_id: '',
  start_date: '',
  end_date: '',
  notes: '',
};

export function tournamentToFormState(tournament: Tournament): TournamentFormState {
  return {
    name: tournament.name,
    season: tournament.season ?? '',
    tournament_type: tournament.tournament_type,
    format: tournament.format ?? '',
    organiser: tournament.organiser ?? '',
    club_id: tournament.club_id ?? '',
    start_date: tournament.start_date ?? '',
    end_date: tournament.end_date ?? '',
    notes: tournament.notes ?? '',
  };
}

export function tournamentFormToPayload(form: TournamentFormState): TournamentCreate {
  return {
    name: form.name.trim(),
    season: form.season.trim() || null,
    tournament_type: form.tournament_type as TournamentType,
    format: form.format.trim() || null,
    organiser: form.organiser.trim() || null,
    club_id: form.club_id || null,
    start_date: form.start_date || null,
    end_date: form.end_date || null,
    notes: form.notes.trim() || null,
  };
}

export function validateTournamentForm(form: TournamentFormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = 'Name is required.';
  if (!form.tournament_type) errors.tournament_type = 'Tournament type is required.';
  if (form.start_date && form.end_date && form.start_date > form.end_date) {
    errors.end_date = 'End date must be on or after the start date.';
  }
  return errors;
}

/** Whether an existing format value should start the "Custom" field open. */
export function startsAsCustomFormat(format: string): boolean {
  return format.length > 0 && !isTournamentFormat(format);
}
