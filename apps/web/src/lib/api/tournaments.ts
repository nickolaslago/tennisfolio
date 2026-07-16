/** Types and fetchers for the /tournaments resource — mirrors app/schemas/tournament.py exactly. */
import { http } from './http'
import type { ListParams, Page } from './types'

export type TournamentType = 'Knockout Tournament' | 'Ranking League'

export interface Tournament {
  id: number
  name: string
  season: string | null
  tournament_type: TournamentType
  format: string | null
  club_id: number | null
  start_date: string | null
  end_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TournamentCreate {
  name: string
  season?: string | null
  tournament_type: TournamentType
  format?: string | null
  club_id?: number | null
  start_date?: string | null
  end_date?: string | null
  notes?: string | null
}

export type TournamentUpdate = Partial<TournamentCreate>

export interface TournamentListParams extends ListParams {
  tournament_type?: TournamentType
}

export function listTournaments(params: TournamentListParams = {}, signal?: AbortSignal) {
  return http.get<Page<Tournament>>('/tournaments', { params, signal })
}

export function getTournament(id: number, signal?: AbortSignal) {
  return http.get<Tournament>(`/tournaments/${id}`, { signal })
}

export function createTournament(payload: TournamentCreate) {
  return http.post<Tournament>('/tournaments', payload)
}

export function updateTournament(id: number, payload: TournamentUpdate) {
  return http.patch<Tournament>(`/tournaments/${id}`, payload)
}

export function deleteTournament(id: number) {
  return http.delete<void>(`/tournaments/${id}`)
}
