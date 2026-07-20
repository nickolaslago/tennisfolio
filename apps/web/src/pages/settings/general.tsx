import { useTranslation } from 'react-i18next'

import { Card, CardContent } from '@/components/glass/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/glass/select'
import { TimezoneCombobox } from '@/components/settings/timezone-combobox'
import { Label } from '@/components/ui/label'
import { useTimezone } from '@/hooks/use-timezone'
import { SettingsSection } from '@/pages/settings/settings-section'
import i18n from '@/i18n'

const LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
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
            <Select
              value={i18n.language}
              onValueChange={(value) => void i18n.changeLanguage(value)}
            >
              <SelectTrigger id="settings-language" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((language) => (
                  <SelectItem key={language.code} value={language.code}>
                    {language.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </SettingsSection>
  )
}
