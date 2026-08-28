/**
 * Pure view-layer helpers for the club screens — form state, payload
 * mapping and validation — mirroring `apps/web/src/pages/clubs.tsx`. Kept
 * separate from the screens so they can be unit tested without rendering
 * React Native.
 */
import {
  ENVIRONMENT_VALUES,
  SURFACE_VALUES,
  type Club,
  type ClubCreate,
  type Court,
  type CourtInput,
  type Environment,
  type Surface,
} from '@tennisfolio/core';

import type { SelectOption } from '@/components/form';

export const SURFACE_OPTIONS: SelectOption[] = SURFACE_VALUES.map((surface) => ({
  value: surface,
  label: surface,
}));

export const ENVIRONMENT_OPTIONS: SelectOption[] = ENVIRONMENT_VALUES.map((environment) => ({
  value: environment,
  label: environment,
}));

export function isSurface(value: string): value is Surface {
  return (SURFACE_VALUES as readonly string[]).includes(value);
}

export function isEnvironment(value: string): value is Environment {
  return (ENVIRONMENT_VALUES as readonly string[]).includes(value);
}

export function formatCourt(court: Pick<Court, 'surface' | 'environment'>): string {
  return `${court.surface} · ${court.environment}`;
}

export function courtsSummary(courts: Court[]): string {
  if (courts.length === 0) return '—';
  return courts.map(formatCourt).join(', ');
}

/** A court row as edited in the form; fields may be blank while being filled in. */
export interface CourtRow {
  id?: string;
  surface: Surface | '';
  environment: Environment | '';
}

export const EMPTY_COURT: CourtRow = { surface: '', environment: '' };

export interface ClubFormState {
  name: string;
  city: string;
  country: string;
  courts: CourtRow[];
}

export const EMPTY_CLUB_FORM: ClubFormState = {
  name: '',
  city: '',
  country: '',
  courts: [{ ...EMPTY_COURT }],
};

export function clubToFormState(club: Club): ClubFormState {
  return {
    name: club.name,
    city: club.city ?? '',
    country: club.country ?? '',
    courts:
      club.courts.length > 0
        ? club.courts.map((court) => ({
            id: court.id,
            surface: court.surface,
            environment: court.environment,
          }))
        : [{ ...EMPTY_COURT }],
  };
}

export function clubFormToPayload(form: ClubFormState): ClubCreate {
  const courts: CourtInput[] = form.courts
    .filter(
      (court): court is { id?: string; surface: Surface; environment: Environment } =>
        Boolean(court.surface && court.environment),
    )
    .map((court) => ({ id: court.id, surface: court.surface, environment: court.environment }));
  return {
    name: form.name.trim(),
    city: form.city.trim() || null,
    country: form.country.trim() || null,
    courts,
  };
}

export function validateClubForm(form: ClubFormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = 'Name is required.';

  const complete = form.courts.filter((court) => court.surface && court.environment);
  const partial = form.courts.some(
    (court) => (court.surface && !court.environment) || (!court.surface && court.environment),
  );
  if (complete.length === 0) {
    errors.courts = 'Add at least one court.';
  } else if (partial) {
    errors.courts = 'Each court needs both a surface and an environment.';
  } else {
    const seen = new Set<string>();
    for (const court of complete) {
      const key = `${court.surface}/${court.environment}`;
      if (seen.has(key)) {
        errors.courts = 'Each court must be a unique surface and environment combination.';
        break;
      }
      seen.add(key);
    }
  }
  return errors;
}
