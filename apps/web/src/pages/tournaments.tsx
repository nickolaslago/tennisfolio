import { TOURNAMENT_FORMAT_OPTIONS, isTournamentFormat } from '@tennisfolio/core'
import { ChevronLeft, Pencil, Trash2, Trophy } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import { EntityIcon } from '@/components/data/entity-icon'
import { EntityIconPicker } from '@/components/data/entity-icon-picker'
import { EntityList, type EntityColumn } from '@/components/data/entity-list'
import { FormBanner, FormField } from '@/components/data/entity-form'
import { EmptyState, ErrorState, LoadingState } from '@/components/data/query-state'
import { RowOptionsMenu } from '@/components/data/row-options-menu'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { Textarea } from '@/components/ui/textarea'
import { fieldErrorsFromApiError } from '@/lib/api/form-errors'
import type { Tournament, TournamentCreate, TournamentType } from '@/lib/api/tournaments'
import {
  useCreateTournament,
  useDeleteTournament,
  useTournament,
  useTournaments,
  useUpdateTournament,
} from '@/hooks/use-tournaments'
import { useClub, useClubs } from '@/hooks/use-clubs'
import { useLastOrganiser } from '@/hooks/use-last-organiser'
import { useMatches } from '@/hooks/use-matches'
import type { Match } from '@/lib/api/matches'
import { useDocumentTitle } from '@/lib/use-document-title'

function dateRange(tournament: Tournament) {
  if (!tournament.start_date && !tournament.end_date) return '—'
  return `${tournament.start_date ?? '—'} – ${tournament.end_date ?? '—'}`
}

export function TournamentsPage() {
  useDocumentTitle('Tournaments')
  const tournaments = useTournaments()
  const clubs = useClubs()
  const deleteTournament = useDeleteTournament()

  const clubName = (clubId: number | null) => {
    if (clubId === null) return null
    return clubs.data?.items.find((c) => c.id === clubId)?.name ?? null
  }

  const rowOptions = (tournament: Tournament) => (
    <RowOptionsMenu
      label={tournament.name}
      editTo={`/tournaments/${tournament.id}/edit`}
      duplicateTo="/tournaments/new"
      duplicateState={{ duplicate: tournament }}
      onDelete={() => deleteTournament.mutate(tournament.id)}
      deletePending={deleteTournament.isPending}
      deleteDescription="This permanently removes the tournament. This can't be undone."
    />
  )

  const columns: EntityColumn<Tournament>[] = [
    {
      id: 'name',
      header: 'Name',
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
      header: 'Season',
      sortValue: (t) => t.season,
      cell: (t) => t.season ?? '—',
    },
    {
      id: 'tournament_type',
      header: 'Type',
      sortValue: (t) => t.tournament_type,
      cell: (t) => t.tournament_type,
    },
    {
      id: 'organiser',
      header: 'Organiser',
      sortValue: (t) => t.organiser ?? '',
      cell: (t) => t.organiser ?? '—',
    },
    {
      id: 'club',
      header: 'Host club',
      sortValue: (t) => clubName(t.club_id),
      cell: (t) => clubName(t.club_id) ?? '—',
    },
    {
      id: 'dates',
      header: 'Dates',
      sortValue: (t) => t.start_date,
      cell: (t) => dateRange(t),
    },
  ]

  return (
    <>
      <PageHeader
        title="Tournaments"
        description="Tournaments and leagues you've entered, past and upcoming."
      />
      <EntityList
        entityKey="tournaments"
        items={tournaments.data?.items ?? []}
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
        searchPlaceholder="Filter tournaments…"
        defaultSort={{ columnId: 'name', direction: 'asc' }}
        emptyTitle="No tournaments yet"
        emptyDescription="Add the tournaments and leagues you've entered to start tracking matches by stage."
        createAction={{
          label: 'Add tournament',
          emptyLabel: 'Add your first tournament',
          to: '/tournaments/new',
          icon: Trophy,
        }}
        renderCard={(t) => (
          <Card className="h-full">
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <Link
                  to={`/tournaments/${t.id}`}
                  className="flex items-center gap-1.5 cn-font-heading text-base font-medium hover:underline"
                >
                  <EntityIcon value={t.icon} />
                  {t.name}
                </Link>
                {rowOptions(t)}
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Season</dt>
                  <dd>{t.season ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Type</dt>
                  <dd>{t.tournament_type}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Organiser</dt>
                  <dd>{t.organiser ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Host club</dt>
                  <dd>{clubName(t.club_id) ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Dates</dt>
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

function matchResultLabel(match: Match) {
  if (!match.result) return 'Scheduled'
  return match.result === 'Win' ? 'Win' : 'Loss'
}

function groupByStage(matches: Match[]): { stage: string; matches: Match[] }[] {
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
    ...(unspecified.length > 0 ? [{ stage: 'Unspecified', matches: unspecified }] : []),
  ]
}

function MatchesTable({ matches }: { matches: Match[] }) {
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
      id: 'score',
      header: 'Score',
      cell: (m) => m.score ?? '—',
    },
    {
      id: 'result',
      header: 'Result',
      sortValue: (m) => m.result ?? '',
      cell: (m) => matchResultLabel(m),
    },
    {
      id: 'surface',
      header: 'Surface',
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

function TournamentMatches({ tournament }: { tournament: Tournament }) {
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
  const groups = isKnockout ? groupByStage(filtered) : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="cn-font-heading text-lg font-semibold">Matches</h2>
        {matches.isPending || matches.isError ? null : (
          <p className="text-sm text-muted-foreground">
            {wins}–{losses} ({items.length} match{items.length === 1 ? '' : 'es'})
          </p>
        )}
      </div>

      {matches.isPending ? (
        <LoadingState />
      ) : matches.isError ? (
        <ErrorState error={matches.error} onRetry={() => void matches.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No matches yet"
          description="Matches played in this tournament will show up here."
        />
      ) : (
        <>
          <div role="group" aria-label="Filter by result" className="flex gap-2">
            {(
              [
                { value: 'all', label: 'All' },
                { value: 'wins', label: 'Wins' },
                { value: 'losses', label: 'Losses' },
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
              No matches for this filter.
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
  const { id } = useParams()
  const tournamentId = Number(id)
  const tournament = useTournament(tournamentId)
  const club = useClub(tournament.data?.club_id ?? NaN)
  const deleteTournament = useDeleteTournament()
  const navigate = useNavigate()
  useDocumentTitle(tournament.data ? tournament.data.name : 'Tournament')

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
        <Link to="/tournaments">
          <ChevronLeft aria-hidden="true" data-icon="inline-start" />
          Back to Tournaments
        </Link>
      </Button>

      {!Number.isFinite(tournamentId) ? (
        <ErrorState error={new Error(`"${id}" is not a valid tournament id.`)} />
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
                  Edit
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
                Delete
              </Button>
            </div>
          </div>
          <Card className="mb-6">
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">Season</dt>
                  <dd>{tournament.data.season ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Type</dt>
                  <dd>{tournament.data.tournament_type}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Format</dt>
                  <dd>{tournament.data.format ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Organiser</dt>
                  <dd>{tournament.data.organiser ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Host club</dt>
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
                  <dt className="text-muted-foreground">Dates</dt>
                  <dd>{dateRange(tournament.data)}</dd>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <dt className="text-muted-foreground">Notes</dt>
                  <dd>{tournament.data.notes ?? '—'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <TournamentMatches tournament={tournament.data} />
        </>
      )}
    </>
  )
}

const TOURNAMENT_TYPE_OPTIONS: { value: TournamentType; label: string }[] = [
  { value: 'Knockout Tournament', label: 'Knockout Tournament' },
  { value: 'Ranking League', label: 'Ranking League' },
]

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

function validate(form: TournamentFormState): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.name.trim()) errors.name = 'Name is required.'
  if (!form.tournament_type) errors.tournament_type = 'Tournament type is required.'
  if (form.start_date && form.end_date && form.start_date > form.end_date) {
    errors.end_date = 'End date must be on or after the start date.'
  }
  return errors
}

export function TournamentFormPage() {
  const { id } = useParams()
  const isEdit = id !== undefined
  const tournamentId = Number(id)

  useDocumentTitle(isEdit ? 'Edit tournament' : 'Add tournament')

  const tournament = useTournament(isEdit ? tournamentId : NaN)

  if (!isEdit) return <TournamentForm mode="create" />

  if (!Number.isFinite(tournamentId)) {
    return <ErrorState error={new Error(`"${id}" is not a valid tournament id.`)} />
  }
  if (tournament.isPending) return <LoadingState />
  if (tournament.isError) {
    return <ErrorState error={tournament.error} onRetry={() => void tournament.refetch()} />
  }
  return <TournamentForm mode="edit" tournament={tournament.data} />
}

function TournamentForm(props: { mode: 'create' } | { mode: 'edit'; tournament: Tournament }) {
  const isEdit = props.mode === 'edit'
  const tournamentId = isEdit ? props.tournament.id : NaN
  const navigate = useNavigate()
  const location = useLocation()
  const duplicateFrom = isEdit
    ? undefined
    : (location.state as { duplicate?: Tournament } | null)?.duplicate

  const clubs = useClubs()
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
  const clientErrors = validate(form)
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
          {isEdit ? 'Back to tournament' : 'Back to Tournaments'}
        </Link>
      </Button>

      <PageHeader
        title={isEdit ? 'Edit tournament' : 'Add tournament'}
        description="Tournaments and leagues you've entered, past and upcoming."
      />

      <Card>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <FormBanner error={bannerMessage} />

            <FormField id="icon" label="Icon" optional>
              <EntityIconPicker value={form.icon} onChange={(icon) => setForm({ ...form, icon })} />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="name" label="Name" error={errors.name} className="sm:col-span-2">
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                  required
                />
              </FormField>

              <FormField id="season" label="Season" optional error={errors.season}>
                <Input
                  id="season"
                  value={form.season}
                  onChange={(e) => setForm({ ...form, season: e.target.value })}
                  aria-invalid={Boolean(errors.season)}
                  placeholder="e.g. 2026"
                />
              </FormField>

              <FormField
                id="tournament_type"
                label="Tournament type"
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
                    <SelectValue placeholder="Select tournament type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOURNAMENT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField id="format" label="Format" optional error={errors.format}>
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
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOURNAMENT_FORMAT_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                    <SelectItem value={CUSTOM_FORMAT_VALUE}>Custom</SelectItem>
                  </SelectContent>
                </Select>
                {customFormat && (
                  <Input
                    id="format-custom"
                    className="mt-2"
                    value={form.format}
                    onChange={(e) => setForm({ ...form, format: e.target.value })}
                    aria-label="Custom format"
                    placeholder="e.g. Round robin, then knockout"
                  />
                )}
              </FormField>

              <FormField id="organiser" label="Organiser" optional error={errors.organiser}>
                <Input
                  id="organiser"
                  value={form.organiser}
                  onChange={(e) => setForm({ ...form, organiser: e.target.value })}
                  aria-invalid={Boolean(errors.organiser)}
                  placeholder="e.g. Riverside Tennis Club"
                />
              </FormField>

              <FormField id="club_id" label="Host club" optional error={errors.club_id}>
                <Select
                  value={form.club_id || NO_CLUB_VALUE}
                  onValueChange={(value) =>
                    setForm({ ...form, club_id: value === NO_CLUB_VALUE ? '' : value })
                  }
                >
                  <SelectTrigger id="club_id" className="w-full">
                    <SelectValue placeholder="Select host club" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CLUB_VALUE}>No host club</SelectItem>
                    {(clubs.data?.items ?? []).map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField id="start_date" label="Start date" optional error={errors.start_date}>
                <Input
                  id="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  aria-invalid={Boolean(errors.start_date)}
                />
              </FormField>

              <FormField id="end_date" label="End date" optional error={errors.end_date}>
                <Input
                  id="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  aria-invalid={Boolean(errors.end_date)}
                />
              </FormField>
            </div>

            <FormField id="notes" label="Notes" optional error={errors.notes} className="w-full">
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
                <Link to={backTo}>Cancel</Link>
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {isEdit ? 'Save changes' : 'Add tournament'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
