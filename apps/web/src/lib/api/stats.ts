/** Types and fetchers for the /stats resource — mirrors app/schemas/stats.py exactly. */
import { http } from './http'
import type { Surface } from './matches'

export interface StatsFilterParams {
  date_from?: string
  date_to?: string
  surface?: Surface
  opponent_id?: number
  club_id?: number
  tournament_id?: number
  [key: string]: string | number | undefined
}

export interface WinRateStat {
  matches: number
  wins: number
  losses: number
  win_rate: number | null
}

export interface SurfaceWinRate extends WinRateStat {
  surface: Surface
}

export type PeriodGranularity = 'month' | 'season'

export interface PeriodWinRate extends WinRateStat {
  period: string
}

export interface StreakStats {
  current_streak_type: 'Win' | 'Loss' | null
  current_streak_length: number
  longest_win_streak: number
  longest_loss_streak: number
}

export interface RecordStat {
  played: number
  wins: number
  losses: number
  win_rate: number | null
}

export function getWinRate(params: StatsFilterParams = {}, signal?: AbortSignal) {
  return http.get<WinRateStat>('/stats/win-rate', { params, signal })
}

export function getWinRateBySurface(params: StatsFilterParams = {}, signal?: AbortSignal) {
  return http.get<SurfaceWinRate[]>('/stats/win-rate/by-surface', { params, signal })
}

export function getWinRateByPeriod(
  granularity: PeriodGranularity = 'month',
  params: StatsFilterParams = {},
  signal?: AbortSignal,
) {
  return http.get<PeriodWinRate[]>('/stats/win-rate/by-period', {
    params: { ...params, granularity },
    signal,
  })
}

export function getStreaks(params: StatsFilterParams = {}, signal?: AbortSignal) {
  return http.get<StreakStats>('/stats/streaks', { params, signal })
}

export function getTiebreaks(params: StatsFilterParams = {}, signal?: AbortSignal) {
  return http.get<RecordStat>('/stats/tiebreaks', { params, signal })
}
