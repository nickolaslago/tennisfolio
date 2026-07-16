import { computeMatchResult, formatScore, InvalidScoreError, parseScore } from '@tennisfolio/core'
import { CalendarClock, CheckCircle2, ChevronLeft, PlusCircle, Trophy } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

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
import { useDocumentTitle } from '@/lib/use-document-title'

const SURFACE_OPTIONS: Surface[] = ['Hard', 'Clay', 'Grass', 'Carpet']

function todayIso(): string {
  return new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time
}

function opponentLabel(opponent: Opponent): string {
  return opponent.name ? `${opponent.name} ${opponent.last_name}` : opponent.last_name
}

/** Merge server-fetched rows with any just-created locally, deduped by id, into select options. */
function toOptions<T extends { id: number }>(
  fetched: T[],
  extra: T[],
  label: (item: T) => string,
): EntitySelectOption[] {
  const byId = new Map<number, T>()
  for (const item of [...fetched, ...extra]) byId.set(item.id, item)
  return Array.from(byId.values()).map((item) => ({ value: String(item.id), label: label(item) }))
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
  score: string
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
    score: '',
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
    score: match.score ?? '',
    scheduleMode: false,
  }
}

/** Live, client-side read of the score field — the backend re-validates on submit. */
type ScorePreview =
  | { state: 'empty' }
  | { state: 'valid'; result: 'Win' | 'Loss'; formatted: string; setCount: number }
  | { state: 'error'; message: string }

function previewScore(score: string): ScorePreview {
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
      message: error instanceof InvalidScoreError ? error.message : 'Invalid score.',
    }
  }
}

export function MatchFormPage() {
  const { id } = useParams()
  const isComplete = id !== undefined
  const matchId = Number(id)

  useDocumentTitle(isComplete ? 'Complete match' : 'Log match')

  const match = useMatch(isComplete ? matchId : NaN)

  if (!isComplete) return <MatchForm mode="create" />

  if (!Number.isFinite(matchId)) {
    return <ErrorState error={new Error(`"${id}" is not a valid match id.`)} />
  }
  if (match.isPending) return <LoadingState />
  if (match.isError) {
    return <ErrorState error={match.error} onRetry={() => void match.refetch()} />
  }
  return <MatchForm mode="complete" match={match.data} />
}

function MatchForm(props: { mode: 'create' } | { mode: 'complete'; match: Match }) {
  const isComplete = props.mode === 'complete'

  const opponents = useOpponents()
  const clubs = useClubs()
  const tournaments = useTournaments()

  const createMatch = useCreateMatch()
  const updateMatch = useUpdateMatch(isComplete ? props.match.id : NaN)
  const mutation = isComplete ? updateMatch : createMatch

  const [form, setForm] = useState<MatchFormState>(() =>
    isComplete ? toFormState(props.match) : emptyForm(),
  )
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
  const preview = previewScore(form.score)

  // Client validation, keyed by API field name so server errors merge cleanly.
  const clientErrors: Record<string, string> = {}
  if (!form.opponentId) clientErrors.opponent_id = 'Pick an opponent.'
  if (!form.matchDate) clientErrors.match_date = 'Pick a date.'
  if (form.durationMin && (!/^\d+$/.test(form.durationMin) || Number(form.durationMin) < 1)) {
    clientErrors.duration_min = 'Duration must be a whole number of minutes.'
  }
  if (!scheduleMode) {
    if (!form.score.trim()) clientErrors.score = 'Enter a score, or switch to schedule mode.'
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
  // The score error may show before a submit attempt — as soon as the field is
  // left with unparseable content (parse-as-you-type feedback).
  const scoreError =
    fieldErrors.score ?? (scoreBlurred && !scheduleMode && preview.state === 'error'
      ? preview.message
      : undefined)

  const bannerMessage =
    mutation.isError && Object.keys(serverErrors).length === 0 && !scoreServerError
      ? mutation.error
      : null

  const backTo = '/matches'

  const setField = <K extends keyof MatchFormState>(key: K, value: MatchFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

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
      const payload: MatchUpdate = { ...base, score: form.score.trim() }
      updateMatch.mutate(payload, { onSuccess: (saved) => setSavedMatch(saved) })
    } else {
      const payload: MatchCreate = {
        ...base,
        // Omit the score entirely in schedule mode → the API stores it as scheduled.
        score: scheduleMode ? undefined : form.score.trim(),
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
          savedOpponent ? opponentLabel(savedOpponent) : `Opponent #${savedMatch.opponent_id}`
        }
        onLogAnother={isComplete ? undefined : handleLogAnother}
      />
    )
  }

  const title = isComplete ? 'Complete match' : 'Log a match'
  const description = isComplete
    ? 'Add the score to turn this scheduled match into a played result.'
    : 'Capture a whole match — opponent, sets, and the details — from one screen.'

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
        <Link to={backTo}>
          <ChevronLeft aria-hidden="true" data-icon="inline-start" />
          Back to Matches
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
                <FormField id="opponent" label="Opponent" error={fieldErrors.opponent_id}>
                  <EntitySelect
                    id="opponent"
                    value={form.opponentId}
                    onValueChange={(value) => setField('opponentId', value)}
                    options={opponentOptions}
                    placeholder="Select opponent"
                    onCreateNew={() => setOpponentDialogOpen(true)}
                    createLabel="New opponent"
                    autoFocus={!isComplete}
                    ariaInvalid={Boolean(fieldErrors.opponent_id)}
                    ariaDescribedby={fieldErrors.opponent_id ? 'opponent-error' : undefined}
                  />
                </FormField>

                <FormField id="match_date" label="Date" error={fieldErrors.match_date}>
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
                  Schedule for later — save without a score
                </label>
              ) : null}

              {scheduleMode ? (
                <div className="rounded-lg border border-dashed px-3 py-2.5 text-sm text-muted-foreground">
                  This match will be saved to your schedule. Add the score later from the Matches
                  page to see the result.
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="score">Score</Label>
                  <Input
                    id="score"
                    value={form.score}
                    onChange={(e) => setField('score', e.target.value)}
                    onBlur={() => setScoreBlurred(true)}
                    placeholder="e.g. 6-4 or 6-4 3-6 10-7"
                    autoComplete="off"
                    inputMode="numeric"
                    aria-invalid={Boolean(scoreError)}
                    aria-describedby={scoreError ? 'score-error' : 'score-hint'}
                  />
                  {scoreError ? (
                    <p id="score-error" className="text-xs text-destructive">
                      {scoreError}
                    </p>
                  ) : preview.state === 'valid' ? (
                    <p id="score-hint" className="text-xs text-muted-foreground">
                      Reads as a{' '}
                      <span
                        className={preview.result === 'Win' ? 'font-medium text-win' : 'font-medium text-loss'}
                      >
                        {preview.result}
                      </span>{' '}
                      · {preview.formatted} · {preview.setCount} set
                      {preview.setCount === 1 ? '' : 's'}
                    </p>
                  ) : (
                    <p id="score-hint" className="text-xs text-muted-foreground">
                      Your games first — one field for the whole match.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Context — club, surface, tournament, stage. */}
            <div className="flex flex-col gap-3">
              <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Where &amp; what
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id="club" label="Club" optional error={fieldErrors.club_id}>
                  <EntitySelect
                    id="club"
                    value={form.clubId}
                    onValueChange={handleClubChange}
                    options={clubOptions}
                    placeholder="Select club"
                    noneLabel="No club"
                    onCreateNew={() => setClubDialogOpen(true)}
                    createLabel="New club"
                  />
                </FormField>

                <FormField id="surface" label="Surface" optional error={fieldErrors.surface}>
                  <Select
                    value={form.surface || undefined}
                    onValueChange={(value) => setField('surface', value as Surface)}
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

                <FormField id="tournament" label="Tournament" optional error={fieldErrors.tournament_id}>
                  <EntitySelect
                    id="tournament"
                    value={form.tournamentId}
                    onValueChange={(value) => setField('tournamentId', value)}
                    options={tournamentOptions}
                    placeholder="Friendly (no tournament)"
                    noneLabel="Friendly (no tournament)"
                  />
                </FormField>

                <FormField
                  id="stage"
                  label="Stage"
                  optional
                  error={fieldErrors.stage}
                  hint="Only for tournaments — e.g. QF, SF, F"
                >
                  <Input
                    id="stage"
                    value={form.stage}
                    onChange={(e) => setField('stage', e.target.value)}
                    placeholder="e.g. QF"
                    disabled={!form.tournamentId}
                    aria-invalid={Boolean(fieldErrors.stage)}
                  />
                </FormField>
              </div>
            </div>

            {/* Details — duration, notes. */}
            <div className="flex flex-col gap-3">
              <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Details
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  id="duration_min"
                  label="Duration"
                  optional
                  error={fieldErrors.duration_min}
                  hint="In minutes"
                >
                  <Input
                    id="duration_min"
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={form.durationMin}
                    onChange={(e) => setField('durationMin', e.target.value)}
                    placeholder="e.g. 90"
                    aria-invalid={Boolean(fieldErrors.duration_min)}
                    aria-describedby={fieldErrors.duration_min ? 'duration_min-error' : undefined}
                  />
                </FormField>
              </div>

              <FormField id="notes" label="Notes" optional error={fieldErrors.notes}>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  rows={3}
                  placeholder="How it went, what to work on…"
                />
              </FormField>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" asChild>
                <Link to={backTo}>Cancel</Link>
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending
                  ? 'Saving…'
                  : isComplete
                    ? 'Save score'
                    : scheduleMode
                      ? 'Schedule match'
                      : 'Save match'}
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
  const isScheduled = match.status === 'scheduled'

  return (
    <>
      <PageHeader
        title={isScheduled ? 'Match scheduled' : 'Match saved'}
        description={
          isScheduled
            ? 'Saved to your schedule — add the score whenever it’s played.'
            : 'Here’s the result, derived from the score you entered.'
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-start gap-3">
            {isScheduled ? (
              <CalendarClock className="mt-0.5 size-6 text-highlight" aria-hidden="true" />
            ) : (
              <CheckCircle2
                className={match.result === 'Win' ? 'mt-0.5 size-6 text-win' : 'mt-0.5 size-6 text-loss'}
                aria-hidden="true"
              />
            )}
            <div className="flex flex-col gap-0.5">
              {isScheduled ? (
                <span className="cn-font-heading text-xl font-semibold text-highlight">Scheduled</span>
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
                vs {opponentName} · {match.match_date}
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
            Log another match
          </Button>
        ) : null}
        {isScheduled ? (
          <Button variant={onLogAnother ? 'outline' : 'default'} asChild>
            <Link to={`/matches/${match.id}/complete`}>
              <Trophy aria-hidden="true" data-icon="inline-start" />
              Complete with score
            </Link>
          </Button>
        ) : null}
        <Button variant="outline" asChild>
          <Link to="/matches">Back to Matches</Link>
        </Button>
      </div>
    </>
  )
}
