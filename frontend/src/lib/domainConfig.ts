import type { Locale } from './I18nProvider';

export interface DomainConfig {
  defaultLocale: Locale;
  theme: 'nordic-dark' | 'nordic-light';
  region: 'eu' | 'global';
  brandVariant?: 'default' | 'dk';
}

const DOMAIN_CONFIGS: Record<string, DomainConfig> = {
  'zora-core.dk': {
    defaultLocale: 'da',
    theme: 'nordic-dark',
    region: 'eu',
    brandVariant: 'dk',
  },
  'www.zora-core.dk': {
    defaultLocale: 'da',
    theme: 'nordic-dark',
    region: 'eu',
    brandVariant: 'dk',
  },
  'zora-core.com': {
    defaultLocale: 'en',
    theme: 'nordic-dark',
    region: 'global',
    brandVariant: 'default',
  },
  'www.zora-core.com': {
    defaultLocale: 'en',
    theme: 'nordic-dark',
    region: 'global',
    brandVariant: 'default',
  },
  'localhost': {
    defaultLocale: 'en',
    theme: 'nordic-dark',
    region: 'global',
    brandVariant: 'default',
  },
  'localhost:3000': {
    defaultLocale: 'en',
    theme: 'nordic-dark',
    region: 'global',
    brandVariant: 'default',
  },
};

const DEFAULT_CONFIG: DomainConfig = {
  defaultLocale: 'en',
  theme: 'nordic-dark',
  region: 'global',
  brandVariant: 'default',
};

export function getDomainConfig(hostname: string | null): DomainConfig {
  if (!hostname) return DEFAULT_CONFIG;
  
  const normalizedHost = hostname.toLowerCase().replace(/:\d+$/, '');
  
  if (normalizedHost.endsWith('.dk')) {
    return DOMAIN_CONFIGS['zora-core.dk'] || { ...DEFAULT_CONFIG, defaultLocale: 'da' as Locale };
  }
  
  return DOMAIN_CONFIGS[hostname] || DOMAIN_CONFIGS[normalizedHost] || DEFAULT_CONFIG;
}

export function getDefaultLocaleFromHostname(hostname: string | null): Locale {
  return getDomainConfig(hostname).defaultLocale;
}

export function isDanishDomain(hostname: string | null): boolean {
  if (!hostname) return false;
  return hostname.toLowerCase().includes('.dk');
}

export { DOMAIN_CONFIGS, DEFAULT_CONFIG };
