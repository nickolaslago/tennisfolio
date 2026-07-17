import {
  ChevronLeft,
  ClipboardCheck,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { EntityList, type EntityColumn } from '@/components/data/entity-list'
import { ErrorState, LoadingState } from '@/components/data/query-state'
import { RowOptionsMenu } from '@/components/data/row-options-menu'
import { OpponentHeadToHead } from '@/components/opponents/head-to-head'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useClub, useClubs } from '@/hooks/use-clubs'
import { useDeleteMatch, useMatch, useMatches } from '@/hooks/use-matches'
import { useOpponent, useOpponents } from '@/hooks/use-opponents'
import { useTournament, useTournaments } from '@/hooks/use-tournaments'
import type { Match, MatchListParams, MatchStatus, SetRead, Surface } from '@/lib/api/matches'
import { sortByLabel } from '@/lib/sort-options'
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
  const { t } = useTranslation()
  if (!match.score || !match.result) {
    return <span className="text-highlight">{t('matches.tabs.scheduled')}</span>
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
  const { t } = useTranslation()
  useDocumentTitle(t('matches.pageTitle'))

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

  const opponentFilterOptions = useMemo(
    () =>
      sortByLabel(opponents.data?.items ?? [], (o) =>
        o.name ? `${o.name} ${o.last_name}` : o.last_name,
      ),
    [opponents.data],
  )
  const clubFilterOptions = useMemo(
    () => sortByLabel(clubs.data?.items ?? [], (c) => c.name),
    [clubs.data],
  )
  const tournamentFilterOptions = useMemo(
    () => sortByLabel(tournaments.data?.items ?? [], (t) => t.name),
    [tournaments.data],
  )

  const opponentName = (id: number) => {
    const opponent = opponentsById.get(id)
    if (!opponent) return t('matches.opponentFallback', { id })
    return opponent.name ? `${opponent.name} ${opponent.last_name}` : opponent.last_name
  }
  const clubName = (id: number | null) => (id === null ? null : (clubsById.get(id)?.name ?? null))
  const tournamentName = (id: number | null) =>
    id === null ? null : (tournamentsById.get(id)?.name ?? null)

  const rowOptions = (match: Match) => (
    <RowOptionsMenu
      label={t('matches.rowOptions.matchLabel', { date: match.match_date })}
      editTo={`/matches/${match.id}/edit`}
      duplicateTo="/matches/new"
      duplicateState={{ duplicate: match }}
      onDelete={() => deleteMatch.mutate(match.id)}
      deletePending={deleteMatch.isPending}
      deleteDescription={t('matches.deleteDescription')}
    />
  )

  const completeButton = (match: Match) =>
    match.status === 'scheduled' ? (
      <Button variant="outline" size="sm" asChild>
        <Link to={`/matches/${match.id}/complete`}>
          <ClipboardCheck aria-hidden="true" data-icon="inline-start" />
          {t('matches.setScore')}
        </Link>
      </Button>
    ) : null

  const columns: EntityColumn<Match>[] = [
    {
      id: 'date',
      header: t('matches.columns.date'),
      sortValue: (m) => m.match_date,
      cell: (m) => (
        <Link to={`/matches/${m.id}`} className="font-medium hover:underline">
          {m.match_date}
        </Link>
      ),
    },
    {
      id: 'opponent',
      header: t('matches.columns.opponent'),
      sortValue: (m) => opponentName(m.opponent_id).toLowerCase(),
      cell: (m) => (
        <Link to={`/opponents/${m.opponent_id}`} className="hover:underline">
          {opponentName(m.opponent_id)}
        </Link>
      ),
    },
    {
      id: 'club',
      header: t('matches.columns.club'),
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
      header: t('matches.columns.tournament'),
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
      header: t('matches.columns.surface'),
      sortValue: (m) => m.surface,
      cell: (m) => m.surface ?? '—',
    },
    {
      id: 'result',
      header: t('matches.columns.result'),
      sortValue: (m) => m.result ?? '',
      cell: (m) => <MatchResult match={m} />,
    },
  ]

  return (
    <>
      <PageHeader title={t('matches.pageTitle')} description={t('matches.pageDescription')} />

      <Card className="mb-6">
        <CardContent>
          <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            {t('matches.filters.heading')}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-opponent">{t('matches.columns.opponent')}</Label>
              <Select
                value={filters.opponentId || ALL_VALUE}
                onValueChange={(value) => setParam('opponent_id', value === ALL_VALUE ? '' : value)}
              >
                <SelectTrigger id="filter-opponent" className="w-full">
                  <SelectValue placeholder={t('matches.filters.allOpponents')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>{t('matches.filters.allOpponents')}</SelectItem>
                  {opponentFilterOptions.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name ? `${o.name} ${o.last_name}` : o.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-club">{t('matches.columns.club')}</Label>
              <Select
                value={filters.clubId || ALL_VALUE}
                onValueChange={(value) => setParam('club_id', value === ALL_VALUE ? '' : value)}
              >
                <SelectTrigger id="filter-club" className="w-full">
                  <SelectValue placeholder={t('matches.filters.allClubs')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>{t('matches.filters.allClubs')}</SelectItem>
                  {clubFilterOptions.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-tournament">{t('matches.columns.tournament')}</Label>
              <Select
                value={filters.tournamentId || ALL_VALUE}
                onValueChange={(value) =>
                  setParam('tournament_id', value === ALL_VALUE ? '' : value)
                }
              >
                <SelectTrigger id="filter-tournament" className="w-full">
                  <SelectValue placeholder={t('matches.filters.allTournaments')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>{t('matches.filters.allTournaments')}</SelectItem>
                  {tournamentFilterOptions.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-surface">{t('matches.columns.surface')}</Label>
              <Select
                value={filters.surface || ALL_VALUE}
                onValueChange={(value) => setParam('surface', value === ALL_VALUE ? '' : value)}
              >
                <SelectTrigger id="filter-surface" className="w-full">
                  <SelectValue placeholder={t('matches.filters.allSurfaces')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>{t('matches.filters.allSurfaces')}</SelectItem>
                  {SURFACE_OPTIONS.map((surface) => (
                    <SelectItem key={surface} value={surface}>
                      {surface}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-date-from">{t('matches.filters.dateFromLabel')}</Label>
              <Input
                id="filter-date-from"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setParam('date_from', e.target.value)}
                max={filters.dateTo || undefined}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-date-to">{t('matches.filters.dateToLabel')}</Label>
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
                {t('matches.filters.clearFilters')}
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
          <TabsTrigger value={ALL_VALUE}>{t('matches.tabs.all')}</TabsTrigger>
          <TabsTrigger value="played">{t('matches.tabs.played')}</TabsTrigger>
          <TabsTrigger value="scheduled">{t('matches.tabs.scheduled')}</TabsTrigger>
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
            {rowOptions(m)}
          </div>
        )}
        defaultSort={{ columnId: 'date', direction: 'desc' }}
        emptyTitle={t('matches.emptyState.title')}
        emptyDescription={t('matches.emptyState.description')}
        createAction={{
          label: t('matches.logMatch'),
          emptyLabel: t('matches.logFirstMatch'),
          to: '/matches/new',
          icon: Plus,
        }}
        renderCard={(m) => (
          <Card className="h-full">
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <Link
                  to={`/matches/${m.id}`}
                  className="cn-font-heading text-base font-medium hover:underline"
                >
                  {m.match_date}
                </Link>
                {rowOptions(m)}
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">{t('matches.columns.opponent')}</dt>
                  <dd>
                    <Link to={`/opponents/${m.opponent_id}`} className="hover:underline">
                      {opponentName(m.opponent_id)}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('matches.columns.club')}</dt>
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
                  <dt className="text-muted-foreground">{t('matches.columns.tournament')}</dt>
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
                  <dt className="text-muted-foreground">{t('matches.columns.surface')}</dt>
                  <dd>{m.surface ?? '—'}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground">{t('matches.columns.result')}</dt>
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

function opponentFullName(opponent: { name: string | null; last_name: string }) {
  return opponent.name ? `${opponent.name} ${opponent.last_name}` : opponent.last_name
}

function MatchHeaderCard({ match, opponentName }: { match: Match; opponentName: string }) {
  const { t } = useTranslation()
  const club = useClub(match.club_id ?? NaN)
  const tournament = useTournament(match.tournament_id ?? NaN)

  return (
    <Card className="mb-6">
      <CardContent>
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">{t('matches.columns.opponent')}</dt>
            <dd>
              <Link to={`/opponents/${match.opponent_id}`} className="font-medium hover:underline">
                {opponentName}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('matches.columns.date')}</dt>
            <dd>{match.match_date}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('matches.columns.club')}</dt>
            <dd>
              {match.club_id === null ? (
                '—'
              ) : (
                <Link to={`/clubs/${match.club_id}`} className="hover:underline">
                  {club.data?.name ?? '—'}
                </Link>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('matches.columns.tournament')}</dt>
            <dd>
              {match.tournament_id === null ? (
                '—'
              ) : (
                <>
                  <Link to={`/tournaments/${match.tournament_id}`} className="hover:underline">
                    {tournament.data?.name ?? '—'}
                  </Link>
                  {match.stage ? (
                    <span className="text-muted-foreground"> · {match.stage}</span>
                  ) : null}
                </>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('matches.columns.surface')}</dt>
            <dd>{match.surface ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('matches.detail.duration')}</dt>
            <dd>
              {match.duration_min !== null
                ? t('matches.detail.durationValue', { minutes: match.duration_min })
                : '—'}
            </dd>
          </div>
          <div className="col-span-2 sm:col-span-4">
            <dt className="text-muted-foreground">{t('matches.detail.notes')}</dt>
            <dd>{match.notes ?? '—'}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}

function SetBreakdown({ sets }: { sets: SetRead[] }) {
  const { t } = useTranslation()
  if (sets.length === 0) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('matches.detail.noSets')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('matches.detail.setColumns.set')}</TableHead>
              <TableHead>{t('matches.detail.setColumns.games')}</TableHead>
              <TableHead>{t('matches.detail.setColumns.tiebreak')}</TableHead>
              <TableHead>{t('matches.columns.result')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sets.map((set) => (
              <TableRow key={set.set_no}>
                <TableCell>{set.set_no}</TableCell>
                <TableCell className="font-medium">
                  {set.games_won}–{set.games_lost}
                </TableCell>
                <TableCell>{set.tiebreak ? t('matches.detail.yes') : '—'}</TableCell>
                <TableCell>
                  <span
                    className={
                      set.result === 'Win' ? 'font-medium text-win' : 'font-medium text-loss'
                    }
                  >
                    {set.result}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export function MatchDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const matchId = Number(id)
  const match = useMatch(matchId)
  const opponent = useOpponent(match.data?.opponent_id ?? NaN)
  const deleteMatch = useDeleteMatch()
  const navigate = useNavigate()

  const opponentName = match.data
    ? opponent.data
      ? opponentFullName(opponent.data)
      : t('matches.opponentFallback', { id: match.data.opponent_id })
    : ''

  useDocumentTitle(
    match.data
      ? t('matches.detail.vsOpponent', { opponent: opponentName })
      : t('matches.detail.pageTitleFallback'),
  )

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
        <Link to="/matches">
          <ChevronLeft aria-hidden="true" data-icon="inline-start" />
          {t('matches.detail.backToMatches')}
        </Link>
      </Button>

      {!Number.isFinite(matchId) ? (
        <ErrorState error={new Error(t('matches.detail.invalidId', { id }))} />
      ) : match.isPending ? (
        <LoadingState />
      ) : match.isError ? (
        <ErrorState error={match.error} onRetry={() => void match.refetch()} />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <PageHeader
              title={t('matches.detail.vsOpponent', { opponent: opponentName })}
              description={match.data.match_date}
            />
            <div className="flex items-center gap-2">
              <MatchResult match={match.data} />
              {match.data.status === 'scheduled' ? (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/matches/${match.data.id}/complete`}>
                    <ClipboardCheck aria-hidden="true" data-icon="inline-start" />
                    {t('matches.setScore')}
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/matches/${match.data.id}/edit`}>
                    <Pencil aria-hidden="true" data-icon="inline-start" />
                    {t('common.rowActions.edit')}
                  </Link>
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={deleteMatch.isPending}>
                    <Trash2 aria-hidden="true" data-icon="inline-start" />
                    {t('common.rowActions.delete')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('matches.detail.deleteConfirmTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('matches.deleteDescription')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={deleteMatch.isPending}
                      onClick={() => {
                        deleteMatch.mutate(match.data.id, { onSuccess: () => navigate('/matches') })
                      }}
                    >
                      {t('common.rowActions.delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <MatchHeaderCard match={match.data} opponentName={opponentName} />

          <div className="mb-6">
            <OpponentHeadToHead opponentId={match.data.opponent_id} />
          </div>

          <h2 className="mb-3 cn-font-heading text-lg font-semibold">
            {t('matches.detail.setBySet')}
          </h2>
          <SetBreakdown sets={match.data.sets} />
        </>
      )}
    </>
  )
}
