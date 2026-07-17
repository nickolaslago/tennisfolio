import { COUNTRY_NAMES } from '@tennisfolio/core'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/** Searchable country picker backed by the fixed `COUNTRY_NAMES` list — writes a clean string into the same free-text field. */
export function CountryCombobox({
  id,
  value,
  onChange,
  placeholder,
  'aria-invalid': ariaInvalid,
}: {
  id?: string
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  'aria-invalid'?: boolean
}) {
  const [open, setOpen] = useState(false)
  const { t } = useTranslation()
  const resolvedPlaceholder = placeholder ?? t('common.selectCountry')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          className={cn(
            'flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
            !value && 'text-muted-foreground',
          )}
        >
          <span className="line-clamp-1">{value ?? resolvedPlaceholder}</span>
          <ChevronDown className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder={t('common.searchCountries')} />
          <CommandList>
            <CommandEmpty>{t('common.noCountryFound')}</CommandEmpty>
            <CommandGroup>
              {COUNTRY_NAMES.map((country) => (
                <CommandItem
                  key={country}
                  value={country}
                  data-checked={value === country}
                  onSelect={() => {
                    onChange(country)
                    setOpen(false)
                  }}
                >
                  {country}
                </CommandItem>
              ))}
            </CommandGroup>
            {value ? (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value="__clear__"
                    onSelect={() => {
                      onChange(null)
                      setOpen(false)
                    }}
                    className="text-muted-foreground"
                  >
                    {t('common.clear')}
                  </CommandItem>
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
