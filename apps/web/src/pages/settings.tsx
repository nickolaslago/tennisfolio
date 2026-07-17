import {
  Download,
  FileJson,
  FileSpreadsheet,
  Monitor,
  Moon,
  Sun,
  Upload,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ChangeEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/layout/page-header'
import { TimezoneCombobox } from '@/components/settings/timezone-combobox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { importData, type ImportResult } from '@/lib/api/import'
import { useDocumentTitle } from '@/lib/use-document-title'
import i18n from '@/i18n'

const LANGUAGE_OPTIONS: { code: string; label: string }[] = [{ code: 'en', label: 'English' }]

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

function ImportSubsection() {
  const { t } = useTranslation()
  // The file input is remounted (via this key) to clear its selected file —
  // it's a plain function component (not forwardRef), so a ref can't reach
  // its DOM node to reset `.value` directly.
  const [fileInputKey, setFileInputKey] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  const resetFileInput = () => {
    setFile(null)
    setFileInputKey((key) => key + 1)
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null
    setError(null)
    setResult(null)
    if (selected) {
      setFile(selected)
      setConfirmOpen(true)
    }
  }

  const handleConfirm = async () => {
    if (!file) return
    setConfirmOpen(false)
    setPending(true)
    try {
      setResult(await importData(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('import.importFailed'))
    } finally {
      setPending(false)
      resetFileInput()
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t pt-5">
      <div>
        <h3 className="flex items-center gap-2 font-medium">
          <Upload aria-hidden="true" className="size-4" />
          {t('import.title')}
        </h3>
        <p className="text-sm text-muted-foreground">{t('import.description')}</p>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      {result ? (
        <div
          role="status"
          className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm"
        >
          <p className="font-medium">{t('import.successTitle')}</p>
          <p className="text-muted-foreground">
            {t('import.successSummary', {
              clubs: result.clubs,
              opponents: result.opponents,
              tournaments: result.tournaments,
              matches: result.matches,
              sets: result.sets,
            })}
          </p>
          {result.skipped.length > 0 ? (
            <p className="text-muted-foreground">
              {t('import.successSkipped', { count: result.skipped.length })}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5 sm:max-w-sm">
        <Label htmlFor="settings-import-file">{t('import.filePickerLabel')}</Label>
        <Input
          key={fileInputKey}
          id="settings-import-file"
          type="file"
          accept=".json,.zip,application/json,application/zip"
          onChange={handleFileChange}
          disabled={pending}
        />
      </div>
      {pending ? <p className="text-sm text-muted-foreground">{t('import.importing')}</p> : null}

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open)
          if (!open) resetFileInput()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('import.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('import.confirmDescription', { filename: file?.name ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirm()}>
              {t('import.confirmAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
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

      <ImportSubsection />
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
