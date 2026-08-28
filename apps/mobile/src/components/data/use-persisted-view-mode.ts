import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export type ViewMode = 'card' | 'compact';

const storageKey = (entityKey: string) =>
  `tennisfolio:entity-view:${entityKey}`;

/**
 * View-mode toggle state persisted per entity in AsyncStorage, mirroring
 * `apps/web/src/hooks/use-persisted-view.ts`'s localStorage-backed hook: each
 * entity list remembers whether the user last looked at it as cards or as a
 * compact/table layout.
 */
export function usePersistedViewMode(
  entityKey: string,
  defaultView: ViewMode = 'card',
) {
  const [view, setViewState] = useState<ViewMode>(defaultView);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(storageKey(entityKey))
      .then((stored) => {
        if (!cancelled && (stored === 'card' || stored === 'compact')) {
          setViewState(stored);
        }
      })
      .catch(() => {
        // Storage unavailable — keep the default.
      });
    return () => {
      cancelled = true;
    };
  }, [entityKey]);

  const setView = useCallback(
    (next: ViewMode) => {
      setViewState(next);
      AsyncStorage.setItem(storageKey(entityKey), next).catch(() => {
        // Ignore write failures — the in-memory state still updates for this session.
      });
    },
    [entityKey],
  );

  return [view, setView] as const;
}
