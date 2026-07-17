import { ChevronLeft, MapPinPlus, Pencil, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

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
  const { t } = useTranslation()
  useDocumentTitle(t('clubs.pageTitle'))
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
      id: 'surface',
      header: t('clubs.columns.surface'),
      sortValue: (c) => c.surface,
      cell: (c) => c.surface ?? '—',
    },
    {
      id: 'environment',
      header: t('clubs.columns.environment'),
      sortValue: (c) => c.environment,
      cell: (c) => c.environment ?? '—',
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
          `${c.name} ${c.city ?? ''} ${c.country ?? ''} ${c.surface ?? ''} ${c.environment ?? ''}`
        }
        searchPlaceholder={t('clubs.filterPlaceholder')}
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
                  className="flex items-center gap-1.5 cn-font-heading text-base font-medium hover:underline"
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
                <div>
                  <dt className="text-muted-foreground">{t('clubs.columns.surface')}</dt>
                  <dd>{c.surface ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('clubs.columns.environment')}</dt>
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
        <h2 className="cn-font-heading text-lg font-semibold">{t('clubs.matches.heading')}</h2>
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
                    <dd className="cn-font-heading text-sm font-medium">
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
                {t('common.rowActions.delete')}
              </Button>
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
                <div>
                  <dt className="text-muted-foreground">{t('clubs.columns.surface')}</dt>
                  <dd>{club.data.surface ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('clubs.columns.environment')}</dt>
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

function environmentOptions(t: TFunction): { value: Environment; label: string }[] {
  return [
    { value: 'Indoor', label: t('clubs.form.environmentIndoor') },
    { value: 'Outdoor', label: t('clubs.form.environmentOutdoor') },
  ]
}

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

function validate(form: ClubFormState, t: TFunction): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.name.trim()) errors.name = t('clubs.form.nameRequired')
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

              <FormField
                id="surface"
                label={t('clubs.columns.surface')}
                optional
                error={errors.surface}
              >
                <Select
                  value={form.surface}
                  onValueChange={(value) => setForm({ ...form, surface: value as Surface })}
                >
                  <SelectTrigger id="surface" className="w-full">
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
              </FormField>

              <FormField
                id="environment"
                label={t('clubs.columns.environment')}
                optional
                error={errors.environment}
              >
                <Select
                  value={form.environment}
                  onValueChange={(value) => setForm({ ...form, environment: value as Environment })}
                >
                  <SelectTrigger id="environment" className="w-full">
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
              </FormField>
            </div>

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
