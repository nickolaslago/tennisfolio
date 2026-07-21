import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { AccentContext, type Accent } from '@/hooks/use-accent'

const STORAGE_KEY = 'tennisfolio:accent'

function readStoredAccent(): Accent {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === 'clay' || value === 'grass' || value === 'hard' ? value : 'clay'
  } catch {
    // Private mode / disabled storage — fall back to the default.
    return 'clay'
  }
}

function applyAccent(accent: Accent) {
  // index.css re-points the accent-driven tokens (--primary, --accent, --ring,
  // --highlight and their sidebar/-foreground pairs) off this attribute.
  document.documentElement.dataset.accent = accent
}

/** Applies the user's accent-colour preference to the document and keeps it persisted. */
export function AccentProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState<Accent>(() => readStoredAccent())

  useEffect(() => {
    applyAccent(accent)
  }, [accent])

  const value = useMemo(
    () => ({
      accent,
      setAccent: (next: Accent) => {
        setAccentState(next)
        try {
          window.localStorage.setItem(STORAGE_KEY, next)
        } catch {
          // Ignore write failures — the in-memory state still updates for this session.
        }
      },
    }),
    [accent],
  )

  return <AccentContext.Provider value={value}>{children}</AccentContext.Provider>
}
