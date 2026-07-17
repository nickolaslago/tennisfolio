import {
  computeMatchResult,
  formatScore,
  InvalidScoreError,
  parseScore,
  SCORE_FORMAT_OPTIONS,
  type ScoredSet,
  type ScoreFormat,
  type ScoreFormatOption,
} from '@tennisfolio/core'
import { CalendarClock, CheckCircle2, ChevronLeft, PlusCircle, Trophy } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

import { FormBanner, FormField } from '@/components/data/entity-form'
import { ErrorState, LoadingState } from '@/components/data/query-state'
import { PageHeader } from '@/components/layout/page-header'
import { ClubQuickCreate } from '@/components/matches/club-quick-create'
import { EntitySelect, type EntitySelectOption } from '@/components/matches/entity-select'
import { OpponentQuickCreate } from '@/components/matches/opponent-quick-create'
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
import { Textarea } from '@/components/ui/textarea'
import { useClubs } from '@/hooks/use-clubs'
import { useCreateMatch, useMatch, useUpdateMatch } from '@/hooks/use-matches'
import { useOpponents } from '@/hooks/use-opponents'
import { useTournaments } from '@/hooks/use-tournaments'
import { ApiError } from '@/lib/api/errors'
import type { Club } from '@/lib/api/clubs'
import { fieldErrorsFromApiError } from '@/lib/api/form-errors'
import type { Match, MatchCreate, MatchUpdate, Surface } from '@/lib/api/matches'
import type { Opponent } from '@/lib/api/opponents'
import { sortByLabel } from '@/lib/sort-options'
import { useDocumentTitle } from '@/lib/use-document-title'

const SURFACE_OPTIONS: Surface[] = ['Hard', 'Clay', 'Grass', 'Carpet']

const DEFAULT_SCORE_FORMAT: ScoreFormat = 'three-sets'
const MAX_SCORE_PAIRS = 5

/** A single games/points pair from the structured score fields, kept as raw text. */
interface ScorePair {
  won: string
  lost: string
}

/** A full set of blank pairs — we always hold the max and slice by the format. */
function emptyPairs(): ScorePair[] {
  return Array.from({ length: MAX_SCORE_PAIRS }, () => ({ won: '', lost: '' }))
}

function formatOptionFor(value: ScoreFormat): ScoreFormatOption {
  return SCORE_FORMAT_OPTIONS.find((option) => option.value === value) ?? SCORE_FORMAT_OPTIONS[0]
}

/** Picks the scoring type that best represents a parsed score, for edit prefill. */
function detectScoreFormat(sets: ScoredSet[]): ScoreFormat {
  if (sets.length >= 4) return 'five-sets'
  if (sets.length >= 2) return 'three-sets'
  const [only] = sets
  if (only.tiebreak && Math.max(only.gamesWon, only.gamesLost) >= 10) return 'super-tiebreak'
  if (only.tiebreak) return 'tiebreak'
  return 'one-set'
}

/** Splits a stored score string into a format + prefilled fields for editing. */
function scoreToStructured(score: string | null | undefined): {
  scoreFormat: ScoreFormat
  scorePairs: ScorePair[]
} {
  const scorePairs = emptyPairs()
  if (!score || !score.trim()) {
    return { scoreFormat: DEFAULT_SCORE_FORMAT, scorePairs }
  }
  try {
    const sets = parseScore(score)
    sets.forEach((set, index) => {
      if (index < scorePairs.length) {
        scorePairs[index] = { won: String(set.gamesWon), lost: String(set.gamesLost) }
      }
    })
    return { scoreFormat: detectScoreFormat(sets), scorePairs }
  } catch {
    // A stored score should always re-parse, but if it somehow doesn't, keep the
    // first token editable under Custom rather than dropping it silently.
    const [first = ''] = score.trim().split(/\s+/)
    const [won = '', lost = ''] = first.split('-')
    scorePairs[0] = { won: won.replace(/\D/g, ''), lost: lost.replace(/\D/g, '') }
    return { scoreFormat: 'custom', scorePairs }
  }
}

type StructuredScore = { score: string } | { error: string }

/**
 * Builds the canonical score string ("6-4 3-6 10-7") from the structured
 * fields, or reports a structural problem the parser can't (a half-filled pair,
 * or a gap before a filled set). The result string is still handed to
 * {@link parseScore} for the real tennis validation.
 */
function readStructuredScore(
  option: ScoreFormatOption,
  pairs: ScorePair[],
  t: TFunction,
): StructuredScore {
  const unit =
    option.kind === 'sets'
      ? t('matchForm.validation.units.set')
      : t('matchForm.validation.units.score')
  const tokens: string[] = []
  let sawEmpty = false
  for (const pair of pairs.slice(0, option.pairs)) {
    const won = pair.won.trim()
    const lost = pair.lost.trim()
    if (won === '' && lost === '') {
      sawEmpty = true
      continue
    }
    if (won === '' || lost === '') {
      return { error: t('matchForm.validation.fillBothNumbers', { unit }) }
    }
    if (sawEmpty) {
      return { error: t('matchForm.validation.trailingOnly') }
    }
    tokens.push(`${won}-${lost}`)
  }
  return { score: tokens.join(' ') }
}

function todayIso(): string {
  return new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time
}

function opponentLabel(opponent: Opponent): string {
  return opponent.name ? `${opponent.name} ${opponent.last_name}` : opponent.last_name
}

/**
 * Merge server-fetched rows with any just-created locally, deduped by id, into
 * select options sorted alphabetically by label.
 */
function toOptions<T extends { id: number; icon: string | null }>(
  fetched: T[],
  extra: T[],
  label: (item: T) => string,
): EntitySelectOption[] {
  const byId = new Map<number, T>()
  for (const item of [...fetched, ...extra]) byId.set(item.id, item)
  const options = Array.from(byId.values()).map((item) => ({
    value: String(item.id),
    label: label(item),
    icon: item.icon,
  }))
  return sortByLabel(options, (option) => option.label)
}

interface MatchFormState {
  opponentId: string
  clubId: string
  tournamentId: string
  stage: string
  surface: Surface | ''
  matchDate: string
  durationMin: string
  notes: string
  scoreFormat: ScoreFormat
  scorePairs: ScorePair[]
  scheduleMode: boolean
}

function emptyForm(): MatchFormState {
  return {
    opponentId: '',
    clubId: '',
    tournamentId: '',
    stage: '',
    surface: '',
    matchDate: todayIso(),
    durationMin: '',
    notes: '',
    scoreFormat: DEFAULT_SCORE_FORMAT,
    scorePairs: emptyPairs(),
    scheduleMode: false,
  }
}

function toFormState(match: Match): MatchFormState {
  return {
    opponentId: String(match.opponent_id),
    clubId: match.club_id !== null ? String(match.club_id) : '',
    tournamentId: match.tournament_id !== null ? String(match.tournament_id) : '',
    stage: match.stage ?? '',
    surface: match.surface ?? '',
    matchDate: match.match_date,
    durationMin: match.duration_min !== null ? String(match.duration_min) : '',
    notes: match.notes ?? '',
    ...scoreToStructured(match.score),
    scheduleMode: false,
  }
}

/** Live, client-side read of the score field — the backend re-validates on submit. */
type ScorePreview =
  | { state: 'empty' }
  | { state: 'valid'; result: 'Win' | 'Loss'; formatted: string; setCount: number }
  | { state: 'error'; message: string }

function previewScore(score: string, t: TFunction): ScorePreview {
  if (!score.trim()) return { state: 'empty' }
  try {
    const sets = parseScore(score)
    return {
      state: 'valid',
      result: computeMatchResult(sets),
      formatted: formatScore(sets),
      setCount: sets.length,
    }
  } catch (error) {
    return {
      state: 'error',
      message:
        error instanceof InvalidScoreError ? error.message : t('matchForm.validation.invalidScore'),
    }
  }
}

export function MatchFormPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const isComplete = id !== undefined
  const matchId = Number(id)

  useDocumentTitle(isComplete ? t('matchForm.titles.complete') : t('matchForm.pageTitleLog'))

  const match = useMatch(isComplete ? matchId : NaN)

  if (!isComplete) return <MatchForm mode="create" />

  if (!Number.isFinite(matchId)) {
    return <ErrorState error={new Error(t('matchForm.invalidId', { id }))} />
  }
  if (match.isPending) return <LoadingState />
  if (match.isError) {
    return <ErrorState error={match.error} onRetry={() => void match.refetch()} />
  }
  return <MatchForm mode="complete" match={match.data} />
}

function MatchForm(props: { mode: 'create' } | { mode: 'complete'; match: Match }) {
  const { t } = useTranslation()
  const isComplete = props.mode === 'complete'
  const location = useLocation()
  const duplicateFrom = isComplete
    ? undefined
    : (location.state as { duplicate?: Match } | null)?.duplicate

  const opponents = useOpponents()
  const clubs = useClubs()
  const tournaments = useTournaments()

  const createMatch = useCreateMatch()
  const updateMatch = useUpdateMatch(isComplete ? props.match.id : NaN)
  const mutation = isComplete ? updateMatch : createMatch

  const [form, setForm] = useState<MatchFormState>(() => {
    if (isComplete) return toFormState(props.match)
    if (duplicateFrom) {
      return { ...toFormState(duplicateFrom), scheduleMode: duplicateFrom.status === 'scheduled' }
    }
    return emptyForm()
  })
  const [touched, setTouched] = useState(false)
  const [scoreBlurred, setScoreBlurred] = useState(false)
  const [savedMatch, setSavedMatch] = useState<Match | null>(null)

  const [opponentDialogOpen, setOpponentDialogOpen] = useState(false)
  const [clubDialogOpen, setClubDialogOpen] = useState(false)
  // Entities created inline this session — merged into the dropdowns so the new
  // pick shows its label instantly, without waiting on the list refetch.
  const [extraOpponents, setExtraOpponents] = useState<Opponent[]>([])
  const [extraClubs, setExtraClubs] = useState<Club[]>([])

  const opponentOptions = useMemo(
    () => toOptions(opponents.data?.items ?? [], extraOpponents, opponentLabel),
    [opponents.data, extraOpponents],
  )
  const clubOptions = useMemo(
    () => toOptions(clubs.data?.items ?? [], extraClubs, (c) => c.name),
    [clubs.data, extraClubs],
  )
  const tournamentOptions = useMemo(
    () => toOptions(tournaments.data?.items ?? [], [], (t) => t.name),
    [tournaments.data],
  )

  const allClubs = useMemo(
    () => [...(clubs.data?.items ?? []), ...extraClubs],
    [clubs.data, extraClubs],
  )
  const allOpponents = useMemo(
    () => [...(opponents.data?.items ?? []), ...extraOpponents],
    [opponents.data, extraOpponents],
  )

  const scheduleMode = !isComplete && form.scheduleMode
  const scoreFormatOption = formatOptionFor(form.scoreFormat)
  const structuredScore = readStructuredScore(scoreFormatOption, form.scorePairs, t)
  const scoreString = 'score' in structuredScore ? structuredScore.score : ''
  const structuredError = 'error' in structuredScore ? structuredScore.error : undefined
  const preview = previewScore(scoreString, t)

  // Client validation, keyed by API field name so server errors merge cleanly.
  const clientErrors: Record<string, string> = {}
  if (!form.opponentId) clientErrors.opponent_id = t('matchForm.validation.pickOpponent')
  if (!form.matchDate) clientErrors.match_date = t('matchForm.validation.pickDate')
  if (form.durationMin && (!/^\d+$/.test(form.durationMin) || Number(form.durationMin) < 1)) {
    clientErrors.duration_min = t('matchForm.validation.durationWhole')
  }
  if (!scheduleMode) {
    if (structuredError) clientErrors.score = structuredError
    else if (!scoreString.trim())
      clientErrors.score = t('matchForm.validation.enterScoreOrSchedule')
    else if (preview.state === 'error') clientErrors.score = preview.message
  }

  const serverErrors = fieldErrorsFromApiError(mutation.error)
  // A score-parse rejection comes back as a 422 with a plain message and no
  // per-field details — pin it under the score field rather than the banner.
  const scoreServerError =
    mutation.error instanceof ApiError &&
    mutation.error.status === 422 &&
    Object.keys(serverErrors).length === 0
      ? mutation.error.message
      : undefined

  const fieldErrors: Record<string, string> = {
    ...serverErrors,
    ...(scoreServerError ? { score: scoreServerError } : {}),
    ...(touched ? clientErrors : {}),
  }
  // The score error may show before a submit attempt — as soon as a field is
  // left with unparseable content (parse-as-you-type feedback).
  const liveScoreError =
    structuredError ?? (preview.state === 'error' ? preview.message : undefined)
  const scoreError =
    fieldErrors.score ?? (scoreBlurred && !scheduleMode ? liveScoreError : undefined)

  const bannerMessage =
    mutation.isError && Object.keys(serverErrors).length === 0 && !scoreServerError
      ? mutation.error
      : null

  const backTo = isComplete ? `/matches/${props.match.id}` : '/matches'

  const setField = <K extends keyof MatchFormState>(key: K, value: MatchFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const setScorePair = (index: number, side: 'won' | 'lost', value: string) =>
    setForm((prev) => ({
      ...prev,
      scorePairs: prev.scorePairs.map((pair, i) =>
        i === index ? { ...pair, [side]: value } : pair,
      ),
    }))

  const handleClubChange = (value: string) => {
    const club = allClubs.find((c) => String(c.id) === value)
    setForm((prev) => ({
      ...prev,
      clubId: value,
      // Pre-fill the surface from the club, but never wipe an existing choice.
      surface: club?.surface ?? prev.surface,
    }))
  }

  const handleOpponentCreated = (opponent: Opponent) => {
    setExtraOpponents((prev) => [...prev, opponent])
    setField('opponentId', String(opponent.id))
    setOpponentDialogOpen(false)
  }

  const handleClubCreated = (club: Club) => {
    setExtraClubs((prev) => [...prev, club])
    setForm((prev) => ({
      ...prev,
      clubId: String(club.id),
      surface: club.surface ?? prev.surface,
    }))
    setClubDialogOpen(false)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    setScoreBlurred(true)
    if (Object.keys(clientErrors).length > 0) return

    const base = {
      match_date: form.matchDate,
      opponent_id: Number(form.opponentId),
      club_id: form.clubId ? Number(form.clubId) : null,
      tournament_id: form.tournamentId ? Number(form.tournamentId) : null,
      stage: form.stage.trim() || null,
      surface: form.surface || null,
      duration_min: form.durationMin ? Number(form.durationMin) : null,
      notes: form.notes.trim() || null,
    }

    if (isComplete) {
      const payload: MatchUpdate = { ...base, score: scoreString }
      updateMatch.mutate(payload, { onSuccess: (saved) => setSavedMatch(saved) })
    } else {
      const payload: MatchCreate = {
        ...base,
        // Omit the score entirely in schedule mode → the API stores it as scheduled.
        score: scheduleMode ? undefined : scoreString,
      }
      createMatch.mutate(payload, { onSuccess: (saved) => setSavedMatch(saved) })
    }
  }

  const handleLogAnother = () => {
    setForm(emptyForm())
    setTouched(false)
    setScoreBlurred(false)
    setSavedMatch(null)
    createMatch.reset()
  }

  if (savedMatch) {
    const savedOpponent = allOpponents.find((o) => o.id === savedMatch.opponent_id)
    return (
      <SavedMatchPanel
        match={savedMatch}
        opponentName={
          savedOpponent
            ? opponentLabel(savedOpponent)
            : t('matchForm.opponentFallback', { id: savedMatch.opponent_id })
        }
        onLogAnother={isComplete ? undefined : handleLogAnother}
      />
    )
  }

  const isEditingPlayed = isComplete && props.match.status === 'played'
  const title = isComplete
    ? isEditingPlayed
      ? t('matchForm.titles.edit')
      : t('matchForm.titles.complete')
    : t('matchForm.titles.log')
  const description = isComplete
    ? isEditingPlayed
      ? t('matchForm.descriptions.edit')
      : t('matchForm.descriptions.complete')
    : t('matchForm.descriptions.log')

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
        <Link to={backTo}>
          <ChevronLeft aria-hidden="true" data-icon="inline-start" />
          {isComplete ? t('matchForm.backToMatch') : t('matchForm.backToMatches')}
        </Link>
      </Button>

      <PageHeader title={title} description={description} />

      <Card>
        <CardContent>
          <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
            <FormBanner error={bannerMessage} />

            {/* Essentials — opponent, date, and the score (or schedule toggle). */}
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  id="opponent"
                  label={t('matches.columns.opponent')}
                  error={fieldErrors.opponent_id}
                >
                  <EntitySelect
                    id="opponent"
                    value={form.opponentId}
                    onValueChange={(value) => setField('opponentId', value)}
                    options={opponentOptions}
                    placeholder={t('matchForm.fields.opponentPlaceholder')}
                    onCreateNew={() => setOpponentDialogOpen(true)}
                    createLabel={t('matchForm.fields.newOpponent')}
                    autoFocus={!isComplete}
                    ariaInvalid={Boolean(fieldErrors.opponent_id)}
                    ariaDescribedby={fieldErrors.opponent_id ? 'opponent-error' : undefined}
                  />
                </FormField>

                <FormField
                  id="match_date"
                  label={t('matches.columns.date')}
                  error={fieldErrors.match_date}
                >
                  <Input
                    id="match_date"
                    type="date"
                    value={form.matchDate}
                    max={scheduleMode ? undefined : todayIso()}
                    onChange={(e) => setField('matchDate', e.target.value)}
                    aria-invalid={Boolean(fieldErrors.match_date)}
                    aria-describedby={fieldErrors.match_date ? 'match_date-error' : undefined}
                    required
                  />
                </FormField>
              </div>

              {!isComplete ? (
                <label className="flex w-fit items-center gap-2 text-sm font-medium select-none">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={form.scheduleMode}
                    onChange={(e) => setField('scheduleMode', e.target.checked)}
                  />
                  <CalendarClock className="size-4 text-muted-foreground" aria-hidden="true" />
                  {t('matchForm.fields.scheduleToggle')}
                </label>
              ) : null}

              {scheduleMode ? (
                <div className="rounded-lg border border-dashed px-3 py-2.5 text-sm text-muted-foreground">
                  {t('matchForm.fields.scheduleModeNotice')}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="score-format">{t('matchForm.fields.scoringType')}</Label>
                    <Select
                      value={form.scoreFormat}
                      onValueChange={(value) => setField('scoreFormat', value as ScoreFormat)}
                    >
                      <SelectTrigger id="score-format" className="w-full sm:w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCORE_FORMAT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2">
                    {scoreFormatOption.kind === 'sets' ? (
                      form.scorePairs
                        .slice(0, scoreFormatOption.pairs)
                        .map((pair, index) => (
                          <ScorePairRow
                            key={index}
                            rowLabel={t('matchForm.fields.setLabel', { n: index + 1 })}
                            wonLabel={t('matchForm.fields.setGamesWonLabel', { n: index + 1 })}
                            lostLabel={t('matchForm.fields.setGamesLostLabel', { n: index + 1 })}
                            optional={scoreFormatOption.pairs > 1 && index > 0}
                            pair={pair}
                            invalid={Boolean(scoreError)}
                            describedBy={scoreError ? 'score-error' : 'score-hint'}
                            onChange={(side, value) => setScorePair(index, side, value)}
                            onBlur={() => setScoreBlurred(true)}
                          />
                        ))
                    ) : (
                      <ScorePairRow
                        rowLabel={t('matchForm.fields.pointsLabel')}
                        wonLabel={t('matchForm.fields.pointsWonLabel')}
                        lostLabel={t('matchForm.fields.pointsLostLabel')}
                        pair={form.scorePairs[0]}
                        invalid={Boolean(scoreError)}
                        describedBy={scoreError ? 'score-error' : 'score-hint'}
                        onChange={(side, value) => setScorePair(0, side, value)}
                        onBlur={() => setScoreBlurred(true)}
                      />
                    )}
                  </div>

                  {scoreError ? (
                    <p id="score-error" className="text-xs text-destructive">
                      {scoreError}
                    </p>
                  ) : preview.state === 'valid' ? (
                    <p id="score-hint" className="text-xs text-muted-foreground">
                      {t('matchForm.scorePreview.prefix')}{' '}
                      <span
                        className={
                          preview.result === 'Win'
                            ? 'font-medium text-win'
                            : 'font-medium text-loss'
                        }
                      >
                        {preview.result}
                      </span>{' '}
                      ·{' '}
                      {t('matchForm.scorePreview.summary', {
                        count: preview.setCount,
                        formatted: preview.formatted,
                      })}
                    </p>
                  ) : (
                    <p id="score-hint" className="text-xs text-muted-foreground">
                      {t('matchForm.fields.scoreHintDefault')}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Context — club, surface, tournament, stage. */}
            <div className="flex flex-col gap-3">
              <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t('matchForm.sections.whereAndWhat')}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  id="club"
                  label={t('matches.columns.club')}
                  optional
                  error={fieldErrors.club_id}
                >
                  <EntitySelect
                    id="club"
                    value={form.clubId}
                    onValueChange={handleClubChange}
                    options={clubOptions}
                    placeholder={t('matchForm.fields.clubPlaceholder')}
                    noneLabel={t('matchForm.fields.noClub')}
                    onCreateNew={() => setClubDialogOpen(true)}
                    createLabel={t('matchForm.fields.newClub')}
                  />
                </FormField>

                <FormField
                  id="surface"
                  label={t('matches.columns.surface')}
                  optional
                  error={fieldErrors.surface}
                >
                  <Select
                    value={form.surface || undefined}
                    onValueChange={(value) => setField('surface', value as Surface)}
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
                  id="tournament"
                  label={t('matches.columns.tournament')}
                  optional
                  error={fieldErrors.tournament_id}
                >
                  <EntitySelect
                    id="tournament"
                    value={form.tournamentId}
                    onValueChange={(value) => setField('tournamentId', value)}
                    options={tournamentOptions}
                    placeholder={t('matchForm.fields.friendlyNoTournament')}
                    noneLabel={t('matchForm.fields.friendlyNoTournament')}
                  />
                </FormField>

                <FormField
                  id="stage"
                  label={t('matchForm.fields.stage')}
                  optional
                  error={fieldErrors.stage}
                  hint={t('matchForm.fields.stageHint')}
                >
                  <Input
                    id="stage"
                    value={form.stage}
                    onChange={(e) => setField('stage', e.target.value)}
                    placeholder={t('matchForm.fields.stagePlaceholder')}
                    disabled={!form.tournamentId}
                    aria-invalid={Boolean(fieldErrors.stage)}
                  />
                </FormField>
              </div>
            </div>

            {/* Details — duration, notes. */}
            <div className="flex flex-col gap-3">
              <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t('matchForm.sections.details')}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  id="duration_min"
                  label={t('matchForm.fields.duration')}
                  optional
                  error={fieldErrors.duration_min}
                  hint={t('matchForm.fields.durationHint')}
                >
                  <Input
                    id="duration_min"
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={form.durationMin}
                    onChange={(e) => setField('durationMin', e.target.value)}
                    placeholder={t('matchForm.fields.durationPlaceholder')}
                    aria-invalid={Boolean(fieldErrors.duration_min)}
                    aria-describedby={fieldErrors.duration_min ? 'duration_min-error' : undefined}
                  />
                </FormField>
              </div>

              <FormField
                id="notes"
                label={t('matchForm.fields.notes')}
                optional
                error={fieldErrors.notes}
              >
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  rows={3}
                  placeholder={t('matchForm.fields.notesPlaceholder')}
                />
              </FormField>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" asChild>
                <Link to={backTo}>{t('common.cancel')}</Link>
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending
                  ? t('matchForm.actions.saving')
                  : isComplete
                    ? t('matchForm.actions.saveScore')
                    : scheduleMode
                      ? t('matchForm.actions.scheduleMatch')
                      : t('matchForm.actions.saveMatch')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <OpponentQuickCreate
        open={opponentDialogOpen}
        onOpenChange={setOpponentDialogOpen}
        onCreated={handleOpponentCreated}
      />
      <ClubQuickCreate
        open={clubDialogOpen}
        onOpenChange={setClubDialogOpen}
        onCreated={handleClubCreated}
      />
    </>
  )
}

/** One row of the structured score entry: a labelled won/lost numeric pair. */
function ScorePairRow({
  rowLabel,
  wonLabel,
  lostLabel,
  pair,
  invalid,
  optional,
  describedBy,
  onChange,
  onBlur,
}: {
  rowLabel: string
  wonLabel: string
  lostLabel: string
  pair: ScorePair
  invalid: boolean
  optional?: boolean
  describedBy?: string
  onChange: (side: 'won' | 'lost', value: string) => void
  onBlur: () => void
}) {
  const { t } = useTranslation()
  // Games/points are one or two digits — keep the fields strictly numeric.
  const sanitize = (value: string) => value.replace(/\D/g, '').slice(0, 2)
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-sm font-medium text-muted-foreground">{rowLabel}</span>
      <Input
        aria-label={wonLabel}
        value={pair.won}
        onChange={(e) => onChange('won', sanitize(e.target.value))}
        onBlur={onBlur}
        inputMode="numeric"
        autoComplete="off"
        className="w-16 text-center"
        aria-invalid={invalid}
        aria-describedby={describedBy}
      />
      <span aria-hidden="true" className="text-muted-foreground">
        –
      </span>
      <Input
        aria-label={lostLabel}
        value={pair.lost}
        onChange={(e) => onChange('lost', sanitize(e.target.value))}
        onBlur={onBlur}
        inputMode="numeric"
        autoComplete="off"
        className="w-16 text-center"
        aria-invalid={invalid}
        aria-describedby={describedBy}
      />
      {optional ? (
        <span className="text-xs text-muted-foreground">{t('matchForm.fields.setOptional')}</span>
      ) : null}
    </div>
  )
}

/** Post-save confirmation: the derived result shown immediately, per the acceptance criteria. */
function SavedMatchPanel({
  match,
  opponentName,
  onLogAnother,
}: {
  match: Match
  opponentName: string
  onLogAnother?: () => void
}) {
  const { t } = useTranslation()
  const isScheduled = match.status === 'scheduled'

  return (
    <>
      <PageHeader
        title={
          isScheduled
            ? t('matchForm.savedPanel.scheduledTitle')
            : t('matchForm.savedPanel.savedTitle')
        }
        description={
          isScheduled
            ? t('matchForm.savedPanel.scheduledDescription')
            : t('matchForm.savedPanel.savedDescription')
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-start gap-3">
            {isScheduled ? (
              <CalendarClock className="mt-0.5 size-6 text-highlight" aria-hidden="true" />
            ) : (
              <CheckCircle2
                className={
                  match.result === 'Win' ? 'mt-0.5 size-6 text-win' : 'mt-0.5 size-6 text-loss'
                }
                aria-hidden="true"
              />
            )}
            <div className="flex flex-col gap-0.5">
              {isScheduled ? (
                <span className="cn-font-heading text-xl font-semibold text-highlight">
                  {t('matches.tabs.scheduled')}
                </span>
              ) : (
                <span
                  className={
                    match.result === 'Win'
                      ? 'cn-font-heading text-xl font-semibold text-win'
                      : 'cn-font-heading text-xl font-semibold text-loss'
                  }
                >
                  {match.result}
                  {match.score ? <span className="ml-2 text-foreground">{match.score}</span> : null}
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                {t('matchForm.savedPanel.vsOpponentAndDate', {
                  opponent: opponentName,
                  date: match.match_date,
                })}
              </span>
            </div>
          </div>

          {match.sets.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {match.sets.map((set) => (
                <span
                  key={set.set_no}
                  className={
                    set.result === 'Win'
                      ? 'inline-flex items-center gap-1 rounded-md bg-win/10 px-2 py-1 text-sm font-medium text-win'
                      : 'inline-flex items-center gap-1 rounded-md bg-loss/10 px-2 py-1 text-sm font-medium text-loss'
                  }
                >
                  {set.games_won}-{set.games_lost}
                  {set.tiebreak ? <sup className="text-[0.65rem]">TB</sup> : null}
                </span>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-wrap gap-2">
        {onLogAnother ? (
          <Button onClick={onLogAnother}>
            <PlusCircle aria-hidden="true" data-icon="inline-start" />
            {t('matchForm.savedPanel.logAnother')}
          </Button>
        ) : null}
        {isScheduled ? (
          <Button variant={onLogAnother ? 'outline' : 'default'} asChild>
            <Link to={`/matches/${match.id}/complete`}>
              <Trophy aria-hidden="true" data-icon="inline-start" />
              {t('matches.setScore')}
            </Link>
          </Button>
        ) : null}
        <Button variant="outline" asChild>
          <Link to={`/matches/${match.id}`}>{t('matchForm.backToMatch')}</Link>
        </Button>
      </div>
    </>
  )
}
