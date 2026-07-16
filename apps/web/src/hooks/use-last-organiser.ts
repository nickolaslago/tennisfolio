import { useCallback, useState } from 'react'

const STORAGE_KEY = 'tennisfolio:last-organiser'

function readStored(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    // Private mode / disabled storage — fall back to no remembered value.
    return ''
  }
}

/**
 * The organiser the user last submitted, persisted in localStorage so the
 * tournament form can pre-populate it on the next new tournament. Mirrors the
 * storage pattern in {@link usePersistedView}.
 */
export function useLastOrganiser() {
  const [lastOrganiser] = useState<string>(readStored)

  const rememberOrganiser = useCallback((value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    try {
      window.localStorage.setItem(STORAGE_KEY, trimmed)
    } catch {
      // Ignore write failures — remembering is best-effort.
    }
  }, [])

  return [lastOrganiser, rememberOrganiser] as const
}
