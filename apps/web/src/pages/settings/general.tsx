import { useTranslation } from 'react-i18next'

import { Card, CardContent } from '@/components/glass/card'
import { TimezoneCombobox } from '@/components/settings/timezone-combobox'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui-ext/searchable-select'
import { useTimezone } from '@/hooks/use-timezone'
import { SettingsSection } from '@/pages/settings/settings-section'
import i18n from '@/i18n'

const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'it', label: 'Italiano' },
  { value: 'nl', label: 'Nederlands' },
]

export function GeneralSettingsPage() {
  const { t } = useTranslation()
  const [timezone, setTimezone] = useTimezone()

  return (
    <SettingsSection
      title={t('settings.general.title')}
      description={t('settings.general.description')}
    >
      <Card>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-timezone">{t('settings.general.timezone')}</Label>
            <TimezoneCombobox id="settings-timezone" value={timezone} onChange={setTimezone} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-language">{t('settings.general.language')}</Label>
            <SearchableSelect
              id="settings-language"
              value={i18n.language}
              onValueChange={(value) => void i18n.changeLanguage(value)}
              options={LANGUAGE_OPTIONS}
            />
          </div>
        </CardContent>
      </Card>
    </SettingsSection>
  )
}
