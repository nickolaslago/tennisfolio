import { ChevronLeft, MapPinPlus, Pencil, Plus, Trash2 } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

import { ConfirmDeleteDialog } from '@/components/data/confirm-delete-dialog'
import { CountryCombobox } from '@/components/data/country-combobox'
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
import { Label } from '@/components/ui/label'
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
import { fieldErrorsFromApiError } from '@/lib/api/form-errors'
import type { Club, ClubCreate, Court, CourtInput, Environment, Surface } from '@/lib/api/clubs'
import { useClub, useClubs, useCreateClub, useDeleteClub, useUpdateClub } from '@/hooks/use-clubs'
import { useMatches } from '@/hooks/use-matches'
import type { Match } from '@/lib/api/matches'
import { useUrlFilters } from '@/hooks/use-url-filters'
import { useDocumentTitle } from '@/lib/use-document-title'

function environmentLabel(environment: Environment, t: TFunction): string {
  return environment === 'Indoor'
    ? t('clubs.form.environmentIndoor')
    : t('clubs.form.environmentOutdoor')
}

function formatCourt(court: Court, t: TFunction): string {
  return `${court.surface} · ${environmentLabel(court.environment, t)}`
}

function courtsSummary(courts: Court[], t: TFunction): string {
  if (courts.length === 0) return '—'
  return courts.map((court) => formatCourt(court, t)).join(', ')
}

const SURFACE_OPTIONS: Surface[] = ['Hard', 'Clay', 'Grass', 'Carpet']

function environmentOptions(t: TFunction): { value: Environment; label: string }[] {
  return [
    { value: 'Indoor', label: t('clubs.form.environmentIndoor') },
    { value: 'Outdoor', label: t('clubs.form.environmentOutdoor') },
  ]
}

const FILTER_FIELD_IDS = ['surface', 'environment', 'country'] as const

export function ClubsPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('clubs.pageTitle'))

  const {
    values: filterValues,
    setValue: setFilterValue,
    removeValue,
  } = useUrlFilters(FILTER_FIELD_IDS)

  const clubs = useClubs({
    surface: (filterValues.surface as Surface) || undefined,
    environment: (filterValues.environment as Environment) || undefined,
    country: filterValues.country || undefined,
  })
  // Unfiltered, so the country filter's option list doesn't shrink to only the
  // countries left over after another filter has already been applied.
  const allClubs = useClubs()
  const deleteClub = useDeleteClub()

  const countryOptions = useMemo(() => {
    const countries = new Set(
      (allClubs.data?.items ?? [])
        .map((c) => c.country)
        .filter((country): country is string => Boolean(country)),
    )
    return Array.from(countries).sort((a, b) => a.localeCompare(b))
  }, [allClubs.data])

  const filterFields: FilterField[] = useMemo(
    () => [
      {
        id: 'surface',
        label: t('clubs.columns.surface'),
        options: SURFACE_OPTIONS.map((surface) => ({ value: surface, label: surface })),
      },
      {
        id: 'environment',
        label: t('clubs.columns.environment'),
        options: environmentOptions(t),
      },
      {
        id: 'country',
        label: t('clubs.columns.country'),
        options: countryOptions.map((country) => ({ value: country, label: country })),
      },
    ],
    [t, countryOptions],
  )

  const rowOptions = (club: Club) => (
    <RowOptionsMenu
      label={club.name}
      editTo={`/clubs/${club.id}/edit`}
      duplicateTo="/clubs/new"
      duplicateState={{ duplicate: club }}
      onDelete={() => deleteClub.mutate(club.id)}
      deletePending={deleteClub.isPending}
      deleteDescription={t('clubs.deleteDescription')}
    />
  )

  const columns: EntityColumn<Club>[] = [
    {
      id: 'name',
      header: t('clubs.columns.name'),
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
      header: t('clubs.columns.city'),
      sortValue: (c) => c.city,
      cell: (c) => c.city ?? '—',
    },
    {
      id: 'country',
      header: t('clubs.columns.country'),
      sortValue: (c) => c.country,
      cell: (c) => c.country ?? '—',
    },
    {
      id: 'courts',
      header: t('clubs.columns.courts'),
      sortValue: (c) => c.courts.length,
      cell: (c) => courtsSummary(c.courts, t),
    },
  ]

  return (
    <>
      <PageHeader title={t('clubs.pageTitle')} description={t('clubs.pageDescription')} />
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
          `${c.name} ${c.city ?? ''} ${c.country ?? ''} ${c.courts
            .map((court) => `${court.surface} ${court.environment}`)
            .join(' ')}`
        }
        searchPlaceholder={t('clubs.filterPlaceholder')}
        filters={{
          fields: filterFields,
          values: filterValues,
          onChange: setFilterValue,
          onRemove: removeValue,
        }}
        defaultSort={{ columnId: 'name', direction: 'asc' }}
        emptyTitle={t('clubs.emptyState.title')}
        emptyDescription={t('clubs.emptyState.description')}
        createAction={{
          label: t('clubs.addClub'),
          emptyLabel: t('clubs.addFirstClub'),
          to: '/clubs/new',
          icon: MapPinPlus,
        }}
        renderCard={(c) => (
          <Card className="h-full">
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <Link
                  to={`/clubs/${c.id}`}
                  className="flex items-center gap-1.5 font-heading text-base font-medium hover:underline"
                >
                  <EntityIcon value={c.icon} />
                  {c.name}
                </Link>
                {rowOptions(c)}
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">{t('clubs.columns.city')}</dt>
                  <dd>{c.city ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('clubs.columns.country')}</dt>
                  <dd>{c.country ?? '—'}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground">{t('clubs.columns.courts')}</dt>
                  <dd>{courtsSummary(c.courts, t)}</dd>
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

function ClubMatches({ clubId }: { clubId: number }) {
  const { t } = useTranslation()
  const matches = useMatches({ club_id: clubId })
  const [filter, setFilter] = useState<ResultFilter>('all')

  const matchResultLabel = (match: Match) => {
    if (!match.result) return t('matches.tabs.scheduled')
    return match.result === 'Win' ? 'Win' : 'Loss'
  }

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
      header: t('clubs.matches.columns.score'),
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold">{t('clubs.matches.heading')}</h2>
        {matches.isPending || matches.isError ? null : (
          <p className="text-sm text-muted-foreground">
            {t('clubs.matches.recordSummary', { wins, losses, count: items.length })}
          </p>
        )}
      </div>

      {matches.isPending ? (
        <LoadingState />
      ) : matches.isError ? (
        <ErrorState error={matches.error} onRetry={() => void matches.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title={t('clubs.matches.emptyState.title')}
          description={t('clubs.matches.emptyState.description')}
        />
      ) : (
        <>
          {surfaceRecords.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                {t('clubs.matches.recordBySurface')}
              </h3>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {surfaceRecords.map((record) => (
                  <div key={record.surface} className="rounded-lg border p-3">
                    <dt className="text-xs text-muted-foreground">{record.surface}</dt>
                    <dd className="font-heading text-sm font-medium">
                      {record.wins}–{record.losses}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          <div
            role="group"
            aria-label={t('clubs.matches.filterByResultLabel')}
            className="flex gap-2"
          >
            {(
              [
                { value: 'all', label: t('clubs.matches.filters.all') },
                { value: 'wins', label: t('clubs.matches.filters.wins') },
                { value: 'losses', label: t('clubs.matches.filters.losses') },
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
              {t('clubs.matches.noFilterMatches')}
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
  const { t } = useTranslation()
  const { id } = useParams()
  const clubId = Number(id)
  const club = useClub(clubId)
  const deleteClub = useDeleteClub()
  const navigate = useNavigate()
  useDocumentTitle(club.data ? club.data.name : t('clubs.detail.pageTitleFallback'))

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
        <Link to="/clubs">
          <ChevronLeft aria-hidden="true" data-icon="inline-start" />
          {t('clubs.detail.backToClubs')}
        </Link>
      </Button>

      {!Number.isFinite(clubId) ? (
        <ErrorState error={new Error(t('clubs.detail.invalidId', { id }))} />
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
                  {t('common.rowActions.edit')}
                </Link>
              </Button>
              <ConfirmDeleteDialog
                title={t('clubs.detail.deleteConfirmTitle')}
                description={t('clubs.deleteDescription')}
                pending={deleteClub.isPending}
                onConfirm={() =>
                  deleteClub.mutate(club.data.id, { onSuccess: () => navigate('/clubs') })
                }
              />
            </div>
          </div>
          <Card className="mb-6">
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">{t('clubs.columns.city')}</dt>
                  <dd>{club.data.city ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('clubs.columns.country')}</dt>
                  <dd>{club.data.country ?? '—'}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground">{t('clubs.columns.courts')}</dt>
                  <dd>
                    {club.data.courts.length === 0 ? (
                      '—'
                    ) : (
                      <ul className="flex flex-wrap gap-2">
                        {club.data.courts.map((court) => (
                          <li
                            key={court.id}
                            className="rounded-md border px-2 py-0.5 text-xs font-medium"
                          >
                            {formatCourt(court, t)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </dd>
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

/** A court row as edited in the form; fields may be blank while being filled in. */
interface CourtRow {
  id?: number
  surface: Surface | ''
  environment: Environment | ''
}

const EMPTY_COURT: CourtRow = { surface: '', environment: '' }

interface ClubFormState {
  name: string
  city: string
  country: string
  icon: string | null
  courts: CourtRow[]
}

const EMPTY_FORM: ClubFormState = {
  name: '',
  city: '',
  country: '',
  icon: null,
  courts: [{ ...EMPTY_COURT }],
}

function toFormState(club: Club): ClubFormState {
  return {
    name: club.name,
    city: club.city ?? '',
    country: club.country ?? '',
    icon: club.icon,
    courts:
      club.courts.length > 0
        ? club.courts.map((court) => ({
            id: court.id,
            surface: court.surface,
            environment: court.environment,
          }))
        : [{ ...EMPTY_COURT }],
  }
}

function toPayload(form: ClubFormState): ClubCreate {
  const courts: CourtInput[] = form.courts
    .filter((court): court is { id?: number; surface: Surface; environment: Environment } =>
      Boolean(court.surface && court.environment),
    )
    .map((court) => ({ id: court.id, surface: court.surface, environment: court.environment }))
  return {
    name: form.name.trim(),
    city: form.city.trim() || null,
    country: form.country.trim() || null,
    icon: form.icon,
    courts,
  }
}

function validate(form: ClubFormState, t: TFunction): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.name.trim()) errors.name = t('clubs.form.nameRequired')

  const complete = form.courts.filter((court) => court.surface && court.environment)
  const partial = form.courts.some(
    (court) => (court.surface && !court.environment) || (!court.surface && court.environment),
  )
  if (complete.length === 0) {
    errors.courts = t('clubs.form.courtsRequired')
  } else if (partial) {
    errors.courts = t('clubs.form.courtIncomplete')
  } else {
    const seen = new Set<string>()
    for (const court of complete) {
      const key = `${court.surface}/${court.environment}`
      if (seen.has(key)) {
        errors.courts = t('clubs.form.courtDuplicate')
        break
      }
      seen.add(key)
    }
  }
  return errors
}

export function ClubFormPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const isEdit = id !== undefined
  const clubId = Number(id)

  useDocumentTitle(isEdit ? t('clubs.form.editTitle') : t('clubs.addClub'))

  const club = useClub(isEdit ? clubId : NaN)

  if (!isEdit) return <ClubForm mode="create" />

  if (!Number.isFinite(clubId)) {
    return <ErrorState error={new Error(t('clubs.detail.invalidId', { id }))} />
  }
  if (club.isPending) return <LoadingState />
  if (club.isError) {
    return <ErrorState error={club.error} onRetry={() => void club.refetch()} />
  }
  return <ClubForm mode="edit" club={club.data} />
}

function ClubForm(props: { mode: 'create' } | { mode: 'edit'; club: Club }) {
  const { t } = useTranslation()
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
  const clientErrors = validate(form, t)
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
          {isEdit ? t('clubs.form.backToClub') : t('clubs.detail.backToClubs')}
        </Link>
      </Button>

      <PageHeader
        title={isEdit ? t('clubs.form.editTitle') : t('clubs.addClub')}
        description={t('clubs.pageDescription')}
      />

      <Card>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <FormBanner error={bannerMessage} />

            <FormField id="icon" label={t('clubs.form.icon')} optional>
              <EntityIconPicker value={form.icon} onChange={(icon) => setForm({ ...form, icon })} />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="name"
                label={t('clubs.columns.name')}
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

              <FormField id="city" label={t('clubs.columns.city')} optional error={errors.city}>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  aria-invalid={Boolean(errors.city)}
                />
              </FormField>

              <FormField
                id="country"
                label={t('clubs.columns.country')}
                optional
                error={errors.country}
              >
                <CountryCombobox
                  id="country"
                  value={form.country || null}
                  onChange={(country) => setForm({ ...form, country: country ?? '' })}
                  aria-invalid={Boolean(errors.country)}
                />
              </FormField>
            </div>

            <CourtsEditor
              courts={form.courts}
              error={errors.courts}
              onChange={(courts) => setForm({ ...form, courts })}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" asChild>
                <Link to={backTo}>{t('common.cancel')}</Link>
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {isEdit ? t('clubs.form.saveChanges') : t('clubs.addClub')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}

/** Editable list of a club's courts — add/remove rows of (surface, environment). */
function CourtsEditor({
  courts,
  error,
  onChange,
}: {
  courts: CourtRow[]
  error?: string
  onChange: (courts: CourtRow[]) => void
}) {
  const { t } = useTranslation()

  const update = (index: number, patch: Partial<CourtRow>) =>
    onChange(courts.map((court, i) => (i === index ? { ...court, ...patch } : court)))
  const add = () => onChange([...courts, { ...EMPTY_COURT }])
  const remove = (index: number) => onChange(courts.filter((_, i) => i !== index))

  return (
    <div className="flex flex-col gap-2">
      <Label>{t('clubs.form.courts')}</Label>
      <p className="text-xs text-muted-foreground">{t('clubs.form.courtsHint')}</p>

      <div className="flex flex-col gap-2">
        {courts.map((court, index) => (
          <div key={index} className="flex items-center gap-2">
            <Select
              value={court.surface || undefined}
              onValueChange={(value) => update(index, { surface: value as Surface })}
            >
              <SelectTrigger className="w-full" aria-label={t('clubs.columns.surface')}>
                <SelectValue placeholder={t('matchForm.fields.surfacePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {SURFACE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={court.environment || undefined}
              onValueChange={(value) => update(index, { environment: value as Environment })}
            >
              <SelectTrigger className="w-full" aria-label={t('clubs.columns.environment')}>
                <SelectValue placeholder={t('clubs.form.environmentPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {environmentOptions(t).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => remove(index)}
              disabled={courts.length === 1}
              aria-label={t('clubs.form.removeCourt')}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        ))}
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={add}>
        <Plus aria-hidden="true" data-icon="inline-start" />
        {t('clubs.form.addCourt')}
      </Button>
    </div>
  )
}
