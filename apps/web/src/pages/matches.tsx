import { ChevronLeft, ClipboardCheck, Pencil, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { ConfirmDeleteDialog } from '@/components/data/confirm-delete-dialog'
import { EntityList, type EntityColumn, type FilterField } from '@/components/data/entity-list'
import { ErrorState, LoadingState } from '@/components/data/query-state'
import { RowOptionsMenu } from '@/components/data/row-options-menu'
import { OpponentHeadToHead } from '@/components/opponents/head-to-head'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/glass/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useClub, useClubs } from '@/hooks/use-clubs'
import { useDeleteMatch, useMatch, useMatches } from '@/hooks/use-matches'
import { useOpponent, useOpponents } from '@/hooks/use-opponents'
import { useTournament, useTournaments } from '@/hooks/use-tournaments'
import { useUrlFilters } from '@/hooks/use-url-filters'
import type { Match, MatchListParams, MatchStatus, SetRead, Surface } from '@/lib/api/matches'
import { sortByLabel } from '@/lib/sort-options'
import { useDocumentTitle } from '@/lib/use-document-title'

const SURFACE_OPTIONS: Surface[] = ['Hard', 'Clay', 'Grass', 'Carpet']

const FILTER_FIELD_IDS = [
  'opponent_id',
  'club_id',
  'tournament_id',
  'surface',
  'date_from',
  'date_to',
] as const

function MatchStatusControl({
  status,
  onChange,
}: {
  status: MatchStatus | null
  onChange: (status: MatchStatus | null) => void
}) {
  const { t } = useTranslation()
  const options: { value: MatchStatus | null; label: string }[] = [
    { value: null, label: t('matches.tabs.all') },
    { value: 'played', label: t('matches.tabs.played') },
    { value: 'scheduled', label: t('matches.tabs.scheduled') },
  ]
  return (
    <div
      role="group"
      aria-label={t('matches.filters.statusLabel')}
      className="inline-flex items-center gap-0.5 rounded-lg border border-input bg-transparent p-0.5 dark:bg-input/30"
    >
      {options.map((option) => (
        <Button
          key={option.label}
          type="button"
          size="sm"
          variant={status === option.value ? 'secondary' : 'ghost'}
          aria-pressed={status === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
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

  const {
    values: filterValues,
    setValue: setFilterValue,
    removeValue,
  } = useUrlFilters(['status', ...FILTER_FIELD_IDS])
  const statusParam = filterValues.status
  const status: MatchStatus | null =
    statusParam === 'played' || statusParam === 'scheduled' ? statusParam : null

  const opponents = useOpponents()
  const clubs = useClubs()
  const tournaments = useTournaments()
  const deleteMatch = useDeleteMatch()

  const matchParams = useMemo<MatchListParams>(() => {
    const params: MatchListParams = {}
    if (status) params.status = status
    const opponentId = toId(filterValues.opponent_id)
    if (opponentId !== undefined) params.opponent_id = opponentId
    const clubId = toId(filterValues.club_id)
    if (clubId !== undefined) params.club_id = clubId
    const tournamentId = toId(filterValues.tournament_id)
    if (tournamentId !== undefined) params.tournament_id = tournamentId
    if (filterValues.surface) params.surface = filterValues.surface as Surface
    if (filterValues.date_from) params.date_from = filterValues.date_from
    if (filterValues.date_to) params.date_to = filterValues.date_to
    return params
  }, [status, filterValues])

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

  const filterFields: FilterField[] = useMemo(
    () => [
      {
        id: 'opponent_id',
        label: t('matches.columns.opponent'),
        options: opponentFilterOptions.map((o) => ({
          value: String(o.id),
          label: o.name ? `${o.name} ${o.last_name}` : o.last_name,
        })),
      },
      {
        id: 'club_id',
        label: t('matches.columns.club'),
        options: clubFilterOptions.map((c) => ({ value: String(c.id), label: c.name })),
      },
      {
        id: 'tournament_id',
        label: t('matches.columns.tournament'),
        options: tournamentFilterOptions.map((tn) => ({ value: String(tn.id), label: tn.name })),
      },
      {
        id: 'surface',
        label: t('matches.columns.surface'),
        options: SURFACE_OPTIONS.map((surface) => ({ value: surface, label: surface })),
      },
      { id: 'date_from', label: t('matches.filters.dateFromLabel'), type: 'date' },
      { id: 'date_to', label: t('matches.filters.dateToLabel'), type: 'date' },
    ],
    [t, opponentFilterOptions, clubFilterOptions, tournamentFilterOptions],
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

      <EntityList
        entityKey="matches"
        items={matches.data?.items ?? []}
        isPending={matches.isPending}
        isError={matches.isError}
        error={matches.error}
        onRetry={() => void matches.refetch()}
        columns={columns}
        getSearchText={(m) =>
          `${opponentName(m.opponent_id)} ${clubName(m.club_id) ?? ''} ${
            tournamentName(m.tournament_id) ?? ''
          } ${m.match_date} ${m.score ?? ''}`
        }
        searchPlaceholder={t('matches.filterPlaceholder')}
        rowActions={(m) => (
          <div className="flex items-center justify-end gap-2">
            {completeButton(m)}
            {rowOptions(m)}
          </div>
        )}
        toolbarExtra={
          <MatchStatusControl
            status={status}
            onChange={(next) => setFilterValue('status', next ?? '')}
          />
        }
        filters={{
          fields: filterFields,
          values: filterValues,
          onChange: setFilterValue,
          onRemove: removeValue,
        }}
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
                  className="font-heading text-base font-medium hover:underline"
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
              <ConfirmDeleteDialog
                title={t('matches.detail.deleteConfirmTitle')}
                description={t('matches.deleteDescription')}
                pending={deleteMatch.isPending}
                onConfirm={() => {
                  deleteMatch.mutate(match.data.id, { onSuccess: () => navigate('/matches') })
                }}
              />
            </div>
          </div>

          <MatchHeaderCard match={match.data} opponentName={opponentName} />

          <div className="mb-6">
            <OpponentHeadToHead opponentId={match.data.opponent_id} />
          </div>

          <h2 className="mb-3 font-heading text-lg font-semibold">
            {t('matches.detail.setBySet')}
          </h2>
          <SetBreakdown sets={match.data.sets} />
        </>
      )}
    </>
  )
}
