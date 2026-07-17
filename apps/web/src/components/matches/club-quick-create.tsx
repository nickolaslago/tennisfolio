import { Plus, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FormBanner, FormField } from '@/components/data/entity-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateClub } from '@/hooks/use-clubs'
import type { Club, CourtInput, Environment, Surface } from '@/lib/api/clubs'
import { fieldErrorsFromApiError } from '@/lib/api/form-errors'

const SURFACE_OPTIONS: Surface[] = ['Hard', 'Clay', 'Grass', 'Carpet']
const ENVIRONMENT_OPTIONS: Environment[] = ['Indoor', 'Outdoor']

interface CourtRow {
  surface: Surface | ''
  environment: Environment | ''
}

const EMPTY_COURT: CourtRow = { surface: '', environment: '' }

/**
 * Inline "＋ new club" quick-create. Capturing at least one court here means the
 * match form can offer it (and auto-select it) the moment the freshly created
 * club is selected. The full club form lives on the Clubs page.
 */
export function ClubQuickCreate({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (club: Club) => void
}) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('matches.clubQuickCreate.title')}</DialogTitle>
          <DialogDescription>{t('matches.clubQuickCreate.description')}</DialogDescription>
        </DialogHeader>
        {/* Body remounts on each open, so its state starts fresh — no reset effect. */}
        {open ? (
          <ClubQuickCreateForm onCreated={onCreated} onCancel={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function environmentLabel(environment: Environment, t: ReturnType<typeof useTranslation>['t']) {
  return environment === 'Indoor'
    ? t('clubs.form.environmentIndoor')
    : t('clubs.form.environmentOutdoor')
}

function ClubQuickCreateForm({
  onCreated,
  onCancel,
}: {
  onCreated: (club: Club) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const createClub = useCreateClub()
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [courts, setCourts] = useState<CourtRow[]>([{ ...EMPTY_COURT }])
  const [touched, setTouched] = useState(false)

  const missingName = !name.trim()
  const completeCourts = courts.filter((court) => court.surface && court.environment)
  const partialCourt = courts.some(
    (court) => (court.surface && !court.environment) || (!court.surface && court.environment),
  )
  const courtsError =
    completeCourts.length === 0
      ? t('clubs.form.courtsRequired')
      : partialCourt
        ? t('clubs.form.courtIncomplete')
        : undefined

  const serverErrors = fieldErrorsFromApiError(createClub.error)
  const nameError =
    touched && missingName ? t('matches.clubQuickCreate.nameRequired') : serverErrors.name
  const bannerMessage =
    createClub.isError && Object.keys(serverErrors).length === 0 ? createClub.error : null

  const updateCourt = (index: number, patch: Partial<CourtRow>) =>
    setCourts((prev) => prev.map((court, i) => (i === index ? { ...court, ...patch } : court)))
  const addCourt = () => setCourts((prev) => [...prev, { ...EMPTY_COURT }])
  const removeCourt = (index: number) => setCourts((prev) => prev.filter((_, i) => i !== index))

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (missingName || courtsError) return

    const payload: CourtInput[] = completeCourts.map((court) => ({
      surface: court.surface as Surface,
      environment: court.environment as Environment,
    }))
    createClub.mutate(
      { name: name.trim(), city: city.trim() || null, courts: payload },
      { onSuccess: (club) => onCreated(club) },
    )
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <FormBanner error={bannerMessage} />

      <FormField id="quick-club-name" label={t('matches.clubQuickCreate.name')} error={nameError}>
        <Input
          id="quick-club-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(nameError)}
          aria-describedby={nameError ? 'quick-club-name-error' : undefined}
          autoFocus
          required
        />
      </FormField>

      <FormField id="quick-club-city" label={t('matches.clubQuickCreate.city')} optional>
        <Input id="quick-club-city" value={city} onChange={(e) => setCity(e.target.value)} />
      </FormField>

      <div className="flex flex-col gap-2">
        <Label>{t('clubs.form.courts')}</Label>
        <div className="flex flex-col gap-2">
          {courts.map((court, index) => (
            <div key={index} className="flex items-center gap-2">
              <Select
                value={court.surface || undefined}
                onValueChange={(value) => updateCourt(index, { surface: value as Surface })}
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
                onValueChange={(value) => updateCourt(index, { environment: value as Environment })}
              >
                <SelectTrigger className="w-full" aria-label={t('clubs.columns.environment')}>
                  <SelectValue placeholder={t('clubs.form.environmentPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {ENVIRONMENT_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {environmentLabel(option, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => removeCourt(index)}
                disabled={courts.length === 1}
                aria-label={t('clubs.form.removeCourt')}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
        {touched && courtsError ? <p className="text-xs text-destructive">{courtsError}</p> : null}
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={addCourt}>
          <Plus aria-hidden="true" data-icon="inline-start" />
          {t('clubs.form.addCourt')}
        </Button>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={createClub.isPending}>
          {createClub.isPending
            ? t('matches.clubQuickCreate.adding')
            : t('matches.clubQuickCreate.addClub')}
        </Button>
      </DialogFooter>
    </form>
  )
}
