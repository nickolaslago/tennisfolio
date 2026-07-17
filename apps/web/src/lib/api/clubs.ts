/** Types and fetchers for the /clubs resource — mirrors app/schemas/club.py exactly. */
import { http } from './http'
import type { ListParams, Page } from './types'

export type Surface = 'Hard' | 'Clay' | 'Grass' | 'Carpet'
export type Environment = 'Indoor' | 'Outdoor'

export interface Court {
  id: number
  surface: Surface
  environment: Environment
}

/** A court as submitted on club create/update; ``id`` keeps an existing court. */
export interface CourtInput {
  id?: number
  surface: Surface
  environment: Environment
}

export interface Club {
  id: number
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

export function listClubs(params: ListParams = {}, signal?: AbortSignal) {
  return http.get<Page<Club>>('/clubs', { params, signal })
}

export function getClub(id: number, signal?: AbortSignal) {
  return http.get<Club>(`/clubs/${id}`, { signal })
}

export function createClub(payload: ClubCreate) {
  return http.post<Club>('/clubs', payload)
}

export function updateClub(id: number, payload: ClubUpdate) {
  return http.patch<Club>(`/clubs/${id}`, payload)
}

export function deleteClub(id: number) {
  return http.delete<void>(`/clubs/${id}`)
}
