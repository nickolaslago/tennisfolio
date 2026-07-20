import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { FontContext, type Font } from '@/hooks/use-font'

const STORAGE_KEY = 'tennisfolio:font'

function readStoredFont(): Font {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === 'sans' || value === 'serif' || value === 'mono' ? value : 'sans'
  } catch {
    // Private mode / disabled storage — fall back to the default.
    return 'sans'
  }
}

function applyFont(font: Font) {
  // index.css re-points --font-app (and with it --font-sans/--font-heading)
  // off this attribute; the absence of the attribute means the sans default.
  if (font === 'sans') {
    delete document.documentElement.dataset.font
  } else {
    document.documentElement.dataset.font = font
  }
}

/** Applies the user's font-family preference to the document and keeps it persisted. */
export function FontProvider({ children }: { children: ReactNode }) {
  const [font, setFontState] = useState<Font>(() => readStoredFont())

  useEffect(() => {
    applyFont(font)
  }, [font])

  const value = useMemo(
    () => ({
      font,
      setFont: (next: Font) => {
        setFontState(next)
        try {
          window.localStorage.setItem(STORAGE_KEY, next)
        } catch {
          // Ignore write failures — the in-memory state still updates for this session.
        }
      },
    }),
    [font],
  )

  return <FontContext.Provider value={value}>{children}</FontContext.Provider>
}
