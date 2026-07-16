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
import { useCreateOpponent } from '@/hooks/use-opponents'
import { fieldErrorsFromApiError } from '@/lib/api/form-errors'
import type { Opponent } from '@/lib/api/opponents'

/**
 * Inline "＋ new opponent" quick-create — a dialog so the match entry form is
 * never navigated away from. On success the new opponent is handed back so the
 * caller can select it immediately. The full opponent form (with every field)
 * still lives on the Opponents page.
 */
export function OpponentQuickCreate({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (opponent: Opponent) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New opponent</DialogTitle>
          <DialogDescription>
            Add just enough to log the match — you can fill in the rest later.
          </DialogDescription>
        </DialogHeader>
        {/* Body lives in its own component so its state resets each time the
            dialog is reopened (it unmounts on close) — no reset effect needed. */}
        {open ? (
          <OpponentQuickCreateForm onCreated={onCreated} onCancel={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function OpponentQuickCreateForm({
  onCreated,
  onCancel,
}: {
  onCreated: (opponent: Opponent) => void
  onCancel: () => void
}) {
  const createOpponent = useCreateOpponent()
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [touched, setTouched] = useState(false)

  const missingLastName = !lastName.trim()
  const serverErrors = fieldErrorsFromApiError(createOpponent.error)
  const lastNameError =
    touched && missingLastName ? 'Last name is required.' : serverErrors.last_name
  const bannerMessage =
    createOpponent.isError && Object.keys(serverErrors).length === 0 ? createOpponent.error : null

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (missingLastName) return

    createOpponent.mutate(
      { last_name: lastName.trim(), name: firstName.trim() || null },
      { onSuccess: (opponent) => onCreated(opponent) },
    )
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <FormBanner error={bannerMessage} />

      <FormField id="quick-opponent-first-name" label="First name" optional>
        <Input
          id="quick-opponent-first-name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          autoFocus
        />
      </FormField>

      <FormField id="quick-opponent-last-name" label="Last name" error={lastNameError}>
        <Input
          id="quick-opponent-last-name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          aria-invalid={Boolean(lastNameError)}
          aria-describedby={lastNameError ? 'quick-opponent-last-name-error' : undefined}
          required
        />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={createOpponent.isPending}>
          {createOpponent.isPending ? 'Adding…' : 'Add opponent'}
        </Button>
      </DialogFooter>
    </form>
  )
}
