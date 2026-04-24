'use client';

/**
 * Valhalla AI — Singularity Hotfix.
 *
 * This module used to own a bespoke theme context (localStorage + an
 * effect that applied `dark` on the `<html>` element post-hydration).
 * That design could never be SSR-clean: the server renders with one
 * theme, the client reads localStorage after mount, and React would
 * always warn about a hydration mismatch — or suppress the warning at
 * the cost of FOUC.
 *
 * It is now a thin shim over `next-themes`, whose pre-hydration inline
 * script applies the correct `class` to `<html>` BEFORE React renders.
 * The root `next-themes` `<ThemeProvider>` is mounted in
 * `src/app/layout.tsx` via `ValhallaThemeProvider`; this component is
 * retained only so legacy call sites (`<ThemeProvider>...</ThemeProvider>`
 * inside `ChatContainer`) keep working as a pass-through.
 *
 * `useTheme` mirrors the signature of our old hook (`theme`,
 * `setTheme`, `toggle`) so every existing import continues to work
 * unchanged, while delegating to `next-themes`' resolved theme for
 * correctness across system + explicit preferences.
 */
import type { ReactNode } from 'react';
import { useTheme as useNextTheme } from 'next-themes';

export type Theme = 'light' | 'dark';

/** Pass-through provider. Actual theming is handled by the root
 *  `ValhallaThemeProvider` in `src/app/layout.tsx`. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useTheme(): {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
} {
  const { resolvedTheme, theme, setTheme } = useNextTheme();
  const current: Theme = ((resolvedTheme ?? theme) === 'light' ? 'light' : 'dark');
  return {
    theme: current,
    setTheme: (t: Theme) => setTheme(t),
    toggle: () => setTheme(current === 'dark' ? 'light' : 'dark'),
  };
}
