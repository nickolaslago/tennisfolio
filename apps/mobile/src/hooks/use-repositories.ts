/**
 * How a screen gets at the data layer.
 *
 * The database is opened and migrated once per launch (`@/db/database`), so
 * this hook is really "await that, then hand back the repositories". It reports
 * the three states a screen has to render anyway — opening, failed, ready —
 * rather than throwing a promise, so the first paint is not blocked on disk.
 *
 * Screens use the returned object and nothing else; SQL never crosses this
 * boundary.
 */
import { useEffect, useState } from 'react';

import { getDatabase } from '@/db/database';
import { createRepositories, type Repositories } from '@/lib/repositories';

export interface RepositoriesState {
  repositories: Repositories | null;
  /** True until the database is open and migrated. */
  loading: boolean;
  /** Set when opening or migrating failed; the app is unusable until resolved. */
  error: Error | null;
}

export function useRepositories(): RepositoriesState {
  const [state, setState] = useState<RepositoriesState>({
    repositories: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    getDatabase()
      .then((db) => {
        if (active) setState({ repositories: createRepositories(db), loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            repositories: null,
            loading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
