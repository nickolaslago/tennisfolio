import { ChevronDown } from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/glass/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/glass/popover'
import { sortByLabel } from '@/lib/sort-options'
import { cn } from '@/lib/utils'

export interface SearchableSelectOption {
  /**
   * Stable value handed back through `onValueChange`. Never the empty string —
   * that is reserved for "nothing selected"; use `noneLabel` for a clear row.
   */
  value: string
  label: string
  /** Rendered ahead of the label, both in the list row and on the trigger. */
  icon?: ReactNode
}

/**
 * The one dropdown pattern used across the app: a combobox trigger styled like
 * the shadcn `SelectTrigger`, opening a Liquid Glass popover with a search
 * field, alphabetized options, and cmdk's keyboard navigation.
 *
 * Controlled by `value`/`onValueChange`, where `''` means nothing is selected.
 * Both `components/glass/popover` and `components/glass/command` are wrappers
 * around the vendored primitives, so the popover carries the same glass surface
 * `glass/select`'s content does.
 */
export function SearchableSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  noneLabel,
  searchPlaceholder,
  emptyMessage,
  disabled = false,
  autoFocus = false,
  sortOptions = true,
  className,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedby,
}: {
  id?: string
  /** Selected option value, or `''` for nothing selected. */
  value: string
  onValueChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  /** When set, renders a leading row that maps the selection back to `''`. */
  noneLabel?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  autoFocus?: boolean
  /**
   * Alphabetize the options (the default). Pass `false` only for lists whose
   * given order carries meaning — e.g. an ordinal scale like age ranges.
   */
  sortOptions?: boolean
  /** Extra classes for the trigger button. */
  className?: string
  'aria-label'?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const items = useMemo(() => {
    const ordered = sortOptions ? sortByLabel(options, (option) => option.label) : options
    // cmdk identifies (and searches) rows by their `value`, so two options
    // sharing a label would shadow each other — disambiguate the later ones
    // with their own option value, which is unique by contract.
    const seen = new Set<string>()
    return ordered.map((option) => {
      const search = seen.has(option.label) ? `${option.label} ${option.value}` : option.label
      seen.add(option.label)
      return { option, search }
    })
  }, [options, sortOptions])

  const selected = value === '' ? undefined : options.find((option) => option.value === value)
  // With a "none" row the empty value is a real choice, so it reads back on the
  // trigger; otherwise an empty (or not-yet-loaded) value shows the placeholder.
  const showPlaceholder = selected === undefined && (value !== '' || noneLabel === undefined)

  const select = (next: string) => {
    onValueChange(next)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedby}
          autoFocus={autoFocus}
          disabled={disabled}
          className={cn(
            'flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
            showPlaceholder && 'text-muted-foreground',
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {selected?.icon}
            <span className="line-clamp-1">
              {selected
                ? selected.label
                : showPlaceholder
                  ? (placeholder ?? t('common.searchableSelect.placeholder'))
                  : noneLabel}
            </span>
          </span>
          <ChevronDown className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder ?? t('common.searchableSelect.searchPlaceholder')}
          />
          <CommandList>
            <CommandEmpty>{emptyMessage ?? t('common.searchableSelect.noResults')}</CommandEmpty>
            <CommandGroup>
              {noneLabel !== undefined ? (
                <CommandItem
                  value={noneLabel}
                  data-checked={value === ''}
                  onSelect={() => select('')}
                >
                  {noneLabel}
                </CommandItem>
              ) : null}
              {items.map(({ option, search }) => (
                <CommandItem
                  key={option.value}
                  value={search}
                  data-checked={value === option.value}
                  onSelect={() => select(option.value)}
                >
                  {option.icon}
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
