import { createContext, useContext } from 'react'

export type Accent = 'clay' | 'grass' | 'hard'

export interface AccentContextValue {
  accent: Accent
  setAccent: (accent: Accent) => void
}

export const AccentContext = createContext<AccentContextValue | null>(null)

/** The user's accent-colour preference and setter — must be used within `<AccentProvider>`. */
export function useAccent(): AccentContextValue {
  const context = useContext(AccentContext)
  if (!context) {
    throw new Error('useAccent must be used within an AccentProvider')
  }
  return context
}
