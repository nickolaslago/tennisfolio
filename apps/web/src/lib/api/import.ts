/** Data import: uploads a CSV-zip or JSON export to POST /import, which wipes and replaces all data. */
import { ApiError } from './errors'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

/** Mirrors apps/api's schemas/data_import.py ImportResult. */
export interface ImportResult {
  clubs: number
  opponents: number
  tournaments: number
  matches: number
  sets: number
  skipped: string[]
}

export async function importData(file: File): Promise<ImportResult> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE_URL}/import`, { method: 'POST', body: formData })

  const payload: unknown = await res.json().catch(() => null)

  if (!res.ok) {
    const envelope = payload as { error?: { message?: string } } | null
    throw new ApiError(res.status, envelope?.error?.message ?? res.statusText)
  }

  return payload as ImportResult
}
