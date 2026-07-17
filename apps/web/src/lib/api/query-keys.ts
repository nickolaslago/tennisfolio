/**
 * Query-key factory convention: `all` scopes an entity, `lists()`/`details()`
 * scope the list/detail sub-trees so a mutation can invalidate every list
 * (regardless of params) or a single detail without touching the other.
 */
function entityKeys<Entity extends string>(entity: Entity) {
  return {
    all: [entity] as const,
    lists: () => [entity, 'list'] as const,
    list: (params: Record<string, unknown> = {}) => [entity, 'list', params] as const,
    details: () => [entity, 'detail'] as const,
    detail: (id: number) => [entity, 'detail', id] as const,
  }
}

export const queryKeys = {
  opponents: entityKeys('opponents'),
  clubs: entityKeys('clubs'),
  matches: entityKeys('matches'),
  tournaments: {
    ...entityKeys('tournaments'),
    standings: (id: number) => ['tournaments', 'standings', id] as const,
  },
  stats: {
    winRate: (params: Record<string, unknown> = {}) => ['stats', 'win-rate', params] as const,
    winRateBySurface: (params: Record<string, unknown> = {}) =>
      ['stats', 'win-rate-by-surface', params] as const,
    winRateByPeriod: (granularity: string, params: Record<string, unknown> = {}) =>
      ['stats', 'win-rate-by-period', granularity, params] as const,
    streaks: (params: Record<string, unknown> = {}) => ['stats', 'streaks', params] as const,
    tiebreaks: (params: Record<string, unknown> = {}) => ['stats', 'tiebreaks', params] as const,
  },
}
