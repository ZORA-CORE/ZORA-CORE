'use client';

/**
 * RootThemeProvider \u2014 app-wide next-themes wrapper.
 *
 * Wraps the entire app in `next-themes`' ThemeProvider with
 * `attribute="class"` so Tailwind's `dark:` utilities pick up the
 * current theme as a class on <html>. `disableTransitionOnChange`
 * prevents the brief flash-of-incorrect-theme on route transitions,
 * and `enableSystem` lets the OS setting drive the initial choice
 * before the user explicitly toggles.
 *
 * The local chat ThemeProvider (components/chat/ThemeProvider.tsx)
 * continues to manage the `dark` class on /chat; next-themes is the
 * SSR-safe source of truth for every other route.
 */
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

export function RootThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
