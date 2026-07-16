import { useQuery } from '@tanstack/react-query'

import * as statsApi from '@/lib/api/stats'
import type { PeriodGranularity, StatsFilterParams } from '@/lib/api/stats'
import { queryKeys } from '@/lib/api/query-keys'

export function useWinRate(params: StatsFilterParams = {}) {
  return useQuery({
    queryKey: queryKeys.stats.winRate(params),
    queryFn: ({ signal }) => statsApi.getWinRate(params, signal),
  })
}

export function useWinRateBySurface(params: StatsFilterParams = {}) {
  return useQuery({
    queryKey: queryKeys.stats.winRateBySurface(params),
    queryFn: ({ signal }) => statsApi.getWinRateBySurface(params, signal),
  })
}

export function useWinRateByPeriod(
  granularity: PeriodGranularity = 'month',
  params: StatsFilterParams = {},
) {
  return useQuery({
    queryKey: queryKeys.stats.winRateByPeriod(granularity, params),
    queryFn: ({ signal }) => statsApi.getWinRateByPeriod(granularity, params, signal),
  })
}

export function useStreaks(params: StatsFilterParams = {}) {
  return useQuery({
    queryKey: queryKeys.stats.streaks(params),
    queryFn: ({ signal }) => statsApi.getStreaks(params, signal),
  })
}

export function useTiebreaks(params: StatsFilterParams = {}) {
  return useQuery({
    queryKey: queryKeys.stats.tiebreaks(params),
    queryFn: ({ signal }) => statsApi.getTiebreaks(params, signal),
  })
}
