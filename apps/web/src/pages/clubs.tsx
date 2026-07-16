import { ChevronLeft, MapPinPlus, Pencil, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import { CountryCombobox } from '@/components/data/country-combobox'
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
import { fieldErrorsFromApiError } from '@/lib/api/form-errors'
import type { Club, ClubCreate, Environment, Surface } from '@/lib/api/clubs'
import { useClub, useClubs, useCreateClub, useDeleteClub, useUpdateClub } from '@/hooks/use-clubs'
import { useMatches } from '@/hooks/use-matches'
import type { Match } from '@/lib/api/matches'
import { useDocumentTitle } from '@/lib/use-document-title'

export function ClubsPage() {
  useDocumentTitle('Clubs')
  const clubs = useClubs()
  const deleteClub = useDeleteClub()

  const rowOptions = (club: Club) => (
    <RowOptionsMenu
      label={club.name}
      editTo={`/clubs/${club.id}/edit`}
      duplicateTo="/clubs/new"
      duplicateState={{ duplicate: club }}
      onDelete={() => deleteClub.mutate(club.id)}
      deletePending={deleteClub.isPending}
      deleteDescription="This permanently removes the club. This can't be undone."
    />
  )

  const columns: EntityColumn<Club>[] = [
    {
      id: 'name',
      header: 'Name',
      sortValue: (c) => c.name.toLowerCase(),
      cell: (c) => (
        <Link
          to={`/clubs/${c.id}`}
          className="flex items-center gap-1.5 font-medium hover:underline"
        >
          <EntityIcon value={c.icon} />
          {c.name}
        </Link>
      ),
    },
    {
      id: 'city',
      header: 'City',
      sortValue: (c) => c.city,
      cell: (c) => c.city ?? '—',
    },
    {
      id: 'country',
      header: 'Country',
      sortValue: (c) => c.country,
      cell: (c) => c.country ?? '—',
    },
    {
      id: 'surface',
      header: 'Surface',
      sortValue: (c) => c.surface,
      cell: (c) => c.surface ?? '—',
    },
    {
      id: 'environment',
      header: 'Environment',
      sortValue: (c) => c.environment,
      cell: (c) => c.environment ?? '—',
    },
  ]

  return (
    <>
      <PageHeader title="Clubs" description="The clubs and courts where your matches happen." />
      <EntityList
        entityKey="clubs"
        items={clubs.data?.items ?? []}
        isPending={clubs.isPending}
        isError={clubs.isError}
        error={clubs.error}
        onRetry={() => void clubs.refetch()}
        columns={columns}
        rowActions={rowOptions}
        getSearchText={(c) =>
          `${c.name} ${c.city ?? ''} ${c.country ?? ''} ${c.surface ?? ''} ${c.environment ?? ''}`
        }
        searchPlaceholder="Filter clubs…"
        defaultSort={{ columnId: 'name', direction: 'asc' }}
        emptyTitle="No clubs yet"
        emptyDescription="Add the clubs and courts where you play to start tracking records by venue."
        createAction={{
          label: 'Add club',
          emptyLabel: 'Add your first club',
          to: '/clubs/new',
          icon: MapPinPlus,
        }}
        renderCard={(c) => (
          <Card className="h-full">
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <Link
                  to={`/clubs/${c.id}`}
                  className="flex items-center gap-1.5 cn-font-heading text-base font-medium hover:underline"
                >
                  <EntityIcon value={c.icon} />
                  {c.name}
                </Link>
                {rowOptions(c)}
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">City</dt>
                  <dd>{c.city ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Country</dt>
                  <dd>{c.country ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Surface</dt>
                  <dd>{c.surface ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Environment</dt>
                  <dd>{c.environment ?? '—'}</dd>
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

const SURFACES: Surface[] = ['Hard', 'Clay', 'Grass', 'Carpet']

function matchResultLabel(match: Match) {
  if (!match.result) return 'Scheduled'
  return match.result === 'Win' ? 'Win' : 'Loss'
}

function ClubMatches({ clubId }: { clubId: number }) {
  const matches = useMatches({ club_id: clubId })
  const [filter, setFilter] = useState<ResultFilter>('all')

  const items = matches.data?.items ?? []
  const filtered = items.filter((match) => {
    if (filter === 'wins') return match.result === 'Win'
    if (filter === 'losses') return match.result === 'Loss'
    return true
  })

  const wins = items.filter((m) => m.result === 'Win').length
  const losses = items.filter((m) => m.result === 'Loss').length

  const surfaceRecords = SURFACES.map((surface) => {
    const surfaceMatches = items.filter((m) => m.surface === surface)
    return {
      surface,
      wins: surfaceMatches.filter((m) => m.result === 'Win').length,
      losses: surfaceMatches.filter((m) => m.result === 'Loss').length,
      total: surfaceMatches.length,
    }
  }).filter((record) => record.total > 0)

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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="cn-font-heading text-lg font-semibold">Matches at this club</h2>
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
          description="Matches played at this club will show up here."
        />
      ) : (
        <>
          {surfaceRecords.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">Record by surface</h3>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {surfaceRecords.map((record) => (
                  <div key={record.surface} className="rounded-lg border p-3">
                    <dt className="text-xs text-muted-foreground">{record.surface}</dt>
                    <dd className="cn-font-heading text-sm font-medium">
                      {record.wins}–{record.losses}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

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
          ) : (
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
                    {filtered.map((match) => (
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
          )}
        </>
      )}
    </div>
  )
}

export function ClubDetailPage() {
  const { id } = useParams()
  const clubId = Number(id)
  const club = useClub(clubId)
  const deleteClub = useDeleteClub()
  const navigate = useNavigate()
  useDocumentTitle(club.data ? club.data.name : 'Club')

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
        <Link to="/clubs">
          <ChevronLeft aria-hidden="true" data-icon="inline-start" />
          Back to Clubs
        </Link>
      </Button>

      {!Number.isFinite(clubId) ? (
        <ErrorState error={new Error(`"${id}" is not a valid club id.`)} />
      ) : club.isPending ? (
        <LoadingState />
      ) : club.isError ? (
        <ErrorState error={club.error} onRetry={() => void club.refetch()} />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <PageHeader
              title={club.data.name}
              description={club.data.country ?? undefined}
              icon={club.data.icon}
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/clubs/${club.data.id}/edit`}>
                  <Pencil aria-hidden="true" data-icon="inline-start" />
                  Edit
                </Link>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteClub.isPending}
                onClick={() => {
                  deleteClub.mutate(club.data.id, {
                    onSuccess: () => navigate('/clubs'),
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
                  <dt className="text-muted-foreground">City</dt>
                  <dd>{club.data.city ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Country</dt>
                  <dd>{club.data.country ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Surface</dt>
                  <dd>{club.data.surface ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Environment</dt>
                  <dd>{club.data.environment ?? '—'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <ClubMatches clubId={club.data.id} />
        </>
      )}
    </>
  )
}

const SURFACE_OPTIONS: Surface[] = ['Hard', 'Clay', 'Grass', 'Carpet']

const ENVIRONMENT_OPTIONS: { value: Environment; label: string }[] = [
  { value: 'Indoor', label: 'Indoor' },
  { value: 'Outdoor', label: 'Outdoor' },
]

interface ClubFormState {
  name: string
  city: string
  country: string
  surface: Surface | ''
  environment: Environment | ''
  icon: string | null
}

const EMPTY_FORM: ClubFormState = {
  name: '',
  city: '',
  country: '',
  surface: '',
  environment: '',
  icon: null,
}

function toFormState(club: Club): ClubFormState {
  return {
    name: club.name,
    city: club.city ?? '',
    country: club.country ?? '',
    surface: club.surface ?? '',
    environment: club.environment ?? '',
    icon: club.icon,
  }
}

function toPayload(form: ClubFormState): ClubCreate {
  return {
    name: form.name.trim(),
    city: form.city.trim() || null,
    country: form.country.trim() || null,
    surface: form.surface || null,
    environment: form.environment || null,
    icon: form.icon,
  }
}

function validate(form: ClubFormState): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.name.trim()) errors.name = 'Name is required.'
  return errors
}

export function ClubFormPage() {
  const { id } = useParams()
  const isEdit = id !== undefined
  const clubId = Number(id)

  useDocumentTitle(isEdit ? 'Edit club' : 'Add club')

  const club = useClub(isEdit ? clubId : NaN)

  if (!isEdit) return <ClubForm mode="create" />

  if (!Number.isFinite(clubId)) {
    return <ErrorState error={new Error(`"${id}" is not a valid club id.`)} />
  }
  if (club.isPending) return <LoadingState />
  if (club.isError) {
    return <ErrorState error={club.error} onRetry={() => void club.refetch()} />
  }
  return <ClubForm mode="edit" club={club.data} />
}

function ClubForm(props: { mode: 'create' } | { mode: 'edit'; club: Club }) {
  const isEdit = props.mode === 'edit'
  const clubId = isEdit ? props.club.id : NaN
  const navigate = useNavigate()
  const location = useLocation()
  const duplicateFrom = isEdit
    ? undefined
    : (location.state as { duplicate?: Club } | null)?.duplicate

  const createClub = useCreateClub()
  const updateClub = useUpdateClub(clubId)

  const [form, setForm] = useState<ClubFormState>(() =>
    isEdit ? toFormState(props.club) : duplicateFrom ? toFormState(duplicateFrom) : EMPTY_FORM,
  )
  const [touched, setTouched] = useState(false)

  const mutation = isEdit ? updateClub : createClub
  const clientErrors = validate(form)
  const serverErrors = fieldErrorsFromApiError(mutation.error)
  const errors = touched ? { ...serverErrors, ...clientErrors } : serverErrors
  const bannerMessage =
    mutation.isError && Object.keys(serverErrors).length === 0 ? mutation.error : null

  const backTo = isEdit ? `/clubs/${clubId}` : '/clubs'

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (Object.keys(clientErrors).length > 0) return

    const payload = toPayload(form)
    if (isEdit) {
      updateClub.mutate(payload, {
        onSuccess: (updated) => navigate(`/clubs/${updated.id}`),
      })
    } else {
      createClub.mutate(payload, {
        onSuccess: (created) => navigate(`/clubs/${created.id}`),
      })
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
        <Link to={backTo}>
          <ChevronLeft aria-hidden="true" data-icon="inline-start" />
          {isEdit ? 'Back to club' : 'Back to Clubs'}
        </Link>
      </Button>

      <PageHeader
        title={isEdit ? 'Edit club' : 'Add club'}
        description="The clubs and courts where your matches happen."
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

              <FormField id="city" label="City" optional error={errors.city}>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  aria-invalid={Boolean(errors.city)}
                />
              </FormField>

              <FormField id="country" label="Country" optional error={errors.country}>
                <CountryCombobox
                  id="country"
                  value={form.country || null}
                  onChange={(country) => setForm({ ...form, country: country ?? '' })}
                  aria-invalid={Boolean(errors.country)}
                />
              </FormField>

              <FormField id="surface" label="Surface" optional error={errors.surface}>
                <Select
                  value={form.surface}
                  onValueChange={(value) => setForm({ ...form, surface: value as Surface })}
                >
                  <SelectTrigger id="surface" className="w-full">
                    <SelectValue placeholder="Select surface" />
                  </SelectTrigger>
                  <SelectContent>
                    {SURFACE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField id="environment" label="Environment" optional error={errors.environment}>
                <Select
                  value={form.environment}
                  onValueChange={(value) => setForm({ ...form, environment: value as Environment })}
                >
                  <SelectTrigger id="environment" className="w-full">
                    <SelectValue placeholder="Select environment" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENVIRONMENT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" asChild>
                <Link to={backTo}>Cancel</Link>
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {isEdit ? 'Save changes' : 'Add club'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
