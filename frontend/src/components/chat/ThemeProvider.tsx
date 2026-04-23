'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'valhalla.theme';

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* ignore */
  }
  if (window.matchMedia?.('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

interface PriorHtmlState {
  hadDarkClass: boolean;
  dataTheme: string | undefined;
  colorScheme: string;
}

function snapshotHtml(): PriorHtmlState {
  const root = document.documentElement;
  return {
    hadDarkClass: root.classList.contains('dark'),
    dataTheme: root.dataset.theme,
    colorScheme: root.style.colorScheme,
  };
}

function restoreHtml(prior: PriorHtmlState): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (prior.hadDarkClass) root.classList.add('dark');
  else root.classList.remove('dark');
  if (prior.dataTheme === undefined) delete root.dataset.theme;
  else root.dataset.theme = prior.dataTheme;
  root.style.colorScheme = prior.colorScheme;
}

function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.dataset.theme = 'dark';
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.dataset.theme = 'light';
    root.style.colorScheme = 'light';
  }
}

/**
 * Provides a light/dark theme state for the Valhalla chat shell.
 *
 * - Initial value is the system preference, overridden by localStorage.
 * - Changes are persisted to localStorage and reflected as the `dark`
 *   class on <html>, so Tailwind's `dark:` utilities pick them up.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Snapshot <html>'s existing theme-related attributes so we can
    // restore them on unmount. Without this, navigating away from the
    // /chat route (where this provider lives) would leave
    // `class="dark"`, `data-theme`, and `style.colorScheme` applied
    // globally, breaking the look of other routes that manage their
    // own theme state.
    const prior = snapshotHtml();
    const initial = readInitialTheme();
    // The initial theme has to be read on the client (localStorage +
    // matchMedia aren't available during SSR), which unavoidably means
    // a state update from an effect. Mirrors the pattern already used
    // in I18nProvider and CommandPaletteProvider.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(initial);
    applyTheme(initial);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    return () => {
      restoreHtml(prior);
    };
  }, []);

  const setTheme = useCallback((next: Theme): void => {
    setThemeState(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback((): void => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggle }),
    [theme, setTheme, toggle],
  );

  return (
    <ThemeContext.Provider value={value}>
      <div suppressHydrationWarning data-ready={mounted ? 'true' : 'false'}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within <ThemeProvider>');
  }
  return ctx;
}
