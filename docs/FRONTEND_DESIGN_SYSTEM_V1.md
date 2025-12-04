# ZORA CORE Frontend Design System v1

This document describes the Nordic-inspired design system implemented for ZORA CORE's frontend, providing a cohesive visual language across all pages and components.

## Overview

The ZORA Design System v1 establishes a premium, deliberate, and cohesive visual identity inspired by Nordic design principles. It includes design tokens (CSS variables), reusable Z-components, and consistent patterns for building UI.

## Design Tokens

All design tokens are defined as CSS variables in `frontend/src/app/globals.css` under the `:root` selector.

### Color Palette

The color system uses semantic naming with accent colors for different modules:

**Primary Colors (Emerald - Climate/Brand)**
- `--z-emerald`: #10b981 (primary accent)
- `--z-emerald-soft`: rgba(16, 185, 129, 0.1) (backgrounds)
- `--z-emerald-border`: rgba(16, 185, 129, 0.2) (borders)

**Secondary Colors**
- `--z-rose`: #f43f5e (Foundation, alerts)
- `--z-amber`: #f59e0b (Academy, warnings)
- `--z-violet`: #8b5cf6 (Agents, premium)
- `--z-sky`: #0ea5e9 (Simulation, info)

Each color has `-soft` and `-border` variants for backgrounds and borders.

**Agent Colors**
- `--z-agent-connor`: #10b981 (Climate/Strategy)
- `--z-agent-lumina`: #f59e0b (Creative/Brand)
- `--z-agent-eivor`: #8b5cf6 (Memory/Knowledge)
- `--z-agent-oracle`: #0ea5e9 (Analytics/Insights)
- `--z-agent-aegis`: #f43f5e (Safety/Compliance)
- `--z-agent-sam`: #6366f1 (Frontend/Experience)

### Text Colors

- `--z-text-primary`: Primary text (high contrast)
- `--z-text-secondary`: Secondary text (medium contrast)
- `--z-text-tertiary`: Tertiary text (lower contrast)
- `--z-text-muted`: Muted text (lowest contrast)

### Background Colors

- `--z-bg-deep`: Deepest background layer
- `--z-bg-base`: Base background
- `--z-bg-surface`: Surface/card background
- `--z-bg-elevated`: Elevated surface background

### Border Colors

- `--z-border-subtle`: Subtle borders
- `--z-border-default`: Default borders
- `--z-border-strong`: Strong/emphasized borders

### Spacing Scale

- `--z-space-xs`: 0.25rem (4px)
- `--z-space-sm`: 0.5rem (8px)
- `--z-space-md`: 1rem (16px)
- `--z-space-lg`: 1.5rem (24px)
- `--z-space-xl`: 2rem (32px)
- `--z-space-2xl`: 3rem (48px)

### Border Radius

- `--z-radius-sm`: 0.375rem (6px)
- `--z-radius-md`: 0.5rem (8px)
- `--z-radius-lg`: 0.75rem (12px)
- `--z-radius-xl`: 1rem (16px)
- `--z-radius-full`: 9999px (pill)

### Shadows

- `--z-shadow-sm`: Subtle shadow
- `--z-shadow-md`: Medium shadow
- `--z-shadow-lg`: Large shadow
- `--z-shadow-glow-emerald`: Emerald glow effect

### Transitions

- `--z-transition-fast`: 150ms ease
- `--z-transition-base`: 200ms ease
- `--z-transition-slow`: 300ms ease

## Z-Components

Reusable components are located in `frontend/src/components/z/` and exported from `frontend/src/components/z/index.ts`.

### ZCard

A card component with Nordic styling variants.

```tsx
import { ZCard } from '@/components/z';

<ZCard 
  variant="default" | "elevated" | "subtle" | "bordered" | "glass"
  padding="none" | "sm" | "md" | "lg"
  accent="emerald" | "rose" | "amber" | "violet" | "sky"
  className="..."
>
  {children}
</ZCard>
```

### ZButton

A button component with Nordic palette.

```tsx
import { ZButton } from '@/components/z';

<ZButton
  variant="primary" | "secondary" | "outline" | "ghost" | "danger" | "success"
  size="sm" | "md" | "lg"
  fullWidth={boolean}
  href="/path" // optional, renders as Link
  onClick={handler}
>
  Button Text
</ZButton>
```

### ZTag

A semantic tag/badge component.

```tsx
import { ZTag } from '@/components/z';

<ZTag
  variant="default" | "emerald" | "rose" | "amber" | "violet" | "sky" | "success" | "warning" | "danger"
  size="sm" | "md"
>
  Tag Text
</ZTag>
```

### ZMetricTile

A KPI/metric display component.

```tsx
import { ZMetricTile } from '@/components/z';

<ZMetricTile
  label="Metric Label"
  value="123"
  sublabel="Optional sublabel"
  variant="default" | "emerald" | "rose" | "amber" | "violet" | "sky"
  trend="up" | "down" | "neutral"
  icon={<IconComponent />}
  size="sm" | "md" | "lg"
/>
```

### ZSectionHeader

A section header with optional action button.

```tsx
import { ZSectionHeader } from '@/components/z';

<ZSectionHeader
  title="Section Title"
  subtitle="Optional subtitle"
  action={<ZButton>Action</ZButton>}
/>
```

## Usage Patterns

### Dashboard Cards

Each dashboard card follows this pattern:
1. Use `ZCard` with appropriate accent color
2. Icon in colored soft background
3. Title and subtitle with text tokens
4. Metrics using `ZMetricTile` or custom layouts
5. Action button using `ZButton`

Example:
```tsx
<ZCard variant="default" padding="md" accent="emerald">
  <div className="flex items-start gap-4 mb-4">
    <div className="w-12 h-12 rounded-[var(--z-radius-lg)] flex items-center justify-center bg-[var(--z-emerald-soft)]">
      <span className="text-[var(--z-emerald)]"><Icon /></span>
    </div>
    <div>
      <h3 className="text-lg font-semibold text-[var(--z-text-primary)]">Title</h3>
      <p className="text-sm text-[var(--z-text-tertiary)]">Subtitle</p>
    </div>
  </div>
  {/* Content */}
  <ZButton href="/path" variant="primary" size="sm" fullWidth>
    Action
  </ZButton>
</ZCard>
```

### Form Inputs

Form inputs use consistent styling:
```tsx
<input
  className="w-full px-3 py-2.5 bg-[var(--z-bg-base)] border border-[var(--z-border-default)] rounded-[var(--z-radius-md)] text-[var(--z-text-primary)] placeholder-[var(--z-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--z-emerald)] focus:border-transparent transition-all"
/>
```

### Error States

Error messages use rose color tokens:
```tsx
<div className="rounded-[var(--z-radius-md)] bg-[var(--z-rose-soft)] border border-[var(--z-rose-border)] p-4">
  <p className="text-sm text-[var(--z-rose)]">{error}</p>
</div>
```

## Module Color Mapping

Each ZORA module has an assigned accent color:

| Module | Color | Token |
|--------|-------|-------|
| Climate OS | Emerald | `--z-emerald` |
| GOES GREEN | Emerald | `--z-emerald` |
| ZORA SHOP | Violet | `--z-violet` |
| Foundation | Rose | `--z-rose` |
| Academy | Amber | `--z-amber` |
| Agents | Violet | `--z-violet` |
| Simulation | Sky | `--z-sky` |

## Dark Mode Support

The design system is built for dark mode first. Light mode support can be added by defining alternate values in a `@media (prefers-color-scheme: light)` block or using a class-based toggle.

## Best Practices

1. Always use CSS variables instead of hardcoded colors
2. Use Z-components for consistency
3. Follow the established card pattern for new dashboard cards
4. Use semantic color variants (emerald for success, rose for danger, amber for warning)
5. Maintain consistent spacing using the spacing scale
6. Use transitions for interactive elements

## File Structure

```
frontend/src/
├── app/
│   └── globals.css          # Design tokens
├── components/
│   └── z/
│       ├── index.ts         # Exports
│       ├── ZCard.tsx        # Card component
│       ├── ZButton.tsx      # Button component
│       ├── ZTag.tsx         # Tag component
│       ├── ZMetricTile.tsx  # Metric display
│       └── ZSectionHeader.tsx # Section header
└── ...
```
