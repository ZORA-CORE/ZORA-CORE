'use client';

/**
 * Valhalla AI — Singularity Hotfix: SSR-safe dark-mode provider.
 *
 * Wraps next-themes' `ThemeProvider` with the Valhalla defaults
 * (`attribute="class"` so Tailwind's `dark:` variant works,
 * `enableSystem` so users without a stored preference follow their OS,
 * `disableTransitionOnChange` so theme switches don't animate every
 * transition on the page at once).
 *
 * Why next-themes and not our prior custom provider?
 *  - next-themes runs a tiny blocking inline script on first paint
 *    that reads `localStorage` + the system `prefers-color-scheme`
 *    BEFORE React hydrates. This is what eliminates the FOUC + the
 *    "Hydration failed because the server rendered HTML didn't match
 *    the client" warnings that the previous handcrafted provider
 *    produced whenever the initial theme differed from SSR's hard-
 *    coded default.
 *
 * Mounted at the root layout level.
 */
import { ThemeProvider as NextThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';

export function ValhallaThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="valhalla.theme"
      themes={['light', 'dark']}
    >
      {children}
    </NextThemeProvider>
  );
}
