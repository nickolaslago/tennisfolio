import { TOURNAMENT_FORMAT_OPTIONS, isTournamentFormat } from '@tennisfolio/core'
import { ChevronLeft, Pencil, Trash2, Trophy } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

import { EntityIcon } from '@/components/data/entity-icon'
import { EntityIconPicker } from '@/components/data/entity-icon-picker'
import { EntityList, type EntityColumn, type FilterField } from '@/components/data/entity-list'
import { FormBanner, FormField } from '@/components/data/entity-form'
import { EmptyState, ErrorState, LoadingState } from '@/components/data/query-state'
import { RowOptionsMenu } from '@/components/data/row-options-menu'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/glass/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/glass/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { fieldErrorsFromApiError } from '@/lib/api/form-errors'
import type { Tournament, TournamentCreate, TournamentType } from '@/lib/api/tournaments'
import {
  useCreateTournament,
  useDeleteTournament,
  useTournament,
  useTournaments,
  useTournamentStandings,
  useUpdateTournament,
} from '@/hooks/use-tournaments'
import { useClub, useClubs } from '@/hooks/use-clubs'
import { useLastOrganiser } from '@/hooks/use-last-organiser'
import { useMatches } from '@/hooks/use-matches'
import { useUrlFilters } from '@/hooks/use-url-filters'
import type { Match } from '@/lib/api/matches'
import type { StandingsRow } from '@/lib/api/tournaments'
import { sortByLabel } from '@/lib/sort-options'
import { useDocumentTitle } from '@/lib/use-document-title'

function dateRange(tournament: Tournament) {
  if (!tournament.start_date && !tournament.end_date) return '—'
  return `${tournament.start_date ?? '—'} – ${tournament.end_date ?? '—'}`
}

const FILTER_FIELD_IDS = ['club_id', 'status'] as const

type DerivedTournamentStatus = 'upcoming' | 'ongoing' | 'completed'

/**
 * A tournament's lifecycle state isn't stored — it's derived from its dates
 * against today, same spirit as match result/score being computed on read.
 */
function tournamentStatus(tournament: Tournament, today: string): DerivedTournamentStatus {
  if (!tournament.start_date || tournament.start_date > today) return 'upcoming'
  if (tournament.end_date && tournament.end_date < today) return 'completed'
  return 'ongoing'
}

function toId(value: string): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export function TournamentsPage() {
  const { t: translate } = useTranslation()
  useDocumentTitle(translate('tournaments.pageTitle'))

  const {
    values: filterValues,
    setValue: setFilterValue,
    removeValue,
  } = useUrlFilters(FILTER_FIELD_IDS)

  const tournaments = useTournaments({ club_id: toId(filterValues.club_id) })
  const clubs = useClubs()
  const deleteTournament = useDeleteTournament()

  const clubName = (clubId: number | null) => {
    if (clubId === null) return null
    return clubs.data?.items.find((c) => c.id === clubId)?.name ?? null
  }

  const clubFilterOptions = useMemo(
    () => sortByLabel(clubs.data?.items ?? [], (c) => c.name),
    [clubs.data],
  )

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const items = useMemo(() => {
    const all = tournaments.data?.items ?? []
    if (!filterValues.status) return all
    return all.filter((tournament) => tournamentStatus(tournament, today) === filterValues.status)
  }, [tournaments.data, filterValues.status, today])

  const filterFields: FilterField[] = useMemo(
    () => [
      {
        id: 'club_id',
        label: translate('tournaments.columns.hostClub'),
        options: clubFilterOptions.map((c) => ({ value: String(c.id), label: c.name })),
      },
      {
        id: 'status',
        label: translate('tournaments.filters.statusLabel'),
        options: [
          { value: 'upcoming', label: translate('tournaments.filters.statusUpcoming') },
          { value: 'ongoing', label: translate('tournaments.filters.statusOngoing') },
          { value: 'completed', label: translate('tournaments.filters.statusCompleted') },
        ],
      },
    ],
    [translate, clubFilterOptions],
  )

  const rowOptions = (tournament: Tournament) => (
    <RowOptionsMenu
      label={tournament.name}
      editTo={`/tournaments/${tournament.id}/edit`}
      duplicateTo="/tournaments/new"
      duplicateState={{ duplicate: tournament }}
      onDelete={() => deleteTournament.mutate(tournament.id)}
      deletePending={deleteTournament.isPending}
      deleteDescription={translate('tournaments.deleteDescription')}
    />
  )

  const columns: EntityColumn<Tournament>[] = [
    {
      id: 'name',
      header: translate('tournaments.columns.name'),
      sortValue: (t) => t.name.toLowerCase(),
      cell: (t) => (
        <Link
          to={`/tournaments/${t.id}`}
          className="flex items-center gap-1.5 font-medium hover:underline"
        >
          <EntityIcon value={t.icon} />
          {t.name}
        </Link>
      ),
    },
    {
      id: 'season',
      header: translate('tournaments.columns.season'),
      sortValue: (t) => t.season,
      cell: (t) => t.season ?? '—',
    },
    {
      id: 'tournament_type',
      header: translate('tournaments.columns.type'),
      sortValue: (t) => t.tournament_type,
      cell: (t) => t.tournament_type,
    },
    {
      id: 'organiser',
      header: translate('tournaments.columns.organiser'),
      sortValue: (t) => t.organiser ?? '',
      cell: (t) => t.organiser ?? '—',
    },
    {
      id: 'club',
      header: translate('tournaments.columns.hostClub'),
      sortValue: (t) => clubName(t.club_id),
      cell: (t) => clubName(t.club_id) ?? '—',
    },
    {
      id: 'dates',
      header: translate('tournaments.columns.dates'),
      sortValue: (t) => t.start_date,
      cell: (t) => dateRange(t),
    },
  ]

  return (
    <>
      <PageHeader
        title={translate('tournaments.pageTitle')}
        description={translate('tournaments.pageDescription')}
      />
      <EntityList
        entityKey="tournaments"
        items={items}
        isPending={tournaments.isPending}
        isError={tournaments.isError}
        error={tournaments.error}
        onRetry={() => void tournaments.refetch()}
        columns={columns}
        rowActions={rowOptions}
        getSearchText={(t) =>
          `${t.name} ${t.season ?? ''} ${t.tournament_type} ${t.organiser ?? ''} ${
            clubName(t.club_id) ?? ''
          }`
        }
        searchPlaceholder={translate('tournaments.filterPlaceholder')}
        filters={{
          fields: filterFields,
          values: filterValues,
          onChange: setFilterValue,
          onRemove: removeValue,
        }}
        defaultSort={{ columnId: 'name', direction: 'asc' }}
        emptyTitle={translate('tournaments.emptyState.title')}
        emptyDescription={translate('tournaments.emptyState.description')}
        createAction={{
          label: translate('tournaments.addTournament'),
          emptyLabel: translate('tournaments.addFirstTournament'),
          to: '/tournaments/new',
          icon: Trophy,
        }}
        renderCard={(t) => (
          <Card className="h-full">
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <Link
                  to={`/tournaments/${t.id}`}
                  className="flex items-center gap-1.5 font-heading text-base font-medium hover:underline"
                >
                  <EntityIcon value={t.icon} />
                  {t.name}
                </Link>
                {rowOptions(t)}
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">
                    {translate('tournaments.columns.season')}
                  </dt>
                  <dd>{t.season ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{translate('tournaments.columns.type')}</dt>
                  <dd>{t.tournament_type}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    {translate('tournaments.columns.organiser')}
                  </dt>
                  <dd>{t.organiser ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    {translate('tournaments.columns.hostClub')}
                  </dt>
                  <dd>{clubName(t.club_id) ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    {translate('tournaments.columns.dates')}
                  </dt>
                  <dd>{dateRange(t)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}
      />
    </>
  )
}

type ResultFilter = 'all' | 'wins' | 'losses'

/** Display order for knockout stages; anything else found on a match falls back after these. */
const KNOCKOUT_STAGE_ORDER = ['R16', 'QF', 'SF', 'F']

function groupByStage(matches: Match[], t: TFunction): { stage: string; matches: Match[] }[] {
  const known = KNOCKOUT_STAGE_ORDER.filter((stage) => matches.some((m) => m.stage === stage)).map(
    (stage) => ({ stage, matches: matches.filter((m) => m.stage === stage) }),
  )
  const knownSet = new Set(KNOCKOUT_STAGE_ORDER)
  const otherStages = Array.from(
    new Set(
      matches
        .map((m) => m.stage)
        .filter((stage): stage is string => Boolean(stage) && !knownSet.has(stage as string)),
    ),
  )
  const other = otherStages.map((stage) => ({
    stage,
    matches: matches.filter((m) => m.stage === stage),
  }))
  const unspecified = matches.filter((m) => !m.stage)
  return [
    ...known,
    ...other,
    ...(unspecified.length > 0
      ? [{ stage: t('tournaments.matches.unspecifiedStage'), matches: unspecified }]
      : []),
  ]
}

function MatchesTable({ matches }: { matches: Match[] }) {
  const { t } = useTranslation()

  const matchResultLabel = (match: Match) => {
    if (!match.result) return t('matches.tabs.scheduled')
    return match.result === 'Win' ? 'Win' : 'Loss'
  }

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
      id: 'score',
      header: t('tournaments.matches.columns.score'),
      cell: (m) => m.score ?? '—',
    },
    {
      id: 'result',
      header: t('matches.columns.result'),
      sortValue: (m) => m.result ?? '',
      cell: (m) => matchResultLabel(m),
    },
    {
      id: 'surface',
      header: t('matches.columns.surface'),
      sortValue: (m) => m.surface,
      cell: (m) => m.surface ?? '—',
    },
  ]

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.id}>{column.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {matches.map((match) => (
              <TableRow key={match.id}>
                {columns.map((column) => (
                  <TableCell key={column.id}>{column.cell(match)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function StandingsTable({ rows }: { rows: StandingsRow[] }) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('tournaments.standings.columns.opponent')}</TableHead>
              <TableHead>{t('tournaments.standings.columns.wins')}</TableHead>
              <TableHead>{t('tournaments.standings.columns.losses')}</TableHead>
              <TableHead>{t('tournaments.standings.columns.winPct')}</TableHead>
              <TableHead>{t('tournaments.standings.columns.sets')}</TableHead>
              <TableHead>{t('tournaments.standings.columns.games')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.opponent_id}>
                <TableCell className="font-medium">
                  <Link to={`/opponents/${row.opponent_id}`} className="hover:underline">
                    {row.opponent_name}
                  </Link>
                </TableCell>
                <TableCell>{row.wins}</TableCell>
                <TableCell>{row.losses}</TableCell>
                <TableCell>
                  {row.win_rate === null ? '—' : `${Math.round(row.win_rate * 100)}%`}
                </TableCell>
                <TableCell>
                  {row.sets_won}–{row.sets_lost}
                </TableCell>
                <TableCell>
                  {row.games_won}–{row.games_lost}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function TournamentStandings({ tournamentId }: { tournamentId: number }) {
  const { t } = useTranslation()
  const standings = useTournamentStandings(tournamentId)

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-lg font-semibold">{t('tournaments.standings.heading')}</h2>

      {standings.isPending ? (
        <LoadingState />
      ) : standings.isError ? (
        <ErrorState error={standings.error} onRetry={() => void standings.refetch()} />
      ) : standings.data.length === 0 ? (
        <EmptyState
          title={t('tournaments.standings.emptyState.title')}
          description={t('tournaments.standings.emptyState.description')}
        />
      ) : (
        <StandingsTable rows={standings.data} />
      )}
    </div>
  )
}

function TournamentMatches({ tournament }: { tournament: Tournament }) {
  const { t } = useTranslation()
  const matches = useMatches({ tournament_id: tournament.id })
  const [filter, setFilter] = useState<ResultFilter>('all')

  const items = matches.data?.items ?? []
  const filtered = items.filter((match) => {
    if (filter === 'wins') return match.result === 'Win'
    if (filter === 'losses') return match.result === 'Loss'
    return true
  })

  const wins = items.filter((m) => m.result === 'Win').length
  const losses = items.filter((m) => m.result === 'Loss').length

  const isKnockout = tournament.tournament_type === 'Knockout Tournament'
  const groups = isKnockout ? groupByStage(filtered, t) : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold">{t('tournaments.matches.heading')}</h2>
        {matches.isPending || matches.isError ? null : (
          <p className="text-sm text-muted-foreground">
            {t('tournaments.matches.recordSummary', { wins, losses, count: items.length })}
          </p>
        )}
      </div>

      {matches.isPending ? (
        <LoadingState />
      ) : matches.isError ? (
        <ErrorState error={matches.error} onRetry={() => void matches.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title={t('tournaments.matches.emptyState.title')}
          description={t('tournaments.matches.emptyState.description')}
        />
      ) : (
        <>
          <div
            role="group"
            aria-label={t('tournaments.matches.filterByResultLabel')}
            className="flex gap-2"
          >
            {(
              [
                { value: 'all', label: t('tournaments.matches.filters.all') },
                { value: 'wins', label: t('tournaments.matches.filters.wins') },
                { value: 'losses', label: t('tournaments.matches.filters.losses') },
              ] as const
            ).map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={filter === option.value ? 'secondary' : 'outline'}
                aria-pressed={filter === option.value}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t('tournaments.matches.noFilterMatches')}
            </p>
          ) : groups ? (
            <div className="flex flex-col gap-6">
              {groups.map((group) => (
                <div key={group.stage} className="flex flex-col gap-2">
                  <h3 className="text-sm font-medium text-muted-foreground">{group.stage}</h3>
                  <MatchesTable matches={group.matches} />
                </div>
              ))}
            </div>
          ) : (
            <MatchesTable matches={filtered} />
          )}
        </>
      )}
    </div>
  )
}

export function TournamentDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const tournamentId = Number(id)
  const tournament = useTournament(tournamentId)
  const club = useClub(tournament.data?.club_id ?? NaN)
  const deleteTournament = useDeleteTournament()
  const navigate = useNavigate()
  useDocumentTitle(
    tournament.data ? tournament.data.name : t('tournaments.detail.pageTitleFallback'),
  )

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
        <Link to="/tournaments">
          <ChevronLeft aria-hidden="true" data-icon="inline-start" />
          {t('tournaments.detail.backToTournaments')}
        </Link>
      </Button>

      {!Number.isFinite(tournamentId) ? (
        <ErrorState error={new Error(t('tournaments.detail.invalidId', { id }))} />
      ) : tournament.isPending ? (
        <LoadingState />
      ) : tournament.isError ? (
        <ErrorState error={tournament.error} onRetry={() => void tournament.refetch()} />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <PageHeader
              title={tournament.data.name}
              description={tournament.data.season ?? tournament.data.tournament_type}
              icon={tournament.data.icon}
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/tournaments/${tournament.data.id}/edit`}>
                  <Pencil aria-hidden="true" data-icon="inline-start" />
                  {t('common.rowActions.edit')}
                </Link>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteTournament.isPending}
                onClick={() => {
                  deleteTournament.mutate(tournament.data.id, {
                    onSuccess: () => navigate('/tournaments'),
                  })
                }}
              >
                <Trash2 aria-hidden="true" data-icon="inline-start" />
                {t('common.rowActions.delete')}
              </Button>
            </div>
          </div>
          <Card className="mb-6">
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">{t('tournaments.columns.season')}</dt>
                  <dd>{tournament.data.season ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('tournaments.columns.type')}</dt>
                  <dd>{tournament.data.tournament_type}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('tournaments.detail.format')}</dt>
                  <dd>{tournament.data.format ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('tournaments.columns.organiser')}</dt>
                  <dd>{tournament.data.organiser ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('tournaments.columns.hostClub')}</dt>
                  <dd>
                    {tournament.data.club_id === null ? (
                      '—'
                    ) : club.data ? (
                      <Link to={`/clubs/${club.data.id}`} className="hover:underline">
                        {club.data.name}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('tournaments.columns.dates')}</dt>
                  <dd>{dateRange(tournament.data)}</dd>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <dt className="text-muted-foreground">{t('tournaments.detail.notes')}</dt>
                  <dd>{tournament.data.notes ?? '—'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {tournament.data.tournament_type === 'Ranking League' ? (
            <div className="mb-6">
              <TournamentStandings tournamentId={tournament.data.id} />
            </div>
          ) : null}

          <TournamentMatches tournament={tournament.data} />
        </>
      )}
    </>
  )
}

function tournamentTypeOptions(t: TFunction): { value: TournamentType; label: string }[] {
  return [
    { value: 'Knockout Tournament', label: t('tournaments.form.typeKnockout') },
    { value: 'Ranking League', label: t('tournaments.form.typeRanking') },
  ]
}

/** Sentinel select value for "no host club" — Radix Select item values can't be an empty string. */
const NO_CLUB_VALUE = 'none'

/** Sentinel select value for the "Custom" format option that reveals a free-text field. */
const CUSTOM_FORMAT_VALUE = '__custom__'

interface TournamentFormState {
  name: string
  season: string
  tournament_type: TournamentType | ''
  format: string
  organiser: string
  club_id: string
  start_date: string
  end_date: string
  notes: string
  icon: string | null
}

const EMPTY_FORM: TournamentFormState = {
  name: '',
  season: '',
  tournament_type: '',
  format: '',
  organiser: '',
  club_id: '',
  start_date: '',
  end_date: '',
  notes: '',
  icon: null,
}

function toFormState(tournament: Tournament): TournamentFormState {
  return {
    name: tournament.name,
    season: tournament.season ?? '',
    tournament_type: tournament.tournament_type,
    format: tournament.format ?? '',
    organiser: tournament.organiser ?? '',
    club_id: tournament.club_id !== null ? String(tournament.club_id) : '',
    start_date: tournament.start_date ?? '',
    end_date: tournament.end_date ?? '',
    notes: tournament.notes ?? '',
    icon: tournament.icon,
  }
}

function toPayload(form: TournamentFormState): TournamentCreate {
  return {
    name: form.name.trim(),
    season: form.season.trim() || null,
    tournament_type: form.tournament_type as TournamentType,
    format: form.format.trim() || null,
    organiser: form.organiser.trim() || null,
    club_id: form.club_id ? Number(form.club_id) : null,
    start_date: form.start_date || null,
    end_date: form.end_date || null,
    notes: form.notes.trim() || null,
    icon: form.icon,
  }
}

function validate(form: TournamentFormState, t: TFunction): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.name.trim()) errors.name = t('tournaments.form.nameRequired')
  if (!form.tournament_type) errors.tournament_type = t('tournaments.form.typeRequired')
  if (form.start_date && form.end_date && form.start_date > form.end_date) {
    errors.end_date = t('tournaments.form.endDateAfterStart')
  }
  return errors
}

export function TournamentFormPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const isEdit = id !== undefined
  const tournamentId = Number(id)

  useDocumentTitle(isEdit ? t('tournaments.form.editTitle') : t('tournaments.addTournament'))

  const tournament = useTournament(isEdit ? tournamentId : NaN)

  if (!isEdit) return <TournamentForm mode="create" />

  if (!Number.isFinite(tournamentId)) {
    return <ErrorState error={new Error(t('tournaments.detail.invalidId', { id }))} />
  }
  if (tournament.isPending) return <LoadingState />
  if (tournament.isError) {
    return <ErrorState error={tournament.error} onRetry={() => void tournament.refetch()} />
  }
  return <TournamentForm mode="edit" tournament={tournament.data} />
}

function TournamentForm(props: { mode: 'create' } | { mode: 'edit'; tournament: Tournament }) {
  const { t } = useTranslation()
  const isEdit = props.mode === 'edit'
  const tournamentId = isEdit ? props.tournament.id : NaN
  const navigate = useNavigate()
  const location = useLocation()
  const duplicateFrom = isEdit
    ? undefined
    : (location.state as { duplicate?: Tournament } | null)?.duplicate

  const clubs = useClubs()
  const clubOptions = useMemo(
    () => sortByLabel(clubs.data?.items ?? [], (c) => c.name),
    [clubs.data],
  )
  const createTournament = useCreateTournament()
  const updateTournament = useUpdateTournament(tournamentId)
  const [lastOrganiser, rememberOrganiser] = useLastOrganiser()

  const [form, setForm] = useState<TournamentFormState>(() => {
    if (isEdit) return toFormState(props.tournament)
    if (duplicateFrom) return toFormState(duplicateFrom)
    return { ...EMPTY_FORM, organiser: lastOrganiser }
  })
  // A non-empty format that isn't one of the named presets is an existing
  // free-text value — start the field in "Custom" mode so it stays editable.
  const [customFormat, setCustomFormat] = useState<boolean>(
    () => form.format.length > 0 && !isTournamentFormat(form.format),
  )
  const [touched, setTouched] = useState(false)

  const mutation = isEdit ? updateTournament : createTournament
  const clientErrors = validate(form, t)
  const serverErrors = fieldErrorsFromApiError(mutation.error)
  const errors = touched ? { ...serverErrors, ...clientErrors } : serverErrors
  const bannerMessage =
    mutation.isError && Object.keys(serverErrors).length === 0 ? mutation.error : null

  const backTo = isEdit ? `/tournaments/${tournamentId}` : '/tournaments'

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (Object.keys(clientErrors).length > 0) return

    const payload = toPayload(form)
    if (isEdit) {
      updateTournament.mutate(payload, {
        onSuccess: (updated) => {
          rememberOrganiser(form.organiser)
          navigate(`/tournaments/${updated.id}`)
        },
      })
    } else {
      createTournament.mutate(payload, {
        onSuccess: (created) => {
          rememberOrganiser(form.organiser)
          navigate(`/tournaments/${created.id}`)
        },
      })
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
        <Link to={backTo}>
          <ChevronLeft aria-hidden="true" data-icon="inline-start" />
          {isEdit
            ? t('tournaments.form.backToTournament')
            : t('tournaments.detail.backToTournaments')}
        </Link>
      </Button>

      <PageHeader
        title={isEdit ? t('tournaments.form.editTitle') : t('tournaments.addTournament')}
        description={t('tournaments.pageDescription')}
      />

      <Card>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <FormBanner error={bannerMessage} />

            <FormField id="icon" label={t('tournaments.form.icon')} optional>
              <EntityIconPicker value={form.icon} onChange={(icon) => setForm({ ...form, icon })} />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="name"
                label={t('tournaments.columns.name')}
                error={errors.name}
                className="sm:col-span-2"
              >
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                  required
                />
              </FormField>

              <FormField
                id="season"
                label={t('tournaments.columns.season')}
                optional
                error={errors.season}
              >
                <Input
                  id="season"
                  value={form.season}
                  onChange={(e) => setForm({ ...form, season: e.target.value })}
                  aria-invalid={Boolean(errors.season)}
                  placeholder={t('tournaments.form.seasonPlaceholder')}
                />
              </FormField>

              <FormField
                id="tournament_type"
                label={t('tournaments.form.typeLabel')}
                error={errors.tournament_type}
              >
                <Select
                  value={form.tournament_type}
                  onValueChange={(value) =>
                    setForm({ ...form, tournament_type: value as TournamentType })
                  }
                >
                  <SelectTrigger
                    id="tournament_type"
                    className="w-full"
                    aria-invalid={Boolean(errors.tournament_type)}
                  >
                    <SelectValue placeholder={t('tournaments.form.typePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {tournamentTypeOptions(t).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                id="format"
                label={t('tournaments.form.formatLabel')}
                optional
                error={errors.format}
              >
                <Select
                  value={customFormat ? CUSTOM_FORMAT_VALUE : form.format}
                  onValueChange={(value) => {
                    if (value === CUSTOM_FORMAT_VALUE) {
                      setCustomFormat(true)
                      setForm({ ...form, format: '' })
                    } else {
                      setCustomFormat(false)
                      setForm({ ...form, format: value })
                    }
                  }}
                >
                  <SelectTrigger
                    id="format"
                    className="w-full"
                    aria-invalid={Boolean(errors.format)}
                  >
                    <SelectValue placeholder={t('tournaments.form.formatPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {TOURNAMENT_FORMAT_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                    <SelectItem value={CUSTOM_FORMAT_VALUE}>
                      {t('tournaments.form.formatCustom')}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {customFormat && (
                  <Input
                    id="format-custom"
                    className="mt-2"
                    value={form.format}
                    onChange={(e) => setForm({ ...form, format: e.target.value })}
                    aria-label={t('tournaments.form.customFormatLabel')}
                    placeholder={t('tournaments.form.customFormatPlaceholder')}
                  />
                )}
              </FormField>

              <FormField
                id="organiser"
                label={t('tournaments.columns.organiser')}
                optional
                error={errors.organiser}
              >
                <Input
                  id="organiser"
                  value={form.organiser}
                  onChange={(e) => setForm({ ...form, organiser: e.target.value })}
                  aria-invalid={Boolean(errors.organiser)}
                  placeholder={t('tournaments.form.organiserPlaceholder')}
                />
              </FormField>

              <FormField
                id="club_id"
                label={t('tournaments.columns.hostClub')}
                optional
                error={errors.club_id}
              >
                <Select
                  value={form.club_id || NO_CLUB_VALUE}
                  onValueChange={(value) =>
                    setForm({ ...form, club_id: value === NO_CLUB_VALUE ? '' : value })
                  }
                >
                  <SelectTrigger id="club_id" className="w-full">
                    <SelectValue placeholder={t('tournaments.form.hostClubPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CLUB_VALUE}>
                      {t('tournaments.form.noHostClub')}
                    </SelectItem>
                    {clubOptions.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                id="start_date"
                label={t('tournaments.form.startDate')}
                optional
                error={errors.start_date}
              >
                <Input
                  id="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  aria-invalid={Boolean(errors.start_date)}
                />
              </FormField>

              <FormField
                id="end_date"
                label={t('tournaments.form.endDate')}
                optional
                error={errors.end_date}
              >
                <Input
                  id="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  aria-invalid={Boolean(errors.end_date)}
                />
              </FormField>
            </div>

            <FormField
              id="notes"
              label={t('tournaments.detail.notes')}
              optional
              error={errors.notes}
              className="w-full"
            >
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                aria-invalid={Boolean(errors.notes)}
                rows={4}
              />
            </FormField>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" asChild>
                <Link to={backTo}>{t('common.cancel')}</Link>
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {isEdit ? t('tournaments.form.saveChanges') : t('tournaments.addTournament')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
