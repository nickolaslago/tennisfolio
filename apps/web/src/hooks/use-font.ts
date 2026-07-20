import { createContext, useContext } from 'react'

export type Font = 'sans' | 'serif' | 'mono'

export interface FontContextValue {
  font: Font
  setFont: (font: Font) => void
}

export const FontContext = createContext<FontContextValue | null>(null)

/** The user's font preference and setter — must be used within `<FontProvider>`. */
export function useFont(): FontContextValue {
  const context = useContext(FontContext)
  if (!context) {
    throw new Error('useFont must be used within a FontProvider')
  }
  return context
}
