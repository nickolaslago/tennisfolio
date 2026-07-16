import { ClipboardCheck, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { EntityList, type EntityColumn } from '@/components/data/entity-list'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useClubs } from '@/hooks/use-clubs'
import { useDeleteMatch, useMatches } from '@/hooks/use-matches'
import { useOpponents } from '@/hooks/use-opponents'
import { useTournaments } from '@/hooks/use-tournaments'
import type { Match, MatchListParams, MatchStatus, Surface } from '@/lib/api/matches'
import { DetailPlaceholderPage } from '@/pages/placeholders'
import { useDocumentTitle } from '@/lib/use-document-title'

const SURFACE_OPTIONS: Surface[] = ['Hard', 'Clay', 'Grass', 'Carpet']

/** Sentinel select value for "no filter" — Radix Select item values can't be an empty string. */
const ALL_VALUE = 'all'

const FILTER_KEYS = [
  'opponent_id',
  'club_id',
  'tournament_id',
  'surface',
  'date_from',
  'date_to',
] as const

interface MatchFilters {
  status: MatchStatus | null
  opponentId: string
  clubId: string
  tournamentId: string
  surface: Surface | ''
  dateFrom: string
  dateTo: string
}

/** Reads/writes match filters straight from the URL query string, so filtered views are shareable. */
function useMatchFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const statusParam = searchParams.get('status')
  const filters: MatchFilters = {
    status: statusParam === 'played' || statusParam === 'scheduled' ? statusParam : null,
    opponentId: searchParams.get('opponent_id') ?? '',
    clubId: searchParams.get('club_id') ?? '',
    tournamentId: searchParams.get('tournament_id') ?? '',
    surface: (searchParams.get('surface') as Surface | null) ?? '',
    dateFrom: searchParams.get('date_from') ?? '',
    dateTo: searchParams.get('date_to') ?? '',
  }

  const setParam = (key: string, value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )
  }

  const clearFilters = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const key of FILTER_KEYS) next.delete(key)
        return next
      },
      { replace: true },
    )
  }

  const hasActiveFilters = FILTER_KEYS.some((key) => searchParams.get(key))

  return { filters, setParam, clearFilters, hasActiveFilters }
}

function toId(value: string): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function MatchResult({ match }: { match: Match }) {
  if (!match.score || !match.result) {
    return <span className="text-highlight">Scheduled</span>
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={match.result === 'Win' ? 'font-medium text-win' : 'font-medium text-loss'}>
        {match.result}
      </span>
      <span className="text-muted-foreground">{match.score}</span>
    </span>
  )
}

export function MatchesPage() {
  useDocumentTitle('Matches')

  const { filters, setParam, clearFilters, hasActiveFilters } = useMatchFilters()

  const opponents = useOpponents()
  const clubs = useClubs()
  const tournaments = useTournaments()
  const deleteMatch = useDeleteMatch()

  const matchParams = useMemo<MatchListParams>(() => {
    const params: MatchListParams = {}
    if (filters.status) params.status = filters.status
    const opponentId = toId(filters.opponentId)
    if (opponentId !== undefined) params.opponent_id = opponentId
    const clubId = toId(filters.clubId)
    if (clubId !== undefined) params.club_id = clubId
    const tournamentId = toId(filters.tournamentId)
    if (tournamentId !== undefined) params.tournament_id = tournamentId
    if (filters.surface) params.surface = filters.surface
    if (filters.dateFrom) params.date_from = filters.dateFrom
    if (filters.dateTo) params.date_to = filters.dateTo
    return params
  }, [filters])

  const matches = useMatches(matchParams)

  const opponentsById = useMemo(
    () => new Map((opponents.data?.items ?? []).map((o) => [o.id, o])),
    [opponents.data],
  )
  const clubsById = useMemo(
    () => new Map((clubs.data?.items ?? []).map((c) => [c.id, c])),
    [clubs.data],
  )
  const tournamentsById = useMemo(
    () => new Map((tournaments.data?.items ?? []).map((t) => [t.id, t])),
    [tournaments.data],
  )

  const opponentName = (id: number) => {
    const opponent = opponentsById.get(id)
    if (!opponent) return `Opponent #${id}`
    return opponent.name ? `${opponent.name} ${opponent.last_name}` : opponent.last_name
  }
  const clubName = (id: number | null) => (id === null ? null : (clubsById.get(id)?.name ?? null))
  const tournamentName = (id: number | null) =>
    id === null ? null : (tournamentsById.get(id)?.name ?? null)

  const deleteButton = (match: Match) => (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Delete match on ${match.match_date}`}
      disabled={deleteMatch.isPending}
      onClick={() => deleteMatch.mutate(match.id)}
    >
      <Trash2 aria-hidden="true" />
    </Button>
  )

  const completeButton = (match: Match) =>
    match.status === 'scheduled' ? (
      <Button
        variant="outline"
        size="sm"
        disabled
        title="Match entry form is coming in DAT-89"
      >
        <ClipboardCheck aria-hidden="true" data-icon="inline-start" />
        Complete with score
      </Button>
    ) : null

  const columns: EntityColumn<Match>[] = [
    {
      id: 'date',
      header: 'Date',
      sortValue: (m) => m.match_date,
      cell: (m) => (
        <Link to={`/matches/${m.id}`} className="font-medium hover:underline">
          {m.match_date}
        </Link>
      ),
    },
    {
      id: 'opponent',
      header: 'Opponent',
      sortValue: (m) => opponentName(m.opponent_id).toLowerCase(),
      cell: (m) => (
        <Link to={`/opponents/${m.opponent_id}`} className="hover:underline">
          {opponentName(m.opponent_id)}
        </Link>
      ),
    },
    {
      id: 'club',
      header: 'Club',
      sortValue: (m) => clubName(m.club_id),
      cell: (m) =>
        m.club_id === null ? (
          '—'
        ) : (
          <Link to={`/clubs/${m.club_id}`} className="hover:underline">
            {clubName(m.club_id) ?? '—'}
          </Link>
        ),
    },
    {
      id: 'tournament',
      header: 'Tournament',
      sortValue: (m) => tournamentName(m.tournament_id),
      cell: (m) =>
        m.tournament_id === null ? (
          '—'
        ) : (
          <Link to={`/tournaments/${m.tournament_id}`} className="hover:underline">
            {tournamentName(m.tournament_id) ?? '—'}
          </Link>
        ),
    },
    {
      id: 'surface',
      header: 'Surface',
      sortValue: (m) => m.surface,
      cell: (m) => m.surface ?? '—',
    },
    {
      id: 'result',
      header: 'Result',
      sortValue: (m) => m.result ?? '',
      cell: (m) => <MatchResult match={m} />,
    },
  ]

  return (
    <>
      <PageHeader
        title="Matches"
        description="Every match you've played, with scores and derived results — plus what's on the schedule."
      />

      <Card className="mb-6">
        <CardContent>
          <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filters
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-opponent">Opponent</Label>
              <Select
                value={filters.opponentId || ALL_VALUE}
                onValueChange={(value) => setParam('opponent_id', value === ALL_VALUE ? '' : value)}
              >
                <SelectTrigger id="filter-opponent" className="w-full">
                  <SelectValue placeholder="All opponents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All opponents</SelectItem>
                  {(opponents.data?.items ?? []).map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name ? `${o.name} ${o.last_name}` : o.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-club">Club</Label>
              <Select
                value={filters.clubId || ALL_VALUE}
                onValueChange={(value) => setParam('club_id', value === ALL_VALUE ? '' : value)}
              >
                <SelectTrigger id="filter-club" className="w-full">
                  <SelectValue placeholder="All clubs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All clubs</SelectItem>
                  {(clubs.data?.items ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-tournament">Tournament</Label>
              <Select
                value={filters.tournamentId || ALL_VALUE}
                onValueChange={(value) =>
                  setParam('tournament_id', value === ALL_VALUE ? '' : value)
                }
              >
                <SelectTrigger id="filter-tournament" className="w-full">
                  <SelectValue placeholder="All tournaments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All tournaments</SelectItem>
                  {(tournaments.data?.items ?? []).map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-surface">Surface</Label>
              <Select
                value={filters.surface || ALL_VALUE}
                onValueChange={(value) =>
                  setParam('surface', value === ALL_VALUE ? '' : value)
                }
              >
                <SelectTrigger id="filter-surface" className="w-full">
                  <SelectValue placeholder="All surfaces" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All surfaces</SelectItem>
                  {SURFACE_OPTIONS.map((surface) => (
                    <SelectItem key={surface} value={surface}>
                      {surface}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-date-from">From</Label>
              <Input
                id="filter-date-from"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setParam('date_from', e.target.value)}
                max={filters.dateTo || undefined}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-date-to">To</Label>
              <Input
                id="filter-date-to"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setParam('date_to', e.target.value)}
                min={filters.dateFrom || undefined}
              />
            </div>
          </div>

          {hasActiveFilters ? (
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X aria-hidden="true" data-icon="inline-start" />
                Clear filters
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Tabs
        value={filters.status ?? ALL_VALUE}
        onValueChange={(value) => setParam('status', value === ALL_VALUE ? '' : value)}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value={ALL_VALUE}>All</TabsTrigger>
          <TabsTrigger value="played">Played</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
        </TabsList>
      </Tabs>

      <EntityList
        entityKey="matches"
        items={matches.data?.items ?? []}
        isPending={matches.isPending}
        isError={matches.isError}
        error={matches.error}
        onRetry={() => void matches.refetch()}
        columns={columns}
        rowActions={(m) => (
          <div className="flex items-center justify-end gap-2">
            {completeButton(m)}
            {deleteButton(m)}
          </div>
        )}
        defaultSort={{ columnId: 'date', direction: 'desc' }}
        emptyTitle="No matches found"
        emptyDescription="No matches match these filters yet — try adjusting them, or check back once you've logged some matches."
        renderCard={(m) => (
          <Card className="h-full">
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/matches/${m.id}`} className="cn-font-heading text-base font-medium hover:underline">
                  {m.match_date}
                </Link>
                {deleteButton(m)}
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Opponent</dt>
                  <dd>
                    <Link to={`/opponents/${m.opponent_id}`} className="hover:underline">
                      {opponentName(m.opponent_id)}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Club</dt>
                  <dd>
                    {m.club_id === null ? (
                      '—'
                    ) : (
                      <Link to={`/clubs/${m.club_id}`} className="hover:underline">
                        {clubName(m.club_id) ?? '—'}
                      </Link>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Tournament</dt>
                  <dd>
                    {m.tournament_id === null ? (
                      '—'
                    ) : (
                      <Link to={`/tournaments/${m.tournament_id}`} className="hover:underline">
                        {tournamentName(m.tournament_id) ?? '—'}
                      </Link>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Surface</dt>
                  <dd>{m.surface ?? '—'}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Result</dt>
                  <dd>
                    <MatchResult match={m} />
                  </dd>
                </div>
              </dl>
              {m.status === 'scheduled' ? (
                <div className="flex justify-end">{completeButton(m)}</div>
              ) : null}
            </CardContent>
          </Card>
        )}
      />
    </>
  )
}

export function MatchDetailPage() {
  return <DetailPlaceholderPage sectionTitle="Matches" entity="match" basePath="/matches" />
}
