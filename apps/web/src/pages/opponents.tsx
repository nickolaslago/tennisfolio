import { ChevronLeft, Pencil, Trash2, UserPlus } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

import { CountryCombobox } from '@/components/data/country-combobox'
import { EntityIcon } from '@/components/data/entity-icon'
import { EntityIconPicker } from '@/components/data/entity-icon-picker'
import { EntityList, type EntityColumn, type FilterField } from '@/components/data/entity-list'
import { FormBanner, FormField } from '@/components/data/entity-form'
import { EmptyState, ErrorState, LoadingState } from '@/components/data/query-state'
import { RowOptionsMenu } from '@/components/data/row-options-menu'
import { OpponentHeadToHead } from '@/components/opponents/head-to-head'
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
import type { AgeRange, Handedness, Opponent, OpponentCreate } from '@/lib/api/opponents'
import { useDeleteOpponent, useOpponent, useOpponents } from '@/hooks/use-opponents'
import { useCreateOpponent, useUpdateOpponent } from '@/hooks/use-opponents'
import { useMatches } from '@/hooks/use-matches'
import type { Match } from '@/lib/api/matches'
import { useUrlFilters } from '@/hooks/use-url-filters'
import { useDocumentTitle } from '@/lib/use-document-title'

const FILTER_FIELD_IDS = ['handedness', 'age_range'] as const

const fullName = (opponent: Opponent) =>
  opponent.name ? `${opponent.name} ${opponent.last_name}` : opponent.last_name

function handednessOptions(t: TFunction): { value: Handedness; label: string }[] {
  return [
    { value: 'R', label: t('opponents.form.handednessRight') },
    { value: 'L', label: t('opponents.form.handednessLeft') },
  ]
}

const AGE_RANGE_OPTIONS: AgeRange[] = [
  'Under 18',
  '18-25',
  '26-35',
  '36-45',
  '46-55',
  '56-65',
  'Over 65',
]

export function OpponentsPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('opponents.pageTitle'))

  const {
    values: filterValues,
    setValue: setFilterValue,
    removeValue,
  } = useUrlFilters(FILTER_FIELD_IDS)

  const opponents = useOpponents({
    handedness: (filterValues.handedness as Handedness) || undefined,
    age_range: (filterValues.age_range as AgeRange) || undefined,
  })
  const deleteOpponent = useDeleteOpponent()

  const filterFields: FilterField[] = useMemo(
    () => [
      {
        id: 'handedness',
        label: t('opponents.columns.handedness'),
        options: handednessOptions(t).map((o) => ({ value: o.value, label: o.label })),
      },
      {
        id: 'age_range',
        label: t('opponents.detail.ageRange'),
        options: AGE_RANGE_OPTIONS.map((range) => ({ value: range, label: range })),
      },
    ],
    [t],
  )

  const rowOptions = (opponent: Opponent) => (
    <RowOptionsMenu
      label={fullName(opponent)}
      editTo={`/opponents/${opponent.id}/edit`}
      duplicateTo="/opponents/new"
      duplicateState={{ duplicate: opponent }}
      onDelete={() => deleteOpponent.mutate(opponent.id)}
      deletePending={deleteOpponent.isPending}
      deleteDescription={t('opponents.deleteDescription')}
    />
  )

  const columns: EntityColumn<Opponent>[] = [
    {
      id: 'name',
      header: t('opponents.columns.name'),
      sortValue: (o) => fullName(o).toLowerCase(),
      cell: (o) => (
        <Link
          to={`/opponents/${o.id}`}
          className="flex items-center gap-1.5 font-medium hover:underline"
        >
          <EntityIcon value={o.icon} />
          {fullName(o)}
        </Link>
      ),
    },
    {
      id: 'nationality',
      header: t('opponents.columns.nationality'),
      sortValue: (o) => o.nationality,
      cell: (o) => o.nationality ?? '—',
    },
    {
      id: 'handedness',
      header: t('opponents.columns.handedness'),
      cell: (o) => o.handedness ?? '—',
    },
    {
      id: 'level',
      header: t('opponents.columns.level'),
      sortValue: (o) => o.level,
      cell: (o) => o.level ?? '—',
    },
  ]

  return (
    <>
      <PageHeader title={t('opponents.pageTitle')} description={t('opponents.pageDescription')} />
      <EntityList
        entityKey="opponents"
        items={opponents.data?.items ?? []}
        isPending={opponents.isPending}
        isError={opponents.isError}
        error={opponents.error}
        onRetry={() => void opponents.refetch()}
        columns={columns}
        rowActions={rowOptions}
        getSearchText={(o) => `${fullName(o)} ${o.nationality ?? ''} ${o.level ?? ''}`}
        searchPlaceholder={t('opponents.filterPlaceholder')}
        filters={{
          fields: filterFields,
          values: filterValues,
          onChange: setFilterValue,
          onRemove: removeValue,
        }}
        defaultSort={{ columnId: 'name', direction: 'asc' }}
        emptyTitle={t('opponents.emptyState.title')}
        emptyDescription={t('opponents.emptyState.description')}
        createAction={{
          label: t('opponents.addOpponent'),
          emptyLabel: t('opponents.addFirstOpponent'),
          to: '/opponents/new',
          icon: UserPlus,
        }}
        renderCard={(o) => (
          <Card className="h-full">
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <Link
                  to={`/opponents/${o.id}`}
                  className="flex items-center gap-1.5 cn-font-heading text-base font-medium hover:underline"
                >
                  <EntityIcon value={o.icon} />
                  {fullName(o)}
                </Link>
                {rowOptions(o)}
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">{t('opponents.columns.nationality')}</dt>
                  <dd>{o.nationality ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('opponents.columns.handedness')}</dt>
                  <dd>{o.handedness ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('opponents.columns.level')}</dt>
                  <dd>{o.level ?? '—'}</dd>
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

function OpponentMatches({ opponentId }: { opponentId: number }) {
  const { t } = useTranslation()
  const matches = useMatches({ opponent_id: opponentId })
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
      header: t('opponents.matches.columns.score'),
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
        <h2 className="cn-font-heading text-lg font-semibold">{t('opponents.matches.heading')}</h2>
        {matches.isPending || matches.isError ? null : (
          <p className="text-sm text-muted-foreground">
            {t('opponents.matches.recordSummary', { wins, losses, count: items.length })}
          </p>
        )}
      </div>

      {matches.isPending ? (
        <LoadingState />
      ) : matches.isError ? (
        <ErrorState error={matches.error} onRetry={() => void matches.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title={t('opponents.matches.emptyState.title')}
          description={t('opponents.matches.emptyState.description')}
        />
      ) : (
        <>
          <div
            role="group"
            aria-label={t('opponents.matches.filterByResultLabel')}
            className="flex gap-2"
          >
            {(
              [
                { value: 'all', label: t('opponents.matches.filters.all') },
                { value: 'wins', label: t('opponents.matches.filters.wins') },
                { value: 'losses', label: t('opponents.matches.filters.losses') },
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
              {t('opponents.matches.noFilterMatches')}
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

export function OpponentDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const opponentId = Number(id)
  const opponent = useOpponent(opponentId)
  const deleteOpponent = useDeleteOpponent()
  const navigate = useNavigate()
  useDocumentTitle(
    opponent.data
      ? `${opponent.data.name ?? ''} ${opponent.data.last_name}`.trim()
      : t('opponents.detail.pageTitleFallback'),
  )

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
        <Link to="/opponents">
          <ChevronLeft aria-hidden="true" data-icon="inline-start" />
          {t('opponents.detail.backToOpponents')}
        </Link>
      </Button>

      {!Number.isFinite(opponentId) ? (
        <ErrorState error={new Error(t('opponents.detail.invalidId', { id }))} />
      ) : opponent.isPending ? (
        <LoadingState />
      ) : opponent.isError ? (
        <ErrorState error={opponent.error} onRetry={() => void opponent.refetch()} />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <PageHeader
              title={
                opponent.data.name
                  ? `${opponent.data.name} ${opponent.data.last_name}`
                  : opponent.data.last_name
              }
              description={opponent.data.level ?? undefined}
              icon={opponent.data.icon}
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/opponents/${opponent.data.id}/edit`}>
                  <Pencil aria-hidden="true" data-icon="inline-start" />
                  {t('common.rowActions.edit')}
                </Link>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteOpponent.isPending}
                onClick={() => {
                  deleteOpponent.mutate(opponent.data.id, {
                    onSuccess: () => navigate('/opponents'),
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
                  <dt className="text-muted-foreground">{t('opponents.columns.nationality')}</dt>
                  <dd>{opponent.data.nationality ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('opponents.columns.handedness')}</dt>
                  <dd>{opponent.data.handedness ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('opponents.detail.ageRange')}</dt>
                  <dd>{opponent.data.age_range ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('opponents.detail.notes')}</dt>
                  <dd>{opponent.data.notes ?? '—'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <div className="mb-6">
            <OpponentHeadToHead opponentId={opponent.data.id} />
          </div>

          <OpponentMatches opponentId={opponent.data.id} />
        </>
      )}
    </>
  )
}

interface OpponentFormState {
  last_name: string
  name: string
  nationality: string
  handedness: Handedness | ''
  age_range: AgeRange | ''
  level: string
  notes: string
  icon: string | null
}

const EMPTY_FORM: OpponentFormState = {
  last_name: '',
  name: '',
  nationality: '',
  handedness: '',
  age_range: '',
  level: '',
  notes: '',
  icon: null,
}

function toFormState(opponent: Opponent): OpponentFormState {
  return {
    last_name: opponent.last_name,
    name: opponent.name ?? '',
    nationality: opponent.nationality ?? '',
    handedness: opponent.handedness ?? '',
    age_range: opponent.age_range ?? '',
    level: opponent.level ?? '',
    notes: opponent.notes ?? '',
    icon: opponent.icon,
  }
}

function toPayload(form: OpponentFormState): OpponentCreate {
  return {
    last_name: form.last_name.trim(),
    name: form.name.trim() || null,
    nationality: form.nationality.trim() || null,
    handedness: form.handedness || null,
    age_range: form.age_range || null,
    level: form.level.trim() || null,
    notes: form.notes.trim() || null,
    icon: form.icon,
  }
}

function validate(form: OpponentFormState, t: TFunction): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.last_name.trim()) errors.last_name = t('opponents.form.lastNameRequired')
  return errors
}

export function OpponentFormPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const isEdit = id !== undefined
  const opponentId = Number(id)

  useDocumentTitle(isEdit ? t('opponents.form.editTitle') : t('opponents.addOpponent'))

  const opponent = useOpponent(isEdit ? opponentId : NaN)

  if (!isEdit) return <OpponentForm mode="create" />

  if (!Number.isFinite(opponentId)) {
    return <ErrorState error={new Error(t('opponents.detail.invalidId', { id }))} />
  }
  if (opponent.isPending) return <LoadingState />
  if (opponent.isError) {
    return <ErrorState error={opponent.error} onRetry={() => void opponent.refetch()} />
  }
  return <OpponentForm mode="edit" opponent={opponent.data} />
}

function OpponentForm(props: { mode: 'create' } | { mode: 'edit'; opponent: Opponent }) {
  const { t } = useTranslation()
  const isEdit = props.mode === 'edit'
  const opponentId = isEdit ? props.opponent.id : NaN
  const navigate = useNavigate()
  const location = useLocation()
  const duplicateFrom = isEdit
    ? undefined
    : (location.state as { duplicate?: Opponent } | null)?.duplicate

  const createOpponent = useCreateOpponent()
  const updateOpponent = useUpdateOpponent(opponentId)

  const [form, setForm] = useState<OpponentFormState>(() =>
    isEdit ? toFormState(props.opponent) : duplicateFrom ? toFormState(duplicateFrom) : EMPTY_FORM,
  )
  const [touched, setTouched] = useState(false)

  const mutation = isEdit ? updateOpponent : createOpponent
  const clientErrors = validate(form, t)
  const serverErrors = fieldErrorsFromApiError(mutation.error)
  const errors = touched ? { ...serverErrors, ...clientErrors } : serverErrors
  const bannerMessage =
    mutation.isError && Object.keys(serverErrors).length === 0 ? mutation.error : null

  const backTo = isEdit ? `/opponents/${opponentId}` : '/opponents'

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (Object.keys(clientErrors).length > 0) return

    const payload = toPayload(form)
    if (isEdit) {
      updateOpponent.mutate(payload, {
        onSuccess: (updated) => navigate(`/opponents/${updated.id}`),
      })
    } else {
      createOpponent.mutate(payload, {
        onSuccess: (created) => navigate(`/opponents/${created.id}`),
      })
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
        <Link to={backTo}>
          <ChevronLeft aria-hidden="true" data-icon="inline-start" />
          {isEdit ? t('opponents.form.backToOpponent') : t('opponents.detail.backToOpponents')}
        </Link>
      </Button>

      <PageHeader
        title={isEdit ? t('opponents.form.editTitle') : t('opponents.addOpponent')}
        description={t('opponents.pageDescription')}
      />

      <Card>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <FormBanner error={bannerMessage} />

            <FormField id="icon" label={t('opponents.form.icon')} optional>
              <EntityIconPicker value={form.icon} onChange={(icon) => setForm({ ...form, icon })} />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="name"
                label={t('opponents.form.firstName')}
                optional
                error={errors.name}
              >
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  aria-invalid={Boolean(errors.name)}
                />
              </FormField>

              <FormField
                id="last_name"
                label={t('opponents.form.lastName')}
                error={errors.last_name}
              >
                <Input
                  id="last_name"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  aria-invalid={Boolean(errors.last_name)}
                  aria-describedby={errors.last_name ? 'last_name-error' : undefined}
                  required
                />
              </FormField>

              <FormField
                id="nationality"
                label={t('opponents.columns.nationality')}
                optional
                error={errors.nationality}
              >
                <CountryCombobox
                  id="nationality"
                  value={form.nationality || null}
                  onChange={(nationality) => setForm({ ...form, nationality: nationality ?? '' })}
                  aria-invalid={Boolean(errors.nationality)}
                />
              </FormField>

              <FormField
                id="level"
                label={t('opponents.columns.level')}
                optional
                error={errors.level}
              >
                <Input
                  id="level"
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value })}
                  aria-invalid={Boolean(errors.level)}
                  placeholder={t('opponents.form.levelPlaceholder')}
                />
              </FormField>

              <FormField
                id="handedness"
                label={t('opponents.columns.handedness')}
                optional
                error={errors.handedness}
              >
                <Select
                  value={form.handedness}
                  onValueChange={(value) => setForm({ ...form, handedness: value as Handedness })}
                >
                  <SelectTrigger id="handedness" className="w-full">
                    <SelectValue placeholder={t('opponents.form.handednessPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {handednessOptions(t).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                id="age_range"
                label={t('opponents.detail.ageRange')}
                optional
                error={errors.age_range}
              >
                <Select
                  value={form.age_range}
                  onValueChange={(value) => setForm({ ...form, age_range: value as AgeRange })}
                >
                  <SelectTrigger id="age_range" className="w-full">
                    <SelectValue placeholder={t('opponents.form.ageRangePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_RANGE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <FormField
              id="notes"
              label={t('opponents.detail.notes')}
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
                {isEdit ? t('opponents.form.saveChanges') : t('opponents.addOpponent')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
