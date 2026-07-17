import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as tournamentsApi from '@/lib/api/tournaments'
import type { TournamentCreate, TournamentListParams, TournamentUpdate } from '@/lib/api/tournaments'
import { queryKeys } from '@/lib/api/query-keys'

export function useTournaments(params: TournamentListParams = {}) {
  return useQuery({
    queryKey: queryKeys.tournaments.list(params),
    queryFn: ({ signal }) => tournamentsApi.listTournaments(params, signal),
  })
}

export function useTournament(id: number) {
  return useQuery({
    queryKey: queryKeys.tournaments.detail(id),
    queryFn: ({ signal }) => tournamentsApi.getTournament(id, signal),
    enabled: Number.isFinite(id),
  })
}

export function useTournamentStandings(id: number) {
  return useQuery({
    queryKey: queryKeys.tournaments.standings(id),
    queryFn: ({ signal }) => tournamentsApi.getTournamentStandings(id, signal),
    enabled: Number.isFinite(id),
  })
}

export function useCreateTournament() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: TournamentCreate) => tournamentsApi.createTournament(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tournaments.lists() })
    },
  })
}

export function useUpdateTournament(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: TournamentUpdate) => tournamentsApi.updateTournament(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tournaments.lists() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.tournaments.detail(id) })
    },
  })
}

export function useDeleteTournament() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => tournamentsApi.deleteTournament(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tournaments.lists() })
      queryClient.removeQueries({ queryKey: queryKeys.tournaments.detail(id) })
    },
  })
}
