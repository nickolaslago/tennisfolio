/**
 * Shared domain entities and DTOs for every Tennisfolio client.
 *
 * These mirror `apps/api/src/app/models/` (and the Pydantic schemas over them)
 * one field at a time, so that a client backed by the hosted API and a client
 * backed by an on-device SQLite database expose the *same* shapes to screens.
 *
 * One deliberate difference from the hosted API: identifiers here are opaque
 * strings, not integers. The local-first clients generate UUIDs on device (see
 * `docs/mobile.md`), and a string id is the only representation both a
 * device-generated UUID and a server-assigned integer can share. `apps/web`
 * still declares its own numeric-id types in `src/lib/api/*.ts`; it can adopt
 * these once the hosted API moves to UUIDs in the Cloud Connect milestone.
 *
 * Derived data (a match's result, score string and set breakdown) is computed
 * from set rows via `./score`; it is never stored, and never part of a
 * `*Create` / `*Update` payload beyond the score input itself.
 */
import type { SetResult } from './types'

// ---------------------------------------------------------------------------
// Enums — the persisted *values* from apps/api/src/app/models/enums.py
// ---------------------------------------------------------------------------

/** Which hand an opponent plays with. */
export const HANDEDNESS_VALUES = ['R', 'L'] as const
export type Handedness = (typeof HANDEDNESS_VALUES)[number]

/** Coarse age bucket for an opponent (exact age is intentionally not tracked). */
export const AGE_RANGE_VALUES = [
  'Under 18',
  '18-25',
  '26-35',
  '36-45',
  '46-55',
  '56-65',
  'Over 65',
] as const
export type AgeRange = (typeof AGE_RANGE_VALUES)[number]

/** Court surface. */
export const SURFACE_VALUES = ['Hard', 'Clay', 'Grass', 'Carpet'] as const
export type Surface = (typeof SURFACE_VALUES)[number]

/** Whether a court is indoor or outdoor. */
export const ENVIRONMENT_VALUES = ['Indoor', 'Outdoor'] as const
export type Environment = (typeof ENVIRONMENT_VALUES)[number]

/** Competitive context a tournament provides for its matches. */
export const TOURNAMENT_TYPE_VALUES = ['Knockout Tournament', 'Ranking League'] as const
export type TournamentType = (typeof TOURNAMENT_TYPE_VALUES)[number]

/** Lifecycle of a match row. */
export const MATCH_STATUS_VALUES = ['played', 'scheduled'] as const
export type MatchStatus = (typeof MATCH_STATUS_VALUES)[number]

/** Narrowing helper shared by the CSV importer and any free-text input. */
export function isEnumValue<T extends string>(
  values: readonly T[],
  value: string | null | undefined,
): value is T {
  return value != null && (values as readonly string[]).includes(value)
}

// ---------------------------------------------------------------------------
// Envelopes
// ---------------------------------------------------------------------------

/** Mirrors apps/api's `schemas/common.py` `Page[ItemT]` envelope. */
export interface Page<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

export interface ListParams {
  limit?: number
  offset?: number
  search?: string
}

/** Opaque row identifier: a device-generated UUID in the local-first clients. */
export type EntityId = string

// ---------------------------------------------------------------------------
// Opponents
// ---------------------------------------------------------------------------

export interface Opponent {
  id: EntityId
  last_name: string
  name: string | null
  nationality: string | null
  handedness: Handedness | null
  age_range: AgeRange | null
  level: string | null
  notes: string | null
  icon: string | null
  created_at: string
  updated_at: string
}

export interface OpponentCreate {
  last_name: string
  name?: string | null
  nationality?: string | null
  handedness?: Handedness | null
  age_range?: AgeRange | null
  level?: string | null
  notes?: string | null
  icon?: string | null
}

export type OpponentUpdate = Partial<OpponentCreate>

export interface OpponentListParams extends ListParams {
  handedness?: Handedness
  age_range?: AgeRange
}

// ---------------------------------------------------------------------------
// Clubs and their courts
// ---------------------------------------------------------------------------

/** A court as read back nested under its club. */
export interface Court {
  id: EntityId
  surface: Surface
  environment: Environment
}

/** A court as submitted on club create/update; `id` keeps an existing court. */
export interface CourtInput {
  id?: EntityId
  surface: Surface
  environment: Environment
}

export interface Club {
  id: EntityId
  name: string
  city: string | null
  country: string | null
  icon: string | null
  courts: Court[]
  created_at: string
  updated_at: string
}

export interface ClubCreate {
  name: string
  city?: string | null
  country?: string | null
  icon?: string | null
  courts?: CourtInput[]
}

export type ClubUpdate = Partial<ClubCreate>

export interface ClubListParams extends ListParams {
  surface?: Surface
  environment?: Environment
  country?: string
}

// ---------------------------------------------------------------------------
// Tournaments
// ---------------------------------------------------------------------------

export interface Tournament {
  id: EntityId
  name: string
  season: string | null
  tournament_type: TournamentType
  format: string | null
  organiser: string | null
  club_id: EntityId | null
  start_date: string | null
  end_date: string | null
  notes: string | null
  icon: string | null
  created_at: string
  updated_at: string
}

export interface TournamentCreate {
  name: string
  season?: string | null
  tournament_type: TournamentType
  format?: string | null
  organiser?: string | null
  club_id?: EntityId | null
  start_date?: string | null
  end_date?: string | null
  notes?: string | null
  icon?: string | null
}

export type TournamentUpdate = Partial<TournamentCreate>

export interface TournamentListParams extends ListParams {
  tournament_type?: TournamentType
  club_id?: EntityId
}

/** One opponent's row in a Ranking League standings table. */
export interface StandingsRow {
  opponent_id: EntityId
  opponent_name: string
  played: number
  wins: number
  losses: number
  win_rate: number | null
  sets_won: number
  sets_lost: number
  games_won: number
  games_lost: number
}

// ---------------------------------------------------------------------------
// Matches and their sets
// ---------------------------------------------------------------------------

export interface SetInput {
  games_won: number
  games_lost: number
}

/** A set as read back: `result` is derived, never stored. */
export interface SetRead {
  set_no: number
  games_won: number
  games_lost: number
  tiebreak: boolean
  result: SetResult
}

export interface Match {
  id: EntityId
  match_date: string
  opponent_id: EntityId
  club_id: EntityId | null
  court_id: EntityId | null
  tournament_id: EntityId | null
  stage: string | null
  /** Derived from the match's court (read-only). */
  surface: Surface | null
  duration_min: number | null
  notes: string | null
  status: MatchStatus
  /** Derived: "Friendly" with no tournament, otherwise "Competitive". */
  match_type: string
  /** Derived from the set rows. */
  result: 'Win' | 'Loss' | null
  /** Derived from the set rows. */
  score: string | null
  sets: SetRead[]
  created_at: string
  updated_at: string
}

export interface MatchCreate {
  match_date: string
  opponent_id: EntityId
  club_id?: EntityId | null
  court_id?: EntityId | null
  tournament_id?: EntityId | null
  stage?: string | null
  duration_min?: number | null
  notes?: string | null
  score?: string | null
  sets?: SetInput[] | null
}

export type MatchUpdate = Partial<MatchCreate>

export interface MatchListParams extends ListParams {
  opponent_id?: EntityId
  club_id?: EntityId
  tournament_id?: EntityId
  surface?: Surface
  status?: MatchStatus
  date_from?: string
  date_to?: string
}

// ---------------------------------------------------------------------------
// Import / export
// ---------------------------------------------------------------------------

/** Row counts written by a wipe + replace import, plus any skipped rows. */
export interface ImportResult {
  clubs: number
  courts: number
  opponents: number
  tournaments: number
  matches: number
  sets: number
  skipped: string[]
}
