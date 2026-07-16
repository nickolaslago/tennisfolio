import { type FormEvent, useState } from 'react'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateClub } from '@/hooks/use-clubs'
import type { Club, Surface } from '@/lib/api/clubs'
import { fieldErrorsFromApiError } from '@/lib/api/form-errors'

const SURFACE_OPTIONS: Surface[] = ['Hard', 'Clay', 'Grass', 'Carpet']

/**
 * Inline "＋ new club" quick-create. Capturing the surface here means the match
 * form can pre-fill it the moment the freshly created club is selected. The
 * full club form lives on the Clubs page.
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New club</DialogTitle>
          <DialogDescription>
            Add just enough to log the match — the surface pre-fills once you pick this club.
          </DialogDescription>
        </DialogHeader>
        {/* Body remounts on each open, so its state starts fresh — no reset effect. */}
        {open ? (
          <ClubQuickCreateForm onCreated={onCreated} onCancel={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function ClubQuickCreateForm({
  onCreated,
  onCancel,
}: {
  onCreated: (club: Club) => void
  onCancel: () => void
}) {
  const createClub = useCreateClub()
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [surface, setSurface] = useState<Surface | ''>('')
  const [touched, setTouched] = useState(false)

  const missingName = !name.trim()
  const serverErrors = fieldErrorsFromApiError(createClub.error)
  const nameError = touched && missingName ? 'Name is required.' : serverErrors.name
  const bannerMessage =
    createClub.isError && Object.keys(serverErrors).length === 0 ? createClub.error : null

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (missingName) return

    createClub.mutate(
      { name: name.trim(), city: city.trim() || null, surface: surface || null },
      { onSuccess: (club) => onCreated(club) },
    )
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <FormBanner error={bannerMessage} />

      <FormField id="quick-club-name" label="Name" error={nameError}>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="quick-club-surface" label="Surface" optional>
          <Select value={surface || undefined} onValueChange={(value) => setSurface(value as Surface)}>
            <SelectTrigger id="quick-club-surface" className="w-full">
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

        <FormField id="quick-club-city" label="City" optional>
          <Input id="quick-club-city" value={city} onChange={(e) => setCity(e.target.value)} />
        </FormField>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={createClub.isPending}>
          {createClub.isPending ? 'Adding…' : 'Add club'}
        </Button>
      </DialogFooter>
    </form>
  )
}
