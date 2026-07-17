import { useCallback, useState } from 'react'

const STORAGE_KEY = 'tennisfolio:timezone'

function systemTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    // Private mode / disabled storage — fall back to the default.
    return null
  }
}

/** The user's preferred IANA timezone, persisted in localStorage and defaulting to the system timezone. */
export function useTimezone() {
  const [timezone, setTimezoneState] = useState<string>(() => readStored() ?? systemTimezone())

  const setTimezone = useCallback((next: string) => {
    setTimezoneState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Ignore write failures — the in-memory state still updates for this session.
    }
  }, [])

  return [timezone, setTimezone] as const
}
