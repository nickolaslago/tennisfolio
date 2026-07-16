import { Download, FileJson, FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'

import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { downloadCsvExport, downloadJsonExport } from '@/lib/api/export'
import { useDocumentTitle } from '@/lib/use-document-title'

type DownloadKind = 'csv' | 'json'

export function ExportPage() {
  useDocumentTitle('Export')
  const [pending, setPending] = useState<DownloadKind | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async (kind: DownloadKind) => {
    setPending(kind)
    setError(null)
    try {
      await (kind === 'csv' ? downloadCsvExport() : downloadJsonExport())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed.')
    } finally {
      setPending(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Export"
        description="Download every match, opponent, club and tournament you've recorded — no lock-in, take your data with you any time."
      />

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
              CSV (zipped)
            </CardTitle>
            <CardDescription>
              Five CSV files — clubs, opponents, tournaments, matches, sets — zipped together. Uses
              the same column layout the seed importer accepts, so it can be re-imported as-is.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void handleDownload('csv')} disabled={pending !== null}>
              <Download aria-hidden="true" data-icon="inline-start" />
              {pending === 'csv' ? 'Preparing…' : 'Download CSV'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson aria-hidden="true" className="size-4" />
              JSON
            </CardTitle>
            <CardDescription>
              A single JSON file with every table, matches nested with their sets. Best for
              scripting or feeding into another tool.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => void handleDownload('json')}
              disabled={pending !== null}
            >
              <Download aria-hidden="true" data-icon="inline-start" />
              {pending === 'json' ? 'Preparing…' : 'Download JSON'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        See{' '}
        <a
          href="https://github.com/nickolaslago/tennisfolio/blob/main/docs/data-export.md"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          docs/data-export.md
        </a>{' '}
        for the full schema of both formats.
      </p>
    </>
  )
}
