import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as matchesApi from '@/lib/api/matches'
import type { MatchCreate, MatchListParams, MatchUpdate } from '@/lib/api/matches'
import { queryKeys } from '@/lib/api/query-keys'

export function useMatches(params: MatchListParams = {}) {
  return useQuery({
    queryKey: queryKeys.matches.list(params),
    queryFn: ({ signal }) => matchesApi.listMatches(params, signal),
  })
}

export function useMatch(id: number) {
  return useQuery({
    queryKey: queryKeys.matches.detail(id),
    queryFn: ({ signal }) => matchesApi.getMatch(id, signal),
    enabled: Number.isFinite(id),
  })
}

export function useCreateMatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: MatchCreate) => matchesApi.createMatch(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.matches.lists() })
    },
  })
}

export function useUpdateMatch(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: MatchUpdate) => matchesApi.updateMatch(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.matches.lists() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.matches.detail(id) })
    },
  })
}

export function useDeleteMatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => matchesApi.deleteMatch(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.matches.lists() })
      queryClient.removeQueries({ queryKey: queryKeys.matches.detail(id) })
    },
  })
}
