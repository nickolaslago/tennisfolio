import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as opponentsApi from '@/lib/api/opponents'
import type { OpponentCreate, OpponentListParams, OpponentUpdate } from '@/lib/api/opponents'
import { queryKeys } from '@/lib/api/query-keys'

export function useOpponents(params: OpponentListParams = {}) {
  return useQuery({
    queryKey: queryKeys.opponents.list(params),
    queryFn: ({ signal }) => opponentsApi.listOpponents(params, signal),
  })
}

export function useOpponent(id: number) {
  return useQuery({
    queryKey: queryKeys.opponents.detail(id),
    queryFn: ({ signal }) => opponentsApi.getOpponent(id, signal),
    enabled: Number.isFinite(id),
  })
}

export function useCreateOpponent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: OpponentCreate) => opponentsApi.createOpponent(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.opponents.lists() })
    },
  })
}

export function useUpdateOpponent(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: OpponentUpdate) => opponentsApi.updateOpponent(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.opponents.lists() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.opponents.detail(id) })
    },
  })
}

export function useDeleteOpponent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => opponentsApi.deleteOpponent(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.opponents.lists() })
      queryClient.removeQueries({ queryKey: queryKeys.opponents.detail(id) })
    },
  })
}
