/** Delete-all-data: wipes every user-data table via DELETE /data. */
import { ApiError } from './errors'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export async function deleteAllData(): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/data`, { method: 'DELETE' })

  if (!res.ok) {
    const payload: unknown = await res.json().catch(() => null)
    const envelope = payload as { error?: { message?: string } } | null
    throw new ApiError(res.status, envelope?.error?.message ?? res.statusText)
  }
}
