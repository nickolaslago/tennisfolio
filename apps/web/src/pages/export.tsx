import { Download, FileJson, FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { downloadCsvExport, downloadJsonExport } from '@/lib/api/export'
import { useDocumentTitle } from '@/lib/use-document-title'

type DownloadKind = 'csv' | 'json'

export function ExportPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('export.pageTitle'))
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
    <>
      <PageHeader title={t('export.pageTitle')} description={t('export.pageDescription')} />

      {error ? (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
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

      <p className="mt-6 text-sm text-muted-foreground">
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
    </>
  )
}
