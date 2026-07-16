import { Plus } from 'lucide-react'

import { EntityIcon } from '@/components/data/entity-icon'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface EntitySelectOption {
  value: string
  label: string
  icon?: string | null
}

/** Non-empty sentinel — Radix Select item values can't be an empty string. */
const NONE_VALUE = '__none__'

/**
 * Labeled Select for picking one related entity, with an optional adjacent
 * "＋" button that opens an inline quick-create dialog (see the match entry
 * form). `value` is the selected id as a string, or `''` for nothing selected.
 */
export function EntitySelect({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  noneLabel,
  onCreateNew,
  createLabel,
  autoFocus,
  ariaInvalid,
  ariaDescribedby,
}: {
  id: string
  value: string
  onValueChange: (value: string) => void
  options: EntitySelectOption[]
  placeholder: string
  /** When set, renders a leading "clear selection" row that maps back to `''`. */
  noneLabel?: string
  onCreateNew?: () => void
  createLabel?: string
  autoFocus?: boolean
  ariaInvalid?: boolean
  ariaDescribedby?: string
}) {
  // An unmatched value keeps the trigger showing its placeholder; when a
  // `noneLabel` row exists, map the empty selection onto it so it reads back.
  const radixValue = value === '' ? (noneLabel ? NONE_VALUE : undefined) : value
  const selectedOption = options.find((option) => option.value === value)

  const handleValueChange = (next: string) => {
    // Radix's hidden native <select> emits a spurious empty-string change right
    // after the controlled value is set to a just-mounted item. None of our real
    // items ever carry an empty value (the "none" row uses NONE_VALUE), so an
    // empty payload is never a genuine selection — ignore it.
    if (next === '') return
    onValueChange(next === NONE_VALUE ? '' : next)
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={radixValue} onValueChange={handleValueChange}>
        <SelectTrigger
          id={id}
          className="w-full flex-1"
          autoFocus={autoFocus}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedby}
        >
          <SelectValue placeholder={placeholder}>
            {selectedOption ? (
              <>
                <EntityIcon value={selectedOption.icon} />
                {selectedOption.label}
              </>
            ) : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {noneLabel ? <SelectItem value={NONE_VALUE}>{noneLabel}</SelectItem> : null}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <EntityIcon value={option.icon} />
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {onCreateNew ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          aria-label={createLabel ?? 'Add new'}
          title={createLabel ?? 'Add new'}
          onClick={onCreateNew}
        >
          <Plus aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  )
}
