import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as clubsApi from '@/lib/api/clubs'
import type { ClubCreate, ClubUpdate } from '@/lib/api/clubs'
import { queryKeys } from '@/lib/api/query-keys'
import type { ListParams } from '@/lib/api/types'

export function useClubs(params: ListParams = {}) {
  return useQuery({
    queryKey: queryKeys.clubs.list(params),
    queryFn: ({ signal }) => clubsApi.listClubs(params, signal),
  })
}

export function useClub(id: number) {
  return useQuery({
    queryKey: queryKeys.clubs.detail(id),
    queryFn: ({ signal }) => clubsApi.getClub(id, signal),
    enabled: Number.isFinite(id),
  })
}

export function useCreateClub() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ClubCreate) => clubsApi.createClub(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clubs.lists() })
    },
  })
}

export function useUpdateClub(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ClubUpdate) => clubsApi.updateClub(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clubs.lists() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.clubs.detail(id) })
    },
  })
}

export function useDeleteClub() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => clubsApi.deleteClub(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clubs.lists() })
      queryClient.removeQueries({ queryKey: queryKeys.clubs.detail(id) })
    },
  })
}
