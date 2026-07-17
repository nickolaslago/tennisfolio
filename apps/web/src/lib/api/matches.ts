/** Types and fetchers for the /matches resource — mirrors app/schemas/match.py exactly. */
import { http } from './http'
import type { ListParams, Page } from './types'

export type Surface = 'Hard' | 'Clay' | 'Grass' | 'Carpet'
export type MatchStatus = 'played' | 'scheduled'
export type SetResult = 'Win' | 'Loss'

export interface SetInput {
  games_won: number
  games_lost: number
}

export interface SetRead {
  set_no: number
  games_won: number
  games_lost: number
  tiebreak: boolean
  result: SetResult
}

export type MatchResult = 'Win' | 'Loss'

export interface Match {
  id: number
  match_date: string
  opponent_id: number
  club_id: number | null
  court_id: number | null
  tournament_id: number | null
  stage: string | null
  /** Derived from the match's court (read-only). */
  surface: Surface | null
  duration_min: number | null
  notes: string | null
  status: MatchStatus
  match_type: string
  result: MatchResult | null
  score: string | null
  sets: SetRead[]
  created_at: string
  updated_at: string
}

export interface MatchCreate {
  match_date: string
  opponent_id: number
  club_id?: number | null
  court_id?: number | null
  tournament_id?: number | null
  stage?: string | null
  duration_min?: number | null
  notes?: string | null
  score?: string | null
  sets?: SetInput[] | null
}

export type MatchUpdate = Partial<MatchCreate>

export interface MatchListParams extends ListParams {
  opponent_id?: number
  club_id?: number
  tournament_id?: number
  surface?: Surface
  status?: MatchStatus
  date_from?: string
  date_to?: string
}

export function listMatches(params: MatchListParams = {}, signal?: AbortSignal) {
  return http.get<Page<Match>>('/matches', { params, signal })
}

export function getMatch(id: number, signal?: AbortSignal) {
  return http.get<Match>(`/matches/${id}`, { signal })
}

export function createMatch(payload: MatchCreate) {
  return http.post<Match>('/matches', payload)
}

export function updateMatch(id: number, payload: MatchUpdate) {
  return http.patch<Match>(`/matches/${id}`, payload)
}

export function deleteMatch(id: number) {
  return http.delete<void>(`/matches/${id}`)
}
