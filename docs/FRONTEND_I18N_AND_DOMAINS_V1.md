# ZORA CORE Frontend i18n & Multi-Domain Configuration v1

This document describes the internationalization (i18n) system and multi-domain configuration implemented for ZORA CORE's frontend.

## Overview

ZORA CORE supports multiple languages and domains to serve different markets. The initial implementation supports:
- **Languages**: English (en) and Danish (da)
- **Domains**: .com (international) and .dk (Denmark)

## Architecture

The i18n system is a lightweight custom implementation without external dependencies, consisting of:

1. **I18nProvider** - React context provider for translations
2. **useI18n hook** - Hook for accessing translations
3. **Locale files** - JSON translation files
4. **Domain config** - Domain-to-locale mapping

## I18nProvider

Located at `frontend/src/lib/I18nProvider.tsx`.

### Usage

Wrap your app with the I18nProvider (already done in `frontend/src/app/layout.tsx`):

```tsx
import { I18nProvider } from '@/lib/I18nProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
```

### useI18n Hook

Access translations in any component:

```tsx
import { useI18n } from '@/lib/I18nProvider';

function MyComponent() {
  const { t, locale, setLocale, availableLocales } = useI18n();
  
  return (
    <div>
      <h1>{t('desk.title', 'Welcome')}</h1>
      <p>{t('desk.subtitle', 'Your climate command center')}</p>
      
      {/* Language switcher */}
      <select value={locale} onChange={(e) => setLocale(e.target.value)}>
        {availableLocales.map(loc => (
          <option key={loc} value={loc}>{loc.toUpperCase()}</option>
        ))}
      </select>
    </div>
  );
}
```

### Translation Function

The `t()` function accepts:
- `key`: Dot-notation path to the translation (e.g., 'desk.title')
- `fallback`: Default value if translation is not found

```tsx
t('climate.title', 'Climate OS')  // Returns translation or 'Climate OS'
```

## Locale Files

Translation files are located in `frontend/src/locales/{locale}/common.json`.

### File Structure

```
frontend/src/locales/
├── en/
│   └── common.json    # English translations
└── da/
    └── common.json    # Danish translations
```

### Translation File Format

```json
{
  "desk": {
    "title": "ZORA Desk",
    "subtitle": "Your climate-first command center"
  },
  "climate": {
    "title": "Climate OS",
    "subtitle": "Track your climate impact"
  },
  "auth": {
    "signIn": "Sign in",
    "signUp": "Sign up"
  }
}
```

### Adding New Translations

1. Add the key to both `en/common.json` and `da/common.json`
2. Use the key in your component with `t('key.path', 'fallback')`

Example:
```json
// en/common.json
{
  "newFeature": {
    "title": "New Feature",
    "description": "This is a new feature"
  }
}

// da/common.json
{
  "newFeature": {
    "title": "Ny Funktion",
    "description": "Dette er en ny funktion"
  }
}
```

## Multi-Domain Configuration

Located at `frontend/src/lib/domainConfig.ts`.

### Domain-to-Locale Mapping

```typescript
export const domainConfig: Record<string, DomainConfig> = {
  'zoracore.dk': {
    defaultLocale: 'da',
    availableLocales: ['da', 'en'],
    region: 'DK',
    currency: 'DKK',
  },
  'zoracore.com': {
    defaultLocale: 'en',
    availableLocales: ['en', 'da'],
    region: 'INT',
    currency: 'EUR',
  },
  'localhost': {
    defaultLocale: 'en',
    availableLocales: ['en', 'da'],
    region: 'DEV',
    currency: 'EUR',
  },
};
```

### Using Domain Config

```typescript
import { getDomainConfig, getDefaultLocale } from '@/lib/domainConfig';

// Get full config for current domain
const config = getDomainConfig();

// Get just the default locale
const locale = getDefaultLocale();
```

### DomainConfig Interface

```typescript
interface DomainConfig {
  defaultLocale: string;      // Default language for this domain
  availableLocales: string[]; // Languages available on this domain
  region: string;             // Region code (DK, INT, DEV)
  currency: string;           // Default currency
}
```

## Locale Persistence

The user's locale preference is stored in localStorage under the key `zora-locale`. When the user changes their language, it persists across sessions.

### Priority Order

1. User's saved preference (localStorage)
2. Domain's default locale
3. Fallback to 'en'

## Language Switcher Component

A language switcher is available in the AppShell sidebar. Users can toggle between available languages.

### Implementation

```tsx
import { useI18n } from '@/lib/I18nProvider';

function LanguageSwitcher() {
  const { locale, setLocale, availableLocales } = useI18n();
  
  return (
    <div className="flex gap-1">
      {availableLocales.map(loc => (
        <button
          key={loc}
          onClick={() => setLocale(loc)}
          className={locale === loc ? 'active' : ''}
        >
          {loc.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
```

## Translation Keys by Module

### Common Keys

| Key | Description |
|-----|-------------|
| `common.loading` | Loading state |
| `common.error` | Error state |
| `common.save` | Save button |
| `common.cancel` | Cancel button |
| `common.optional` | Optional field indicator |

### Desk/Dashboard Keys

| Key | Description |
|-----|-------------|
| `desk.title` | Dashboard title |
| `desk.subtitle` | Dashboard subtitle |
| `desk.getStarted` | Get started section |

### Auth Keys

| Key | Description |
|-----|-------------|
| `auth.signIn` | Sign in button |
| `auth.signUp` | Sign up button |
| `auth.email` | Email label |
| `auth.password` | Password label |
| `auth.loginSuccess` | Login success message |

### Module Keys

| Key | Description |
|-----|-------------|
| `climate.title` | Climate OS title |
| `goesGreen.title` | GOES GREEN title |
| `shop.title` | ZORA SHOP title |
| `foundation.title` | Foundation title |
| `academy.title` | Academy title |
| `agents.title` | Agents title |

## Best Practices

1. **Always provide fallbacks**: Use meaningful fallback text in case translations are missing
2. **Use dot notation**: Organize keys hierarchically (e.g., `module.section.key`)
3. **Keep translations in sync**: When adding a key to one locale, add it to all locales
4. **Use semantic keys**: Keys should describe the content, not the location
5. **Avoid interpolation in v1**: For now, use simple string replacements

## Future Enhancements

Planned improvements for future versions:

1. **String interpolation**: Support for `{variable}` placeholders
2. **Pluralization**: Support for plural forms
3. **Date/number formatting**: Locale-aware formatting
4. **RTL support**: Right-to-left language support
5. **Additional languages**: German, Swedish, Norwegian, etc.
6. **Translation management**: Admin UI for managing translations

## File Structure

```
frontend/src/
├── lib/
│   ├── I18nProvider.tsx    # Context provider and hook
│   └── domainConfig.ts     # Domain configuration
├── locales/
│   ├── en/
│   │   └── common.json     # English translations
│   └── da/
│       └── common.json     # Danish translations
└── app/
    └── layout.tsx          # I18nProvider wrapper
```
