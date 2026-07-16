/** Types and fetchers for the /opponents resource — mirrors app/schemas/opponent.py exactly. */
import { http } from './http'
import type { ListParams, Page } from './types'

export type Handedness = 'R' | 'L'
export type AgeRange = 'Under 18' | '18-25' | '26-35' | '36-45' | '46-55' | '56-65' | 'Over 65'

export interface Opponent {
  id: number
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

export function listOpponents(params: ListParams = {}, signal?: AbortSignal) {
  return http.get<Page<Opponent>>('/opponents', { params, signal })
}

export function getOpponent(id: number, signal?: AbortSignal) {
  return http.get<Opponent>(`/opponents/${id}`, { signal })
}

export function createOpponent(payload: OpponentCreate) {
  return http.post<Opponent>('/opponents', payload)
}

export function updateOpponent(id: number, payload: OpponentUpdate) {
  return http.patch<Opponent>(`/opponents/${id}`, payload)
}

export function deleteOpponent(id: number) {
  return http.delete<void>(`/opponents/${id}`)
}
