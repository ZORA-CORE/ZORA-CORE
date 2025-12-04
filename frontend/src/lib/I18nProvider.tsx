'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

import enCommon from '@/locales/en/common.json';
import daCommon from '@/locales/da/common.json';

export type Locale = 'en' | 'da';

type TranslationDict = typeof enCommon;

const DICTIONARIES: Record<Locale, TranslationDict> = {
  en: enCommon,
  da: daCommon,
};

const LOCALE_STORAGE_KEY = 'zora-locale';

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  
  return typeof current === 'string' ? current : undefined;
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
  dict: TranslationDict;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  children: React.ReactNode;
  defaultLocale?: Locale;
}

export function I18nProvider({ children, defaultLocale = 'en' }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
    if (stored && (stored === 'en' || stored === 'da')) {
      setLocaleState(stored);
    }
    setIsHydrated(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    document.documentElement.lang = newLocale;
  }, []);

  const dict = useMemo(() => DICTIONARIES[locale], [locale]);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const value = getNestedValue(dict as unknown as Record<string, unknown>, key);
      return value ?? fallback ?? key;
    },
    [dict]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, dict }),
    [locale, setLocale, t, dict]
  );

  if (!isHydrated) {
    return (
      <I18nContext.Provider value={{ locale: defaultLocale, setLocale: () => {}, t: (key) => key, dict: DICTIONARIES[defaultLocale] }}>
        {children}
      </I18nContext.Provider>
    );
  }

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={() => setLocale('en')}
        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
          locale === 'en'
            ? 'bg-[var(--z-emerald-soft)] text-[var(--z-emerald)]'
            : 'text-[var(--z-text-tertiary)] hover:text-[var(--z-text-secondary)]'
        }`}
        title={t('language.en')}
      >
        EN
      </button>
      <button
        onClick={() => setLocale('da')}
        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
          locale === 'da'
            ? 'bg-[var(--z-emerald-soft)] text-[var(--z-emerald)]'
            : 'text-[var(--z-text-tertiary)] hover:text-[var(--z-text-secondary)]'
        }`}
        title={t('language.da')}
      >
        DA
      </button>
    </div>
  );
}

export default I18nProvider;
