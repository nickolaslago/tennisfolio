import { useCallback, useState } from 'react'

export type ViewMode = 'table' | 'card'

const storageKey = (entityKey: string) => `tennisfolio:entity-view:${entityKey}`

function readStored(entityKey: string): ViewMode | null {
  try {
    const value = window.localStorage.getItem(storageKey(entityKey))
    return value === 'table' || value === 'card' ? value : null
  } catch {
    // Private mode / disabled storage — fall back to the default.
    return null
  }
}

/**
 * View-mode toggle state persisted per entity in localStorage. Each entity list
 * remembers whether the user last looked at it as a table or as cards.
 */
export function usePersistedView(entityKey: string, defaultView: ViewMode = 'table') {
  const [view, setViewState] = useState<ViewMode>(() => readStored(entityKey) ?? defaultView)

  const setView = useCallback(
    (next: ViewMode) => {
      setViewState(next)
      try {
        window.localStorage.setItem(storageKey(entityKey), next)
      } catch {
        // Ignore write failures — the in-memory state still updates for this session.
      }
    },
    [entityKey],
  )

  return [view, setView] as const
}
