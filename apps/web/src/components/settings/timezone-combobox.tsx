import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { SearchableSelect } from '@/components/ui-ext/searchable-select'

const TIMEZONES: string[] = Intl.supportedValuesOf('timeZone')

/** Searchable IANA timezone picker, backed by every zone the runtime supports. */
export function TimezoneCombobox({
  id,
  value,
  onChange,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
}) {
  const { t } = useTranslation()
  // Underscores are an IANA storage detail — search and read the zones as words.
  // `supportedValuesOf` omits a few zones a runtime still resolves to (notably
  // "UTC"), so fold the current value in to keep it selected and readable.
  const options = useMemo(() => {
    const zones = TIMEZONES.includes(value) || value === '' ? TIMEZONES : [...TIMEZONES, value]
    return zones.map((zone) => ({ value: zone, label: zone.replaceAll('_', ' ') }))
  }, [value])

  return (
    <SearchableSelect
      id={id}
      value={value}
      onValueChange={onChange}
      options={options}
      searchPlaceholder={t('settings.general.searchTimezone')}
      emptyMessage={t('settings.general.noTimezoneFound')}
    />
  )
}
