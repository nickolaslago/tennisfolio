/** Data export: downloads the /export/csv and /export/json files from the API. */
import { ApiError } from './errors'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

const FILENAME_PATTERN = /filename="?([^";]+)"?/

async function downloadFile(path: string, fallbackFilename: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}${path}`)

  if (!res.ok) {
    const payload: unknown = await res.json().catch(() => null)
    const envelope = payload as { error?: { message?: string } } | null
    throw new ApiError(res.status, envelope?.error?.message ?? res.statusText)
  }

  const disposition = res.headers.get('content-disposition') ?? ''
  const filename = FILENAME_PATTERN.exec(disposition)?.[1] ?? fallbackFilename

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function downloadCsvExport(): Promise<void> {
  return downloadFile('/export/csv', 'tennisfolio-export.zip')
}

export function downloadJsonExport(): Promise<void> {
  return downloadFile('/export/json', 'tennisfolio-export.json')
}
