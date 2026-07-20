import { useTranslation } from 'react-i18next'

import { Card, CardContent } from '@/components/glass/card'
import { PreferenceCard, PreferenceCardGroup } from '@/components/settings/preference-card'
import { ThemePreviewCard } from '@/components/settings/theme-preview-card'
import { Label } from '@/components/ui/label'
import { useFont, type Font } from '@/hooks/use-font'
import { useTheme, type Theme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'
import { SettingsSection } from '@/pages/settings/settings-section'

const THEME_OPTIONS: { value: Theme; labelKey: string }[] = [
  { value: 'light', labelKey: 'settings.appearance.themeLight' },
  { value: 'dark', labelKey: 'settings.appearance.themeDark' },
  { value: 'system', labelKey: 'settings.appearance.themeSystem' },
]

const FONT_OPTIONS: { value: Font; labelKey: string; fontClass: string }[] = [
  { value: 'sans', labelKey: 'settings.appearance.fontSans', fontClass: 'font-option-sans' },
  { value: 'serif', labelKey: 'settings.appearance.fontSerif', fontClass: 'font-option-serif' },
  { value: 'mono', labelKey: 'settings.appearance.fontMono', fontClass: 'font-option-mono' },
]

export function AppearanceSettingsPage() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const { font, setFont } = useFont()

  return (
    <SettingsSection
      title={t('settings.appearance.title')}
      description={t('settings.appearance.description')}
    >
      <Card>
        <CardContent className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <div>
              <Label id="settings-font-label">{t('settings.appearance.fontFamily')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settings.appearance.fontFamilyDescription')}
              </p>
            </div>
            <PreferenceCardGroup
              aria-labelledby="settings-font-label"
              value={font}
              onValueChange={(value) => setFont(value as Font)}
            >
              {FONT_OPTIONS.map((option) => (
                <PreferenceCard
                  key={option.value}
                  value={option.value}
                  title={t(option.labelKey)}
                  className="h-20"
                >
                  <span
                    className={cn(
                      'flex h-full items-center justify-center bg-background text-3xl text-foreground',
                      option.fontClass,
                    )}
                  >
                    Aa
                  </span>
                </PreferenceCard>
              ))}
            </PreferenceCardGroup>
            <p className="w-full max-w-md rounded-lg border bg-background px-4 py-3 text-sm text-muted-foreground">
              {t('settings.appearance.fontPreview')}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <Label id="settings-theme-label">{t('settings.appearance.theme')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('settings.appearance.themeDescription')}
              </p>
            </div>
            <PreferenceCardGroup
              aria-labelledby="settings-theme-label"
              value={theme}
              onValueChange={(value) => setTheme(value as Theme)}
            >
              {THEME_OPTIONS.map((option) => (
                <ThemePreviewCard
                  key={option.value}
                  theme={option.value}
                  title={t(option.labelKey)}
                />
              ))}
            </PreferenceCardGroup>
          </div>
        </CardContent>
      </Card>
    </SettingsSection>
  )
}
