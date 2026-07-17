import {
  Download,
  FileJson,
  FileSpreadsheet,
  Monitor,
  Moon,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/layout/page-header'
import { TimezoneCombobox } from '@/components/settings/timezone-combobox'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTheme, type Theme } from '@/hooks/use-theme'
import { useTimezone } from '@/hooks/use-timezone'
import { downloadCsvExport, downloadJsonExport } from '@/lib/api/export'
import { useDocumentTitle } from '@/lib/use-document-title'
import i18n from '@/i18n'

const LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
]

const THEME_OPTIONS: { value: Theme; labelKey: string; icon: LucideIcon }[] = [
  { value: 'light', labelKey: 'settings.appearance.themeLight', icon: Sun },
  { value: 'dark', labelKey: 'settings.appearance.themeDark', icon: Moon },
  { value: 'system', labelKey: 'settings.appearance.themeSystem', icon: Monitor },
]

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="cn-font-heading text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

function GeneralSection() {
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

function AppearanceSection() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()

  return (
    <SettingsSection
      title={t('settings.appearance.title')}
      description={t('settings.appearance.description')}
    >
      <Card>
        <CardContent className="flex flex-col gap-2">
          <Label>{t('settings.appearance.theme')}</Label>
          <RadioGroup
            value={theme}
            onValueChange={(value) => setTheme(value as Theme)}
            className="flex flex-col gap-3 sm:flex-row sm:gap-6"
          >
            {THEME_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center gap-2">
                <RadioGroupItem value={option.value} id={`settings-theme-${option.value}`} />
                <Label
                  htmlFor={`settings-theme-${option.value}`}
                  className="flex items-center gap-1.5 font-normal"
                >
                  <option.icon aria-hidden="true" className="size-4 text-muted-foreground" />
                  {t(option.labelKey)}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>
    </SettingsSection>
  )
}

type DownloadKind = 'csv' | 'json'

function BackupExportSection() {
  const { t } = useTranslation()
  const [pending, setPending] = useState<DownloadKind | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async (kind: DownloadKind) => {
    setPending(kind)
    setError(null)
    try {
      await (kind === 'csv' ? downloadCsvExport() : downloadJsonExport())
    } catch (err) {
      setError(err instanceof Error ? err.message : t('export.downloadFailed'))
    } finally {
      setPending(null)
    }
  }

  return (
    <SettingsSection
      title={t('settings.backupExport.title')}
      description={t('settings.backupExport.description')}
    >
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet aria-hidden="true" className="size-4" />
              {t('export.csv.title')}
            </CardTitle>
            <CardDescription>{t('export.csv.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void handleDownload('csv')} disabled={pending !== null}>
              <Download aria-hidden="true" data-icon="inline-start" />
              {pending === 'csv' ? t('export.preparing') : t('export.csv.download')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson aria-hidden="true" className="size-4" />
              {t('export.json.title')}
            </CardTitle>
            <CardDescription>{t('export.json.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => void handleDownload('json')}
              disabled={pending !== null}
            >
              <Download aria-hidden="true" data-icon="inline-start" />
              {pending === 'json' ? t('export.preparing') : t('export.json.download')}
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">
        {t('export.footerPrefix')}{' '}
        <a
          href="https://github.com/nickolaslago/tennisfolio/blob/main/docs/data-export.md"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          docs/data-export.md
        </a>{' '}
        {t('export.footerSuffix')}
      </p>
    </SettingsSection>
  )
}

export function SettingsPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('settings.pageTitle'))

  return (
    <>
      <PageHeader title={t('settings.pageTitle')} description={t('settings.pageDescription')} />
      <div className="flex flex-col gap-8">
        <GeneralSection />
        <AppearanceSection />
        <BackupExportSection />
      </div>
    </>
  )
}
