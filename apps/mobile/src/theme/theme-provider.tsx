import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';

import { themes, type ColorScheme, type Theme } from './theme';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface ThemeContextValue extends Theme {
  /** The user's stored preference — `'system'` unless they've overridden it. */
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
}

const STORAGE_KEY = 'tennisfolio:theme';

const ThemeContext = createContext<ThemeContextValue | null>(null);

async function readStoredPreference(): Promise<ThemePreference> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' || value === 'system'
      ? value
      : 'system';
  } catch {
    // Storage unavailable — fall back to the default.
    return 'system';
  }
}

/**
 * Applies the user's light/dark/system theme preference, mirroring
 * `apps/web/src/components/theme-provider.tsx`: defaults to (and keeps
 * following) the system color scheme via `useColorScheme` until the user
 * picks an explicit preference, which is then persisted in AsyncStorage
 * under the same `tennisfolio:theme` key the web app uses in localStorage.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    let cancelled = false;
    readStoredPreference().then((stored) => {
      if (!cancelled) setPreferenceState(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // Ignore write failures — the in-memory preference still applies this session.
    });
  };

  const scheme: ColorScheme =
    preference === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : preference;

  const value = useMemo<ThemeContextValue>(
    () => ({ ...themes[scheme], preference, setPreference }),
    [scheme, preference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/** The active theme (colors, radii, spacing, fonts) plus the preference controls. */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }
  return context;
}

/**
 * Forces `scheme` on a subtree regardless of the ambient preference — the RN
 * equivalent of web's scoped `.light`/`.dark` classes
 * (`apps/web/src/components/settings/theme-preview-card.tsx`), used by the
 * dev style guide to render both themes side by side.
 */
export function ThemeScope({
  scheme,
  children,
}: {
  scheme: ColorScheme;
  children: ReactNode;
}) {
  const value = useMemo<ThemeContextValue>(
    () => ({ ...themes[scheme], preference: scheme, setPreference: () => {} }),
    [scheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
